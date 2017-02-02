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
	this.outTimeout = null;
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

		// add main overlay event listener
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

	this.socket.on('disconnect', function() {
		self.banner.showBanner('Connection lost, please wait - attempting to reestablish.', true);
		self.video.savedTimer = self.video.getTime();

		console.log('saved timer was', self.video.savedTimer);
		
		self.video.pause();
		self.video.canStartStream = false;
		self.connectionLost = true;

		self.showOutput('The stream will resume momentarily.<br />Please stand by.');
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
		self.video.canStartStream = false;
		self.video.play(data.timer);
		$(self.overlay).hide();
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
		console.log('STREAMSYNC', 'received streamsync command', data, 'currentTime was', self.video.getTime());

		self.video.canStartStream = false;

		var isNewClient = false;
		if (!self.video.alertShown) {
			self.video.alertShown = true;
			isNewClient = true;
		}

		if (Math.abs(parseInt(data.playback.timer) - parseInt(self.video.getTime())) > 10 && !data.playback.isPaused) {
			if (data.playback.timer == 1) {
				self.banner.showBanner('Resetting stream, please wait...');
			} else if (parseInt(data.playback.timer) - parseInt(self.video.getTime()) <= 0) {
				self.banner.showBanner('Rewinding stream, please wait...');
			} else {
				self.banner.showBanner('Video stream lag detected. Syncing your stream...');
			}
		}

		self.video.setTime(data.playback.timer);

		// safari bug fix - currentTime will not take
		// effect until a second afterthe page has loaded
		if (!self.video.getTime()) {
			setTimeout(function() {
				self.video.setTime(data.playback.timer + 1);
			}, 1000);
		}

		if (data.playback.isPaused) {
			self.video.pause();

			if (!data.playback.isStarted) {
				if(self.video.sourceFileError) {
					console.log('FATAL', 'Detected source file error, preventing stream from starting.');
					return;
				}

				self.showOutput('The stream has not yet started. <span class="text-hl-name">Click to start it.</span>');
				
				self.video.canStartStream = true;
				return;
			}

			if (isNewClient) {
				self.showOutput('Welcome, The stream has been paused.');
			} else {
				self.showOutput('The stream has been paused.');
			}

			return;
		}

		self.hideOutput();

		// handle video end
		if (self.video.getDuration() && data.playback.timer > self.video.getDuration()) {
			self.chat.sendText(self.socket, 'system', '/stream stop');
			
			if (isNewClient) {
				self.showOutput('Welcome, the stream has already ended.');
			} else {
				self.showOutput('The stream has ended.');
			}

			return;
		}

		if(isNewClient) {
			if (data.playback.startedBy) {
				self.showOutput('Welcome, the stream has already been started by <span class="text-hl-name">' + data.playback.startedBy + '</span>.', Cons.DEFAULT_OVERLAY_TIMEOUT);
			} else {
				self.showOutput('Welcome, the stream has already been started.', Cons.DEFAULT_OVERLAY_TIMEOUT);
			}
		}

		self.video.play();
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