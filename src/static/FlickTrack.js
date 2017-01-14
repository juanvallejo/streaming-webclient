(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Client-side banner for displaying warnings, alerts, and errors
 */

var Cons = require('./constants.js');

function Banner(banner) {
	if (!banner) {
		throw "ERR CLIENT BANNER: banner is undefined.";
	}

	var self = this;

	this.banner = banner;
	this.timeout = null;

	// displays a banner in the top of the screen for DEFAULT_BANNER_TIMEOUT
	this.showBanner = function(text, persist) {
		clearTimeout(this.timeout);

		this.banner.innerHTML = text;
		$(this.banner.parentElement).slideDown();
		this.banner.parentElement.style.display = 'table';

		if (persist) {
			return;
		}

		this.timeout = setTimeout(function() {
			$(self.banner.parentElement).slideUp();
		}, Cons.DEFAULT_BANNER_TIMEOUT);
	};

	this.banner.addEventListener('click', function() {
		clearTimeout(self.timeout);
		$(self.banner.parentElement).slideUp();
	});
};

module.exports = Banner;
},{"./constants.js":3}],2:[function(require,module,exports){
/**
 * Chat handler
 */

var Emitter = require('./proto/emitter.js');

function Chat(container, viewElem, inputElem, usernameInputElem, overlayElem) {
	var self = this;

	this.container = container;
	this.view = viewElem;
	this.input = inputElem;
	this.focused = false;
	this.hidden = false;
	this.width = container.clientWidth;
	this.height = container.clientHeight;
	this.timeout = null;
	this.chatHideDelay = 1000;
	this.hasMouseOver = false;
	this.isRegistered = false;
	this.user = 'Anonymous';
	this.overlay = overlayElem;
	this.usernameInput = usernameInputElem;

	this.getView = function() {
		return this.view;
	};
	this.getInput = function() {
		return this.input;
	};
	this.getContainer = function() {
		return this.container;
	};

	this.getUsername = function() {
		return this.user;
	};

	this.getWidth = function() {
		return this.width;
	};
	this.getHeight = function() {
		return this.height;
	};

	this.clearInput = function() {
		this.input.value = '';
	};

	this.focusInput = function() {
		this.input.focus();
		this.isFocused(true);
	};

	this.register = function(username) {
		this.isRegistered = true;
		this.user = username;
	};

	// clears all messages from the chat's view
	this.clearView = function() {
		this.view.innerHTML = '';
	};

	this.show = function(noAnimation) {
		this.hidden = false;
		if (noAnimation) {
			this.container.style.display = 'block';
			return;
		}
		$(this.container).fadeIn();
		if (!this.hasMouseOver && !this.isFocused()) {
			clearTimeout(this.timeout);
			this.timeout = setTimeout(function() {
				self.hide();
			}, this.chatHideDelay);
		}
	};

	this.hide = function(noAnimation) {
		this.hidden = true;
		if (noAnimation) {
			this.container.style.display = 'none';
			return;
		}
		$(this.container).fadeOut();
	};

	this.hideOverlay = function() {
		this.overlay.style.display = 'none';
	};

	this.isHidden = function() {
		return this.hidden;
	};
	this.isFocused = function(focused) {
		if (focused !== undefined) {
			this.focused = focused;
			return this.focused;
		}
		return this.focused;
	};

	this.videoURLToEmbeddable = function(link) {
		var videoId = link;
		if (link.match(/watch\?v\=/gi)) {
			videoId = link.split("watch?v=")[1];
		} else {
			videoId = link.split('/');
			videoId = videoId[videoId.length - 1];
		}
		return ('https://www.youtube.com/embed/' + videoId);
	};

	this.addMessage = function(data) {
		var message = document.createElement('span');
		message.id = 'chat-container-view-message';
		message.innerHTML = (!data.system ? ('<span id="chat-container-view-message-user" class="text-hl-name">' + data.user + ': ') : '') + '</span><span id="chat-container-view-message-text">' + data.message + '</span>';

		if (data.images && data.images.length) {
			var noun = 'image';
			if (data.images.length > 1) {
				noun += 's';
			}

			var images = [];
			var imagesLoaded = 0;
			message.innerHTML += '<span class="block full-size images-loading-text">[loading ' + noun + '...]</span>';
			for (var i = 0; i < data.images.length; i++) {
				images[i] = new Image();
				images[i].src = data.images[i];
				images[i].addEventListener('load', function(image, message) {
					return function() {
						checkImagesLoaded(message);
						var imageSpan = document.createElement('span');
						imageSpan.className = 'full-size text-center block chat-container-view-message-image';
						imageSpan.appendChild(image);
						message.appendChild(imageSpan);

						if (images.length > 1) {
							self.view.scrollTop += imageSpan.clientHeight;
							return;
						}

						$(self.view).animate({
							scrollTop: self.view.scrollTop + imageSpan.clientHeight * 2
						}, 500);
					};
				}(images[i], message));
				images[i].addEventListener('error', function(image, message) {
					return function() {
						checkImagesLoaded(message);
						message.innerHTML += '<span class="block full-size">An error ocurred loading image with url "' + image.src + '"</span>';
					};
				}(images[i], message));
			}

			function checkImagesLoaded(message) {
				imagesLoaded++;
				if (imagesLoaded >= images.length) {
					var imagesLoadingText = message.getElementsByClassName('images-loading-text');
					if (imagesLoadingText && imagesLoadingText.item(0)) {
						message.removeChild(imagesLoadingText.item(0));
					}
				}
			};

		}

		if (data.videos && data.videos.length) {
			for (var i = 0; i < data.videos.length; i++) {
				var video = document.createElement('iframe');
				video.className = 'full-size text-center block chat-container-view-message-image';
				video.frameborder = "0";
				video.allowfullscreen = true;
				video.src = self.videoURLToEmbeddable(data.videos[i]);
				message.appendChild(video);
			}
		}

		this.view.appendChild(message);

		if ((data.images && data.images.length > 1)) {
			this.view.scrollTop = this.view.scrollHeight * 2;
			return;
		}
		$(this.view).animate({
			scrollTop: this.view.scrollHeight
		}, 500);
	};

	this.sendText = function(socket, sender, text) {
		this.clearInput();
		socket.send('request_chatmessage', {
			user: sender,
			message: text,
			location: window.location
		});
	};

	this.handleMouseOver = function(x, y) {
		this.hasMouseOver = true;
		clearTimeout(this.timeout);

		if (!this.isHidden()) {
			return;
		}

		this.show();
	};

	this.handleMouseOut = function() {
		this.hasMouseOver = false;
		clearTimeout(this.timeout);
		if (this.isFocused()) {
			clearTimeout(this.timeout);
			return;
		}

		this.timeout = setTimeout(function() {
			if (self.isFocused()) {
				return;
			}
			self.hide();
		}, this.chatHideDelay);
	};

	// TODO sendText requires a socket: implement in the main package
	this.handleKeypress = function(keyCode) {
		switch (keyCode) {
			case 13:
				if (!this.input.value) {
					break;
				}
				self.emit('submit', [(localStorage.username || chat.getUsername()), self.input.value]);
				break;
		}
	};

	this.input.addEventListener('focus', function() {
		self.isFocused(true);
	});
	this.input.addEventListener('blur', function() {
		if (!self.hasMouseOver) {
			self.handleMouseOut();
		}
		self.isFocused(false);
	});

	this.input.addEventListener('keypress', function(e) {
		self.handleKeypress(e.keyCode);
	});

	this.usernameInput.addEventListener('keydown', function(e) {
		if (e.keyCode == 13) {
			if (!self.usernameInput.value.match(/^[a-z0-9\_]+$/gi)) {
				self.emit('info', ['Usernames may only contain letters, numbers, and underscores.']);
				return;
			}

			self.emit('username_submit', [self.usernameInput.value]);
		}
	});
};

Chat.prototype = new Emitter();

module.exports = Chat;
},{"./proto/emitter.js":5}],3:[function(require,module,exports){
/**
 * application constants
 */

var Constants = {
	DEFAULT_BANNER_TIMEOUT: 4500,
	DEFAULT_OVERLAY_TIMEOUT: 5000,
	ERR_CODE_VID_NOTFOUND: 4
};

module.exports = Constants;
},{}],4:[function(require,module,exports){
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

	this.socket.on('disconnect', function() {
		self.banner.showBanner('Connection lost, please wait - attempting to reestablish.', true);
		self.video.savedTimer = self.video.getVideo().currentTime;
		console.log('saved timer was', self.video.savedTimer);
		self.video.pause();
		self.video.canStartStream = false;
		self.connectionLost = true;

		$(overlay).fadeIn();
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
},{"./banner.js":1,"./chat.js":2,"./constants.js":3,"./socket.js":6,"./video.js":7}],5:[function(require,module,exports){
/**
 * Emitter prototype for objects that send and receive events
 */

function Emitter() {
	this.callbacks = {};

	this.on = function(e, fn) {
		if (!this.callbacks[e]) {
			this.callbacks[e] = [];
		}
		this.callbacks[e].push(fn);
	};

	this.emit = function(e, params) {
		if (!this.callbacks[e]) {
			return;
		}

		var fns = this.callbacks[e]
		for (var i = 0; i < fns.length; i++) {
			fns[i].apply(this, params || []);
		}
	};
}

module.exports = Emitter;
},{}],6:[function(require,module,exports){
/**
 * application socket utils, emitters, and listeners
 */

var Emitter = require('./proto/emitter.js');

function Socket(url) {
	var self = this;

	this.socket = io.connect(url || window.location.origin);

	// stores a SocketEvent with a evtName key
	// returns the pushed SocketEvent
	this.on = function(evtName, fn, params) {
		if (!this.callbacks[evtName]) {
			this.callbacks[evtName] = [];

			// subscribe to the netSocket event
			this.socket.on(evtName, (function(e) {
				return function() {
					self.emit(e, arguments);
				}
			})(evtName));
		}
		return this.callbacks[evtName].push(fn);
	};

	// emits a socket message -> differs from this#emit
	// in that this method sends a network socket event
	this.send = function(netEvtName, data) {
		this.socket.emit(netEvtName, data);
	};
};

Socket.prototype = new Emitter();

module.exports = Socket;
},{"./proto/emitter.js":5}],7:[function(require,module,exports){
/**
 * handles local video streaming
 */

var Cons = require('./constants.js');
var Emitter = require('./proto/emitter.js');

function Video(videoElement) {
	var self = this;

	this.video = videoElement;
	this.savedTimer = null;
	this.sourceFileError = null;
	this.alertShown = false;
	this.canStartStream = false;

	this.on = function(e, fn) {
		if (!this.callbacks[e]) {
			this.callbacks[e] = [];

			this.video.addEventListener(e, (function(e) {
				return function(args) {
					self.emit(e, arguments);
				}
			})(e));
		}
		this.callbacks[e].push(fn);
	};

	this.init = function(location, videoElement) {
		this.video.src = streamURLFromLocation(location.pathname);
	};

	this.appendTo = function(parent) {
		parent.appendChild(this.video);
	};

	this.play = function() {
		this.video.play();
	};

	this.pause = function() {
		this.video.pause();
	};

	this.handlePlaybackStatus = function(status, socket, outputHandler) {
		if (status.isPaused) {
			this.video.pause();
		}

		if (!status.isStarted) {
			if (this.sourceFileError) {
				console.log('Detected source file error, preventing stream from being started.');
				return;
			}
			outputHandler('The stream has not yet started. <span class="text-hl-name">Click to start it.</span>');
			this.canStartStream = true;
			return;
		}

		this.video.currentTime = status.timer;
		this.video.play();

		if (this.alertShown) {
			return;
		}

		this.alertShown = true;

		if (status.startedBy) {
			outputHandler('Welcome, the stream has already been started by ' + status.startedBy + '.', Cons.DEFAULT_OVERLAY_TIMEOUT);
		} else {
			outputHandler('Welcome, the stream has already been started.', Cons.DEFAULT_OVERLAY_TIMEOUT);
		}

		socket.send('request_streamsync');
	};

	this.beginStream = function(socket) {
		socket.send('request_beginstream', {
			timer: self.savedTimer
		});
	};

	this.getVideo = function() {
		return this.video;
	};
};

Video.prototype = new Emitter();

function streamURLFromLocation(location) {
	return location.replace(/^\/v\//gi, '/s/');
}

module.exports = Video;
},{"./constants.js":3,"./proto/emitter.js":5}]},{},[4]);
