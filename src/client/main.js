/**
 * Main entry point for the client app
 */

var Banner = require('./banner.js');
var Chat = require('./chat.js');
var Cons = require('./constants.js');
var VideoPlayer = require('./video.js');
var Socket = require('./socket.js');

function App() {
	var self = this;

	this.localStorage = window.localStorage;

	this.overlay = document.getElementById("overlay");
	this.out = document.getElementById("out");
	this.ytvideo = document.getElementById('yt-video');

	this.chat = new Chat(document.getElementById('chat-container'),
		document.getElementById('chat-container-view'),
		document.getElementById('chat-container-input').children[0],
		document.getElementById('chat-container-username-input'),
		document.getElementById('chat-container-overlay'));

	this.video = new VideoPlayer(document.createElement('video'));
	this.socket = new Socket(window.location.origin);
	this.banner = new Banner(document.getElementById("banner"));

	// set application states
	this.initVideo = false;
	this.connectionLost = false;

	// initialize the client application
	// and its sub-components
	this.init = function() {
		this.chat.hide(true);

		// if username already stored, set as current username
		if (this.localStorage.username) {
			this.socket.send('request_updateusername', {
				user: localStorage.username
			});
		}

		// add elem event listeners
		this.out.addEventListener('click', function() {
			if (self.video.canStartStream) {
				self.video.beginStream(self.socket);
			}
		});

		// init video object
		this.video.init(window.location);
		this.video.appendTo(document.body);

		this.video.on('error', function(err) {
			if (err.target.error.code == Cons.ERR_CODE_VID_NOTFOUND) {
				self.out.innerHTML = 'The video file <span class="text-hl-name">' + (window.location.pathname.replace(/\/v\//gi, '')) + '</span> could not be found.';
			} else {
				self.out.innerHTML = 'Unexpectd error occurred while receiving video data.';
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
		});

		this.chat.on('info', function(text, persist) {
			self.banner.showBanner(text, persist);
		});

		this.socket.on('info', function(text, persist) {
			self.banner.showBanner(text, persist);
		});
	};

	this.showOutput = function(text, timeout) {
		this.overlay.style.display = 'table';
		this.out.innerHTML = text;

		if (!timeout) {
			return;
		}

		setTimeout(function() {
			$(self.overlay).fadeOut();
		}, timeout);
	};

	// register socket events
	this.socket.on('connect', function() {
		if (self.video.savedTimer) {
			self.socket.send('request_beginstream', {
				timer: self.video.savedTimer
			});
		}
		if (self.connectionLost) {
			self.connectionLost = false;
			self.banner.showBanner('Connection reestablished. Resuming stream.');

			if (self.localStorage.username) {
				self.socket.send('request_updateusername', {
					user: self.localStorage.username
				});
			}
		}
	});

	this.socket.on('playbackstatus', function(data) {
		self.video.handlePlaybackStatus(data.playback, self.socket, self.showOutput);
	});

	this.socket.on('updateusername', function(data) {
		self.localStorage.username = data.user;
		self.chat.register(data.user);
		if (!self.chat.isHidden()) {
			self.chat.focusInput();
		}
		self.chat.hideOverlay();
	});

	this.socket.on('info_updateusername', function(data) {
		if (data.user == self.localStorage.username || data.oldUser == self.localStorage.username) {
			return self.banner.showBanner('<span class="text-hl-name">You</span> are now known as ' + data.user);
		}
		self.banner.showBanner('<span class="text-hl-name">' + (data.oldUser || 'Anonymous (' + (data.id || 'unknown id') + ')') + '</span> is now known as ' + data.user);
	});

	this.socket.on('beginstream', function(data) {
		self.video.getVideo().currentTime = data.timer;
		self.video.play();
		$(self.overlay).hide();
		self.video.canStartStream = false;
	});

	this.socket.on('chatmethodaction', function(data) {
		if (typeof self.chat[data.method] != 'function') {
			self.banner.showBanner('Warning: The server has requested an invalid action (' + data.method + ') to be performed.');
			console.log('Warning: The server requested an invalid action (' + data.method + ') from the chat handler. Possible incompatible version of the server being used.');
			return;
		}

		self.chat[data.method].apply(self.chat, data.args);
	});

	this.socket.on('chatmessage', function(data) {
		if (self.chat.isRegistered) {
			self.chat.show();
		}
		self.chat.addMessage(data);
	});

	this.socket.on('streamsync', function(data) {
		console.log('received streamsync command', data, 'currentTime was', self.video.getVideo().currentTime);
		if (Math.abs(parseInt(data.timer) - parseInt(self.video.getVideo().currentTime)) > 10 && !data.stop) {
			self.banner.showBanner('Video stream lag detected. Syncing your stream.');
		}

		if (data.stop) {
			self.video.pause();
			self.video.canStartStream = true;
		} else {
			self.video.play();
		}

		self.video.getVideo().currentTime = data.timer;

		// safari bug fix - currentTime will not take
		// effect until a second afterthe page has loaded
		if (!self.video.getVideo().currentTime) {
			setTimeout(function() {
				self.video.getVideo().currentTime = (data.timer + 1);
			}, 1000);
		}
	});

	this.socket.on('info_clienterror', function(data) {
		self.banner.showBanner(data.error);
	});

	this.socket.on('info_clientjoined', function(data) {
		self.banner.showBanner('client <span class="text-hl-name">' + data.id + '</span> has joined the stream.');
	});

	this.socket.on('info_clientleft', function(data) {
		self.banner.showBanner('client <span class="text-hl-name">' + (data.user || data.id) + '</span> has left the stream.');
	});

	this.socket.on('system_ping', function() {
		self.socket.send('system_ping')
	});

	this.socket.on('info_subtitles', function(data) {
		if (data.on && data.path) {
			// addSubtitles(data.path);
			return;
		}
		// removeSubtitles();
	});

	this.socket.on('disconnect', function() {
		self.banner.showBanner('Connection lost, please wait - attempting to reestablish.', true);
		savedTimer = self.video.getVideo().currentTime;
		self.video.pause();
		self.video.canStartStream = false;
		self.connectionLost = true;

		$(overlay).fadeIn();
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

// make entry point visible to the rest of the document
window.App = App;