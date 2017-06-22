/**
 * Main entry point for the client app
 */

var Banner = require('./banner.js');
var Chat = require('./chat.js');
var Cons = require('./constants.js');
var VideoPlayer = require('./video.js');
var Socket = require('./socket.js');

// attempts to build a socket connection url using
// hostname constants. Defaults to window.location.hostname
function getSocketAddr(window) {
	return (Cons.DEFAULT_SOCKET_PROTO + '://' + window.location.hostname + ':' + window.location.port + Cons.DEFAULT_SOCKET_PATH) || window.location.origin;
}

function App(window, document) {
	var self = this;

	this.localStorage = window.localStorage;

	this.overlay = document.getElementById("overlay");
	this.out = document.getElementById("out");
	this.outTimeout = null;

	this.chat = new Chat(document.getElementById('chat-container'),
		document.getElementById('chat-container-view'),
		document.getElementById('chat-container-input').children[0],
		document.getElementById('chat-container-username-input'),
		document.getElementById('chat-container-overlay'));

	this.socket = new Socket(getSocketAddr(window));
	this.video = new VideoPlayer(document.createElement('video'), document.createElement('track'));
	this.banner = new Banner(document.getElementById("banner"));

	// set application states
	this.initVideo = false;
	this.connectionLost = false;

	// initialize the client application
	// and its sub-components
	this.init = function() {
		this.chat.hide(true);

		this.out.innerHTML = "Welcome.<br />Load a video with <span class='text-hl-name'>/stream load &lt;url&gt;</span>"
		this.out.innerHTML += "<br />Type <span class='text-hl-name'>/help</span> for available options."

		// add main overlay event listener
		this.out.addEventListener('click', function() {
			if (self.video.canStartStream) {
				self.video.beginStream(self.socket, self.chat.getUsername());
			}
		});

		// init video object
		this.video.init(window.location);
		this.video.appendTo(document.body);

		this.video.on('error', function(err) {
			if (err.target.error.code == Cons.ERR_CODE_VID_NOTFOUND) {
				self.out.innerHTML = 'The video file <span class="text-hl-name">' + self.video.getVideo().src.split(Cons.STREAM_URL_PREFIX)[1] + '</span> could not be loaded.';
			} else {
				self.out.innerHTML = 'Unexpected error occurred while receiving video data.<br />';
				self.out.innerHTML += err.target.error
			}

			self.video.sourceFileError = true;
			self.video.canStartStream = false;
		});

		// handle chat events
		this.chat.on('submit', function(user, msg) {
			this.sendText(self.socket, user, msg);
			this.focusInput();
		});

		this.chat.on('username_submit', function(username) {
			self.socket.send('request_updateusername', {
				user: username
			});
			self.chat.usernameInput.value = '';
            this.lockOverlay("loading, please wait...");
		});

		this.chat.on('info', function(text, persist) {
			self.banner.showBanner(text, persist);
		});

		this.socket.on('info', function(text, persist) {
			self.banner.showBanner(text, persist);
		});
	};

	this.getVideo = function() {
		return this.video;
	};

	this.showOutput = function(text, timeout) {
		clearTimeout(this.outTimeout);

		this.overlay.style.display = 'table';
		this.out.innerHTML = text;

		if (!timeout) {
			return;
		}

		this.outTimeout = setTimeout(function() {
			self.hideOutput();
		}, timeout);
	};

	this.hideOutput = function() {
		$(self.overlay).fadeOut();
	};

	// register socket events
	this.socket.on('connect', function() {
        // if username already stored, set as current username
        if (self.localStorage.username) {
            // setTimeout(function() {
			// 	self.chat.emit("username_submit", [self.localStorage.username]);
			// }, 3000);
        }

		if (self.video.savedTimer) {
			// TODO: it would be ideal to have the clickable overlay
			// at the begining of a stopped stream resume using this
			// timer, not have the server auto-play once connection
			// is re-established after a connection lost.
			// self.socket.send('request_beginstream', {
			// 	timer: self.video.savedTimer
			// });
		}
		if (self.connectionLost) {
			self.connectionLost = false;
			self.banner.showBanner('Connection reestablished. Resuming stream.');
		}
	});

	this.socket.on('disconnect', function() {
		self.banner.showBanner('Connection lost, please wait - attempting to reestablish.', true);
		self.video.savedTimer = self.video.getTime();

		self.video.pause();
		self.video.canStartStream = false;
		self.connectionLost = true;

		self.showOutput('The stream will resume momentarily.<br />Please stand by.');
	});

	this.socket.on('updateusername', function(data) {
		data = parseSockData(data);
		self.localStorage.username = data.user;
		self.chat.register(data.user);
		if (!self.chat.isHidden()) {
			self.chat.focusInput();
		}
		self.chat.hideOverlay();
		self.chat.unlockOverlay();

		self.banner.showBanner("Your username has been updated to \"" + data.user + "\"")
	});

	this.socket.on('info_updateusername', function(data) {
		data = parseSockData(data);
		if (data.user == self.localStorage.username || (data.extra && data.extra.oldUser == self.localStorage.username)) {
			return self.banner.showBanner('<span class="text-hl-name">You</span> are now known as ' + data.user);
		}
		if(data.extra && data.extra.isNewUser) {
			return self.banner.showBanner('<span class="text-hl-name">' + data.user + '</span> has joined the chat.');
		}
		self.banner.showBanner('<span class="text-hl-name">' + ((data.extra && data.extra.oldUser) || 'Anonymous (' + (data.id || 'unknown id') + ')') + '</span> is now known as ' + data.user);
	});

	this.socket.on('chatmethodaction', function(data) {
		data = parseSockData(data);
		if (!data.extra) {
			return;
		}
		if (typeof self.chat[data.extra.methodname] !== 'function') {
			self.banner.showBanner('Warning: The server has requested an invalid action (' + data.extra.methodname + ') to be performed.');
			console.log('Warning: The server requested an invalid action (' + data.extra.methodname + ') from the chat handler. Possible incompatible version of the server being used.');
			return;
		}

		self.chat[data.extra.methodname].apply(self.chat, data.extra.args || []);
	});

	this.socket.on('chatmessage', function(data) {
		data = parseSockData(data);
		self.chat.unlockOverlay()
		if (self.chat.isRegistered) {
			self.chat.show();
		}
		self.chat.addMessage(data);
	});

	this.socket.on("streamload", function(data) {
		self.showOutput("Loading stream, please wait...");

		data = parseSockData(data);
		self.video.load(data);

		if (data.extra.kind != Cons.STREAM_KIND_YOUTUBE
			&& data.extra.kind != Cons.STREAM_KIND_LOCAL) {
			self.showOutput("Server asked to load invalid stream type", '"' + data.extra.kind + '"')
			return
		}

		self.socket.send("request_streamsync");
	});

	this.socket.on('streamsync', function(data) {
		data = parseSockData(data);
		// console.log('STREAMSYNC', 'received streamsync command', data, 'currentTime was', self.video.getTime());

		self.video.canStartStream = false;

		var isNewClient = false;
		if (!self.video.alertShown) {
			self.video.alertShown = true;
			isNewClient = true;
		}

		if (Math.abs(parseInt(data.extra.timer) - parseInt(self.video.getTime())) > 10 && !data.extra.isPaused) {
			if (data.extra.timer <= 1) {
				self.banner.showBanner('Resetting stream, please wait...');
			} else if (parseInt(data.extra.timer) - parseInt(self.video.getTime()) <= 0) {
				self.banner.showBanner('Seeking stream, please wait...');
			}
		}

		// only update video time if "lag" time > 1 second
		if (!self.video.getTime() || (self.video.getTime() && Math.abs(self.video.getTime() - data.extra.timer) > 0.5)) {
			self.video.setTime(data.extra.timer);
        }

		// safari bug fix - currentTime will not take
		// effect until a second afterthe page has loaded
		if (!self.video.getTime() && self.video.videoStreamKind === Cons.STREAM_KIND_LOCAL) {
			setTimeout(function() {
				self.video.setTime(data.extra.timer + 1);
			}, 1500);
		}

		if (!data.extra.isPlaying) {
			self.video.pause();

			if (data.extra.isStopped) {
				if(self.video.sourceFileError) {
					console.log('FATAL', 'Detected source file error, preventing stream from starting.');
					return;
				}

				self.showOutput('The stream has not yet started. <span class="text-hl-name">Click to start it.</span>');
				self.video.canStartStream = true;
				return;
			}

            self.video.canStartStream = true;

			if (isNewClient) {
				self.showOutput('Welcome, The stream has been paused.');
			} else {
				self.showOutput('The stream has been paused. <span class="text-hl-name">Click to resume it.</span>');
			}

			return;
		}

		self.hideOutput();

		// handle video end
		if (self.video.getDuration() && data.extra.timer >= self.video.getDuration()) {
			if (isNewClient) {
				self.showOutput('Welcome, the stream has already ended.');
			} else {
				self.showOutput('The stream has ended.');
			}

			return;
		}

		if(isNewClient) {
			if (data.extra.startedBy) {
				self.showOutput('Welcome, the stream has already been started by <span class="text-hl-name">' + data.extra.startedBy + '</span>.', Cons.DEFAULT_OVERLAY_TIMEOUT);
			} else {
				self.showOutput('Welcome, the stream has already been started.', Cons.DEFAULT_OVERLAY_TIMEOUT);
			}
		}

		self.video.play();
	});

	this.socket.on('info_clienterror', function(data) {
		data = parseSockData(data);
		self.chat.unlockOverlay();
		self.banner.showBanner(data.error);
	});

	this.socket.on('info_clientjoined', function(data) {
		data = parseSockData(data);
		self.banner.showBanner('client <span class="text-hl-name">' + data.id + '</span> has joined the stream.');
	});

	this.socket.on('info_clientleft', function(data) {
		data = parseSockData(data);
		self.banner.showBanner('client <span class="text-hl-name">' + (data.user || data.id) + '</span> has left the stream.');
	});

	this.socket.on('system_ping', function() {
		self.socket.send('system_ping')
	});

	this.socket.on('info_subtitles', function(data) {
		data = parseSockData(data);
		if (data.extra.on && data.extra.path) {
			self.video.addSubtitles(data.extra.path, function(err) {
				if(err) {
					self.banner.showBanner(err);
					return;
				}
				self.banner.showBanner('Successfully added subtitles track.');
			});

			return;
		}
		self.video.removeSubtitles();
		self.banner.showBanner('Subtitles off.');
	});

	this.video.on('subtitlesloaded', function() {
		self.banner.showBanner('The subtitle track has loaded. Subtitles enabled.');
	});

	this.video.on('emitsocketdata', function(sockEvt, data) {
		self.socket.send(sockEvt, data);
	});

	// add window event listeners
	window.addEventListener('mousemove', function(e) {
		var appWidth = window.innerWidth;
		var chatWidth = self.chat.getWidth();
		var chatHeight = self.chat.getHeight();

		if (e.clientX >= appWidth - chatWidth && e.clientY <= chatHeight) {
			self.chat.handleMouseOver(e.clientX, e.clientY);
			return;
		}

		self.chat.handleMouseOut();
	});

	window.addEventListener("message", function(e) {
		try {
			var data = JSON.parse(e.data);
			if (data.event === "infoDelivery" && data.info) {
				self.video.ytVideoCurrentTime = data.info.currentTime;
			}
		} catch (err) {
			console.log("ERR IFRAME-MESSAGE unable to parse event data as json:", err);
		}
	});

	window.addEventListener('keydown', function(e) {
		if ((e.keyCode == 70 || e.keyCode == 220) && !self.chat.isFocused() && self.chat.usernameInput !== document.activeElement) {
			if (self.video.getVideo().requestFullscreen) {
				self.video.getVideo().requestFullscreen();
				return;
			}
			if (self.video.getVideo().webkitRequestFullScreen) {
				self.video.getVideo().webkitRequestFullScreen();
				return;
			}
			if (self.video.getVideo().mozRequestFullScreen) {
				self.video.getVideo().mozRequestFullScreen();
				return;
			}
			if (self.video.getVideo().msRequestFullscreen) {
				self.video.getVideo().msRequestFullscreen();
				return;
			}
		}
	});
}

function parseSockData(b64) {
	if (typeof b64 !== "string") {
		return b64;
	}

	var str = atob(b64);
	return JSON.parse(str);
}

window.App = App;