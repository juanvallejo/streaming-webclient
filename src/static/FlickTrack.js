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

	this.viewElemDefaultOpacity = 0.8;

	this.container = container;
	this.view = viewElem;
	this.input = inputElem;
	this.focused = false;
	this.hidden = false;
	this.width = container.clientWidth;
	this.height = container.clientHeight;
	this.timeout = null;
	this.chatHideDelay = 2000;
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

	this.increaseVolume = function(val) {
		this.emit("streamcontrol", ["increaseVolume", [val]]);
	};

	this.decreaseVolume = function(val) {
        this.emit("streamcontrol", ["decreaseVolume", [val]]);
	};

	this.setVolume = function(val) {
        this.emit("streamcontrol", ["setVolume", [val]]);
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
		this.view.style.opacity = this.viewElemDefaultOpacity;
		this.overlay.style.display = 'none';
	};

	this.lockOverlay = function(message) {
		this.usernameInput.value = message;
		this.usernameInput.disabled = true;
	};

	this.unlockOverlay = function() {
		this.usernameInput.value = '';
		this.usernameInput.removeAttribute("disabled");
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

	this.reloadClient = function() {
		window.location.reload();
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
						
						image.style.cursor = 'pointer';
						image.addEventListener('click', function() {
							console.log('fuck', image.src);
							window.open(image.src, '_blank');
						});

						var imageSpan = document.createElement('span');
						imageSpan.className = 'full-size text-center block chat-container-view-message-image';
						imageSpan.appendChild(image);
						message.appendChild(imageSpan);

						image.style.width = "100%";

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
			message: text
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
				self.emit('submit', [(localStorage.username || self.getUsername()), self.input.value]);
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
},{"./proto/emitter.js":6}],3:[function(require,module,exports){
/**
 * application constants
 */

var Constants = {
	DEFAULT_BANNER_TIMEOUT: 4500,
	DEFAULT_OVERLAY_TIMEOUT: 5000,
	ERR_CODE_VID_NOTFOUND: 4,
	DEFAULT_SOCKET_PROTO: 'ws',
	DEFAULT_SOCKET_PATH: '/ws',
	DEFAULT_SOCKET_HOST: 'localhost',
	DEFAULT_SOCKET_PORT: 8000,

	STREAM_URL_PREFIX: '/s/',

	STREAM_KIND_YOUTUBE: 'youtube',
	STREAM_KIND_LOCAL: 'movie',
	STREAM_KIND_TWITCH: 'twitch'
};

module.exports = Constants;
},{}],4:[function(require,module,exports){
/**
 * Chat handler
 */

var Emitter = require('./proto/emitter.js');

var CONTROLS_SEARCH = 0;
var CONTROLS_PREV = 1;
var CONTROLS_PLAYPAUSE = 2;
var CONTROLS_NEXT = 3;

var CONTROLS_PLAYPAUSE_PLAY = 0;
var CONTROLS_PLAYPAUSE_PAUSE = 1;

var INFO_TIME_ELAPSED = 0;
var INFO_TITLE = 1;
var INFO_TIME_TOTAL = 2;

var VOLUME_ICON = 0;
var VOLUME_SLIDER = 1;

var MAX_CONTROLS_HIDE_TIMEOUT = 2500;

function Controls(container, controlsElemCollection, infoElemCollection, volumeElemCollection, seekElem, searchPanel, searchBarElem) {
    var self = this;

    this.container = container;
    this.searchPanel = searchPanel;
    this.searchBar = searchBarElem;
    this.searchButton = controlsElemCollection.item(CONTROLS_SEARCH);

    this.volumeSlider = volumeElemCollection.item(VOLUME_SLIDER);

    this.controlSeek = seekElem;
    this.controlNext = controlsElemCollection.item(CONTROLS_NEXT);
    this.controlPrev = controlsElemCollection.item(CONTROLS_PREV);
    this.controlPlayPause = controlsElemCollection.item(CONTROLS_PLAYPAUSE);

    this.infoTimeElapsed = infoElemCollection.item(INFO_TIME_ELAPSED);
    this.infoTimeTotal = infoElemCollection.item(INFO_TIME_TOTAL);
    this.infoTitle = infoElemCollection.item(INFO_TITLE);

    this.classNameControlActive = 'controls-container-active';

    this.controlsHideTimeout = null;
    this.hidden = false;
    this.hasMouseOver = false;

    this.isPlaying = false;
    this.playbackTimer = 0;
    this.playbackTotal = 0;
    this.volume = 50;

    this.volumeSliderActive = false;
    this.volumeSliderDelta = 0;

    this.callbacks = {};

    this.getSearchPanel = function() {
        return this.searchPanel;
    };
    this.getSearchBar = function() {
        return this.searchBar;
    };
    this.getContainer = function() {
        return this.container;
    };

    this.init = function() {
        var pauseButton = $(this.controlPlayPause).children()[CONTROLS_PLAYPAUSE_PAUSE];
        $(pauseButton).hide();
    };

    this.getWidth = function() {
        return this.width;
    };
    this.getHeight = function() {
        return this.height;
    };

    this.focusInput = function() {
        this.input.focus();
        this.isFocused(true);
    };

    this.show = function(noAnimation) {
        if(!this.hidden) {
            return;
        }

        this.hidden = false;
        if (noAnimation) {
            this.container.style.display = 'block';
            return;
        }
        $(this.container).fadeIn();
    };

    this.hide = function(noAnimation) {
        if(this.hidden || this.hasMouseOver) {
            return;
        }

        this.hidden = true;
        if (noAnimation) {
            this.container.style.display = 'none';
            return;
        }
        $(this.container).fadeOut();
    };

    this.setVolume = function(vol) {
        self.volume = vol;
        self.volumeSlider.style.height = vol + "%";
    };

    this.pause = function() {
        self.isPlaying= false;
        var playButton = $(self.controlPlayPause).children()[CONTROLS_PLAYPAUSE_PLAY];
        var pauseButton = $(self.controlPlayPause).children()[CONTROLS_PLAYPAUSE_PAUSE];

        $(playButton).show();
        $(pauseButton).hide();

        clearTimeout(self.seekerTimeout);
        clearTimeout(self.controlsHideTimeout);

        self.show();
    };

    this.play = function() {
        self.isPlaying = true;
        var playButton = $(self.controlPlayPause).children()[CONTROLS_PLAYPAUSE_PLAY];
        var pauseButton = $(self.controlPlayPause).children()[CONTROLS_PLAYPAUSE_PAUSE];

        $(pauseButton).show();
        $(playButton).hide();

        // advance seeker
        clearTimeout(self.seekerTimeout);
        self.seekerTimeout = setTimeout(function timer() {
            self.playbackTimer++;
            self.setSeeker(self.playbackTimer, self.playbackTotal)
            self.infoTimeElapsed.innerHTML = secondsToHumanTime(self.playbackTimer);

            if (self.playbackTotal && self.playbackTimer > self.playbackTotal) {
                self.pause();
                return;
            }

            self.seekerTimeout = setTimeout(timer, 1000)
        }, 1000);

        // auto-hide user controls
        if (!self.hasMouseOver) {
            clearTimeout(self.controlsHideTimeout);
            self.controlsHideTimeout = setTimeout(function () {
                self.hide();
            }, MAX_CONTROLS_HIDE_TIMEOUT);
        }
    };
    
    this.setMediaTitle = function(title) {
        this.infoTitle.innerHTML = title;
    };
    
    this.setMediaDuration = function(duration) {
        if(!duration) {
            this.infoTimeTotal.innerHTML = "--:--";
            return;
        }
        this.infoTimeTotal.innerHTML = secondsToHumanTime(duration);
    };

    this.setMediaElapsed = function(elapsedTimeSecs) {
        var humanTime = secondsToHumanTime(elapsedTimeSecs);
        this.infoTimeElapsed.innerHTML = humanTime;
    };

    this.setSeeker = function(current, total) {
        if(!current) {
            current = 1;
        }

        var percent = current / (total || current) * 100;
        if (percent > 100) {
            percent = 100;
        }

        this.controlSeek.style.width = percent + "%";
        this.playbackTimer = current;
        this.playbackTotal = total || 0;
    };

    this.handleSearchButton = function(button, isActive) {
        if (isActive) {
            $(button).removeClass(self.classNameControlActive);
        } else {
            $(button).addClass(self.classNameControlActive);
        }

        $(self.searchPanel).slideToggle(function() {
            if (!isActive) {
                $(self.searchBar).children().focus();
            }
        });
    };

    this.handlePlayPause = function(button, isActive) {
        var playButton = $(button).children()[CONTROLS_PLAYPAUSE_PLAY];
        var pauseButton = $(button).children()[CONTROLS_PLAYPAUSE_PAUSE];

        if (isActive) {
            $(pauseButton).show();
            $(playButton).hide();
        } else {
            $(playButton).show();
            $(pauseButton).hide();
        }

        if (isActive) {
            self.emit("chatcommand", ["/stream pause"]);
            return;
        }

        self.emit("chatcommand", ["/stream play"]);
    };

    this.handleNextButton = function(button) {
        self.emit("chatcommand", ["/stream skip"]);
    };

    this.handlePrevButton = function(button) {
        self.emit("chatcommand", ["/stream seek 0"]);
    };

    $(this.searchButton).on('click', function() {
        var isActive = $(this).hasClass(self.classNameControlActive);
        self.handleSearchButton(this, isActive);
    });

    $(this.controlPlayPause).on('click', function() {
        self.handlePlayPause(this, self.isPlaying);
    });

    $(this.controlNext).on('click', function() {
        self.handleNextButton(this);
    });

    $(this.controlNext).on('click', function() {
        self.handlePrevButton(this);
    });

    $(this.volumeSlider.parentNode).on("mousedown", function() {
        self.volumeSliderActive = true;
    });

    $(this.container).on("mouseenter", function() {
        self.hasMouseOver = true;
    });

    $(this.container).on("mouseleave", function() {
        self.hasMouseOver = false;
    });

    $(window).on("mouseup", function() {
       self.volumeSliderActive = false;
       self.volumeSliderDelta = 0;
    });

    // TODO: show percentage while mouse is down
    $(window).on("mousemove", function(e) {
        if(self.isPlaying) {
            self.show();

            if(!self.hasMouseOver) {
                clearTimeout(self.controlsHideTimeout);
                self.controlsHideTimeout = setTimeout(function () {
                    self.hide();
                }, MAX_CONTROLS_HIDE_TIMEOUT);
            }
        }

        if (!self.volumeSliderActive) {
            return;
        }

        if (!self.volumeSliderDelta) {
            self.volumeSliderDelta = e.pageY;
            return;
        }

        var delta = self.volumeSliderDelta - e.pageY;
        self.volumeSliderDelta = e.pageY;
        if (!delta) {
            return;
        }

        // slide up
        if (delta > 0) {
            self.emit("streamcontrol", ["increaseVolume", [delta]]);
            return;
        }

        // slide down
        self.emit("streamcontrol", ["decreaseVolume", [delta * -1]]);
    });
}

function secondsToHumanTime(secs) {
    if (secs < 60) {
        if (secs < 10) {
            secs = "0" + secs;
        }
        return "00:" + secs;
    }

    var mins = parseInt(secs / 60);
    if (mins < 60) {
        if (mins < 10) {
            mins = "0" + mins;
        }
        secs = parseInt(secs % 60);
        if (secs < 10) {
            secs = "0" + secs;
        }
        return mins + ":" + secs;
    }

    var hours = parseInt(mins / 60);
    if (hours < 10) {
        hours = "0" + hours;
    }
    mins = parseInt(mins % 60);
    if (mins < 10) {
        mins = "0" + mins;
    }
    secs = parseInt(secs % 60);
    if (secs < 10) {
        secs = "0" + secs;
    }
    return hours + ":" + mins + ":" + secs;
}

Controls.prototype = new Emitter();

module.exports = Controls;
},{"./proto/emitter.js":6}],5:[function(require,module,exports){
/**
 * Main entry point for the client app
 */

var Banner = require('./banner.js');
var Chat = require('./chat.js');
var Cons = require('./constants.js');
var VideoPlayer = require('./video.js');
var Socket = require('./socket.js');
var Controls = require('./controls.js');

// attempts to build a socket connection url using
// hostname constants. Defaults to window.location.hostname
function getSocketAddr(window) {
    return (Cons.DEFAULT_SOCKET_PROTO + '://' + window.location.host + Cons.DEFAULT_SOCKET_PATH + window.location.pathname);
}

function App(window, document) {
    var self = this;

    this.localStorage = window.localStorage;

    this.overlay = document.getElementById("overlay");
    this.out = document.getElementById("out");
    this.outTimeout = null;
    
    this.chat = new Chat(
        document.getElementById('chat-container'),
        document.getElementById('chat-container-view'),
        document.getElementById('chat-container-input').children[0],
        document.getElementById('chat-container-username-input'),
        document.getElementById('chat-container-overlay')
    );

    this.socket = new Socket(getSocketAddr(window));
    this.video = new VideoPlayer(
        document.createElement('video'), 
        document.createElement('track')
    );
    this.banner = new Banner(document.getElementById("banner"));

    this.controls = new Controls(
        document.getElementById("controls-container"), 
        document.getElementsByClassName("controls-container-button"),
        document.getElementsByClassName("controls-container-info-inner"),
        document.getElementsByClassName("controls-container-volume-elem"),
        document.getElementById("controls-container-seek"),
        document.getElementById("controls-container-panel"),
        document.getElementById("controls-container-panel-searchbar")
    );

    // set application states
    this.initVideo = false;
    this.connectionLost = false;

    // initialize the client application
    // and its sub-components
    this.init = function() {
        this.chat.hide(true);

        if (window.WebSocket === undefined) {
            this.out.innerHTML = "<span class='text-hl-name'>FlickTrack</span> is incompatible with your browser.<br />"
            this.out.innerHTML += "Try a different browser, such as <span class='text-hl-name'>Chrome</span> or <span class='text-hl-name'>FireFox</span>."
            return;
        }

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

        this.video.on('volumeupdate', function(vol) {
            self.controls.setVolume(vol);
        });

        // init user controls
        this.controls.init();
        this.controls.setVolume(this.video.getVolume())
        this.controls.on("chatcommand", function(cmd) {
            self.chat.sendText(self.socket, "system", cmd);
        });

        this.controls.on("streamcontrol", function(method, args) {
            if(!self.video[method]) {
                self.banner.showBanner("chat command attempted to control stream with an invalid operation (" + method + ").");
                return;
            }

            self.video[method].apply(self, args);
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

        this.chat.on('streamcontrol', function(method, args) {
            if (!self.video[method]) {
                self.banner.showBanner("chat command attempted to control stream with an invalid operation (" + method + ").");
                return;
            }

            self.video[method].apply(self, args);
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

    this.socket.on('error', function(err) {
        self.banner.showBanner("websocket error: " + err.toString(), true);
    });

    // register socket events
    this.socket.on('connect', function() {
        // if username already stored, set as current username
        if (self.localStorage.username) {
            setTimeout(function() {
            	self.chat.emit("username_submit", [self.localStorage.username]);
            }, 1000);
        }

        if (self.video.savedTimer) {
            // TODO: it would be ideal to have the clickable overlay
            // at the begining of a stopped stream resume using this
            // timer, not have the server auto-play once connection
            // is re-established after a connection lost.
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
        self.controls.pause();
        self.video.canStartStream = false;
        self.connectionLost = true;

        // TODO: add reconnection logic
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
        if (data.user === self.localStorage.username || (data.extra && data.extra.oldUser === self.localStorage.username)) {
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

        if (data.extra.kind !== Cons.STREAM_KIND_YOUTUBE
            && data.extra.kind !== Cons.STREAM_KIND_LOCAL) {
            self.showOutput("Server asked to load invalid stream type", '"' + data.extra.kind + '"')
            return
        }

        self.socket.send("request_streamsync");
    });

    this.socket.on('streamsync', function(data) {
        data = parseSockData(data);

        // TODO: server-side information parsing about stream
        self.controls.setMediaTitle("No stream data available");

        if (data.extra.kind === Cons.STREAM_KIND_YOUTUBE) {
            if (data.extra.streamDuration) {
                self.getVideo().ytVideoInfo.duration = data.extra.streamDuration;
            }
        }

        self.controls.setMediaDuration(data.extra.streamDuration);
        self.controls.setMediaElapsed(data.extra.timer);
        self.controls.setSeeker(data.extra.timer, data.extra.streamDuration);

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
            self.controls.pause();

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

        // detect video end
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
        self.controls.play();
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
},{"./banner.js":1,"./chat.js":2,"./constants.js":3,"./controls.js":4,"./socket.js":7,"./video.js":8}],6:[function(require,module,exports){
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

		var fns = this.callbacks[e];
		for (var i = 0; i < fns.length; i++) {
			fns[i].apply(this, params || []);
		}
	};
}

module.exports = Emitter;
},{}],7:[function(require,module,exports){
/**
 * application socket utils, emitters, and listeners
 */

var Emitter = require('./proto/emitter.js');

function Socket(url) {
    var self = this;

    if (window.WebSocket === undefined) {
        return;
    }

    this.subscriptions = {};
    this.socket = new WebSocket(url || window.location.origin.replace(/^http\:/, "ws:") + "/ws" + window.location.pathname);

    // stores a SocketEvent with a evtName key
    // returns the pushed SocketEvent
    this.on = function(evtName, fn, params) {
        if (!self.callbacks[evtName]) {
            self.callbacks[evtName] = [];

            // subscribe to the netSocket event
            self.subscribe(evtName, (function(e) {
                return function() {
                    self.emit(e, arguments);
                }
            })(evtName));
        }
        return self.callbacks[evtName].push(fn);
    };

    this.subscribe = function(evtName, callback) {
        if (!self.subscriptions[evtName]) {
            self.subscriptions[evtName] = [];
        }

        self.subscriptions[evtName].push(callback);
    };

    this.socket.addEventListener("open", function() {
        self.emit("connect", []);
    });

    this.socket.addEventListener("close", function() {
        self.emit("disconnect", []);
    });

    this.socket.addEventListener("message", function(e) {
        try {
            var data = JSON.parse(e.data);
            if (!data.event) {
                self.emit("info", ["server sent malformed response: \"event\" field missing.", false]);
                return;
            }

            if (!self.subscriptions[data.event]) {
                self.emit("info", ["server sent unknown event: " + '"' + data.event + '"', false]);
                return;
            }

            for (var i = 0; i < self.subscriptions[data.event].length; i++) {
                self.subscriptions[data.event][i].apply(self.socket, [data.data.response]);
            }
        } catch(e) {
            self.emit("info", ["error parsing socket response from server: " + e.toString(), false]);
        }
    });

    this.socket.addEventListener("error", function(e) {
        self.emit("error", [e]);
    });

    // emits a socket message -> differs from this#emit
    // in that this method sends a network socket event
    this.send = function(netEvtName, data) {
        self.socket.send(JSON.stringify({
            "event": netEvtName,
            "data": data
        }));
    };

    this.getSocket = function() {
        return this.socket;
    };
}

Socket.prototype = new Emitter();

module.exports = Socket;
},{"./proto/emitter.js":6}],8:[function(require,module,exports){
/**
 * handles local video streaming
 */

var Cons = require('./constants.js');
var Emitter = require('./proto/emitter.js');

function Video(videoElement, sTrackElement) {
    var self = this;

    this.videoStreamKind = Cons.STREAM_KIND_LOCAL;

    this.loadedData = null;
    this.video = videoElement;
    this.videoVolume = window.localStorage.volume ? parseFloat(window.localStorage.volume) : 0.5;
    this.duration = null;
    this.savedTimer = null;
    this.sourceFileError = null;
    this.alertShown = false;
    this.canStartStream = false;
    this.metadataLoaded = false;
    this.subtitlesTrack = sTrackElement;
    this.subtitlesTrackActivated = false;

    this.ytVideoInfo = {};
    this.ytVideoCurrentTime = 0;
    this.ytElem = null;
    this.ytReadyCallbacks = [];
    this.ytPlayerReady = false;


    // ignores the actual HTMLEntity when adding
    // an event listener to this wrapper object.
    this.EVT_IGNORE_ELEM = true;

    // handlers
    this.defaultSubtitlesHandler = function(path, handler) {
        if (self.loadedData.kind !== Cons.STREAM_KIND_LOCAL) {
            handler('This type of stream does not support adding subtitles.');
            return false;
        }

        if (!handler || typeof handler !== 'function') {
            handler = function () {};
        }

        if (!this.metadataLoaded) {
            handler('Video metadata has not yet loaded, try again later.');
            return false;
        }

        this.subtitlesTrack.src = path;
        this.subtitlesTrack.mode = "showing";
        this.video.textTracks[0].mode = "showing";
        this.subtitlesTrackActivated = true;

    };

    this.subtitlesHandler = this.defaultSubtitlesHandler;

    this.on = function(e, fn, ignore_elem) {
        if (!this.callbacks[e]) {
            this.callbacks[e] = [];

            if(!ignore_elem) {
                this.video.addEventListener(e, (function(e) {
                    return function(args) {
                        self.emit(e, arguments);
                    }
                })(e));
            }
        }
        this.callbacks[e].push(fn);
    };

    this.hidePlayer = function() {
        this.video.style.display = 'none';
    };

    this.showPlayer = function() {
        this.video.style.display = 'block';
    };

    this.hideYtPlayer = function() {
        self.onYtPlayerReady(function() {
            self.ytElem.style.display = 'none';
        });
    };

    this.showYtPlayer = function() {
        self.onYtPlayerReady(function() {
            self.ytElem.style.display = 'block';
        });
    };

    // note: uses youtube iframe-api context.
    // called once when youtube player is ready.
    this.callYtPlayerCallbacks = function(evt) {
        self.ytPlayerReady = true;
        while(self.ytReadyCallbacks.length) {
            self.ytReadyCallbacks.shift().call(self, self.ytPlayer.getIframe());
        }
    };

    // "safe" wrapper for making youtube iframe api calls.
    // Adds passed function to a callback stack that is parsed
    // once the youtube player has loaded. If the player has already
    // loaded, the function is then immediately called.
    this.onYtPlayerReady = function(callback) {
        if (this.ytPlayerReady) {
            callback.call(self, self.ytPlayer.getIframe());
            return;
        }

        this.ytReadyCallbacks.push(callback);
    };

    this.onYtPlayerStateChange = function(evt) {

    };

    this.loadYtVideo = function(videoId) {
        self.onYtPlayerReady(function(frame) {
            frame.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': 'loadVideoById',
                'args': [videoId, 0, 'large']
            }), "*");
        });
    };

    this.seekYtVideo = function(time) {
        self.onYtPlayerReady(function(frame) {
            frame.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': 'seekTo',
                'args': [time, "true"]
            }), "*");
        });
    };

    this.setYtVideoVolume = function(vol) {
        self.onYtPlayerReady(function(frame) {
            frame.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': 'setVolume',
                'args': [vol]
            }), "*");
        });
    };

    this.playYtVideo = function() {
        self.onYtPlayerReady(function(frame) {
            frame.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': 'playVideo',
                'args': []
            }), "*");
        });
    };

    this.pauseYtVideo = function() {
        self.onYtPlayerReady(function(frame) {
            frame.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': 'pauseVideo',
                'args': []
            }), "*");
        });
    };

    this.initYtPlayer = function(YT, ytElem) {
        this.ytPlayer = new YT.Player(ytElem, {
            width: '100%',
            height: '100%',
            events: {
                'onReady': self.callYtPlayerCallbacks,
                'onStateChange': self.onYtPlayerStateChange
            },
            playerVars: {
                // 'origin': 'localhost',
                'autoplay': 0,
                'controls': 0,
                'rel' : 0,
                'cc_load_policy': 1,
                'disablekb': 0,
                'enablejsapi': 1,
                'fs': 0,
                'iv_load_policy': 3,
                'showinfo': 0,
                'modestbranding': 1
            }
        });
        this.ytElem = this.ytPlayer.getIframe();
        self.ytElem.style.display = 'none';
    };

    this.init = function(location, videoElement) {
        this.video.style.display = 'none';
        this.video.crossorigin = "anonymous";

        this.subtitlesTrack.kind = "captions";
        this.subtitlesTrack.label = "English";
        this.subtitlesTrack.srclang = "en";

        this.video.appendChild(this.subtitlesTrack);

        this.subtitlesTrack.addEventListener('load', function() {
            this.mode = "showing";
            self.video.textTracks[0].mode = "showing";
            self.emit('subtitlesloaded');
        });
    };

    // multi-source safe. Only handles local video streams.
    this.appendTo = function(parent) {
        parent.appendChild(this.video);
    };

    this.load = function(data) {
        self.pause();
        self.loadedData = data.extra;
        self.videoStreamKind = data.extra.kind;
        self.pause();
        if (data.extra.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.hidePlayer();
            self.showYtPlayer();
            self.loadYtVideo(youtubeVideoIdFromUrl(data.extra.url));
            self.pause();

            var volMod = 1;
            if (self.videoVolume < 1) {
                volMod = 100;
            }

            self.setYtVideoVolume(self.videoVolume * volMod);
            return;
        }

        self.pause();
        self.hideYtPlayer();
        self.showPlayer();

        self.video.src = Cons.STREAM_URL_PREFIX + data.extra.url;
        self.video.volume = self.videoVolume;
    };

    this.play = function(time) {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to play video with no data loaded.');
            return;
        }

        if (self.loadedData.kind === Cons.STREAM_KIND_YOUTUBE) {
            this.playYtVideo();
            return;
        }

        if (time) {
            this.video.currentTime = time;
        }
        if (this.video.muted) {
            console.log('WARN:', 'playing muted video...');
        }
        try {
            this.video.play();
        } catch(e) {
            console.log('EXCEPT VIDEO PLAY', e);
        }
    };

    this.pause = function() {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to pause video with no data loaded.');
            return;
        }

        if (self.loadedData.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.pauseYtVideo();
            return;
        }

        try {
            self.video.pause();
        } catch(e) {
            console.log('EXCEPT VIDEO PAUSE', e);
        }
    };

    this.setTime = function(time) {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to pause video with no data loaded.');
            return;
        }

        if (self.loadedData.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.seekYtVideo(time);
        }

        this.video.currentTime = time;
    };

    this.getTime = function() {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to get video info with no data loaded.');
            return;
        }

        if (self.loadedData.kind === Cons.STREAM_KIND_YOUTUBE) {
            return self.ytVideoCurrentTime;
        }

        return this.video.currentTime;
    };

    this.beginStream = function(socket, user) {
        socket.send('request_chatmessage', {
            user: user,
            message: "/stream play"
        });
    };

    this.addSubtitles = function(path, callback) {
        return this.subtitlesHandler(path, callback);
    };

    this.removeSubtitles = function() {
        this.subtitlesTrack.mode = "hidden";
        this.video.textTracks[0].mode = "hidden";
    };

    this.getVideo = function() {
        return this.video;
    };

    this.getVolume = function() {
        if(self.videoVolume <= 1) {
            return self.videoVolume * 100;
        }
        return self.videoVolume;
    };

    this.increaseVolume = function(val) {
        var volMod = 1;
        if (val >= 1) {
            val /= 100;
            volMod = 100;
        }

        if (val === self.videoVolume) {
            return;
        }

        self.videoVolume += val;
        if (self.videoVolume > 1) {
            self.videoVolume = 1;
        }

        window.localStorage.volume = self.videoVolume;
        self.emit("volumeupdate", [self.videoVolume * volMod]);

        if (!self.loadedData) {
            console.log("WARN:", 'attempt to set volume with no data loaded.');
            return;
        }

        if (self.loadedData.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.setYtVideoVolume(self.videoVolume * volMod);
            return;
        }

        self.video.volume = self.videoVolume;
    };

    this.decreaseVolume = function(val) {
        var volMod = 1;
        if (val >= 1) {
            val /= 100;
            volMod = 100;
        }

        if (val === self.videoVolume) {
            return;
        }
        
        self.videoVolume -= val;
        if (self.videoVolume < 0) {
            self.videoVolume = 0;
        }

        window.localStorage.volume = self.videoVolume;
        self.emit("volumeupdate", [self.videoVolume * volMod]);

        if (!self.loadedData) {
            console.log("WARN:", 'attempt to set volume with no data loaded.');
            return;
        }

        if (self.loadedData.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.setYtVideoVolume(self.videoVolume * volMod);
            return;
        }



        self.video.volume = self.videoVolume;
    };

    this.setVolume = function(val) {
        if (val > 100) {
            val = 100;
        }

        var volMod = 1;
        if (val > 1) {
            val /= 100;
            volMod = 100;
        }

        self.videoVolume = val;
        window.localStorage.volume = self.videoVolume;

        self.emit("volumeupdate", [self.videoVolume * volMod]);

        if (!self.loadedData) {
            console.log("WARN:", 'attempt to set volume with no data loaded.');
            return;
        }

        if (self.loadedData.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.setYtVideoVolume(self.videoVolume * volMod);
            return;
        }

        self.video.volume = self.videoVolume;
    };

    this.getDuration = function() {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to get video duration with no data loaded.');
            return;
        }

        if (self.loadedData.kind === Cons.STREAM_KIND_YOUTUBE) {
            return this.ytVideoInfo ? this.ytVideoInfo.duration : 0;
        }

        return this.duration;
    };

    // add event listeners
    this.on('loadedmetadata', function() {
        self.duration = self.video.duration;
        self.metadataLoaded = true;
    });
}

Video.prototype = new Emitter();

function youtubeVideoIdFromUrl(url) {
    if (url.match(/http(s)?\:\/\/youtu\.be/gi)) {
        var segs = url.split("/");
        return segs[segs.length - 1];
    }

    var segs = url.split("watch?v=");
    if (!segs.length || segs.length < 2) {
        return segs.length ? segs[0] : url;
    }
    return url.split("watch?v=")[1].split("&")[0]
}

function ytDurationToSeconds(ytDuration) {
    if (!ytDuration) {
        return 0;
    }

    var match = ytDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)

    var hours = (parseInt(match[1]) || 0);
    var minutes = (parseInt(match[2]) || 0);
    var seconds = (parseInt(match[3]) || 0);

    return hours * 3600 + minutes * 60 + seconds;
}

module.exports = Video;

},{"./constants.js":3,"./proto/emitter.js":6}]},{},[5]);
