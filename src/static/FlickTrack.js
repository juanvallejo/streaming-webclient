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

var Result = require('./result.js');
var Cons = require('./constants.js');

var Emitter = require('./proto/emitter.js');

var MAX_SEARCH_CACHE_RESULTS = 10;
var MAX_MEDIA_TITLE_LENGTH = 39;

var SHOW_SEARCH_ALT_CONTROLS = 0;
var SHOW_ITEM_ALT_CONTROLS = 1;

var SHOW_QUEUE = 1;
var SHOW_STACK = 2;

var CONTROLS_SEARCH = 0;
var CONTROLS_PREV = 1;
var CONTROLS_PLAYPAUSE = 2;
var CONTROLS_NEXT = 3;

var ALT_CONTROLS_EXIT = 0;
var ALT_CONTROLS_QUEUE_MOVEUP = 1;

var CONTROLS_PLAYPAUSE_PLAY = 0;
var CONTROLS_PLAYPAUSE_PAUSE = 1;

var INFO_TIME_ELAPSED = 0;
var INFO_TITLE = 1;
var INFO_TIME_TOTAL = 2;

var SEARCH_PANEL_QUEUE_TOGGLE = 0;
var SEARCH_PANEL_QUEUE_TOGGLE_COUNTER = 1;
var SEARCH_PANEL_SEARCHBAR = 2;
var SEARCH_PANEL_RESULTS = 3;
var SEARCH_PANEL_QUEUE = 4;

var VOLUME_ICON = 0;
var VOLUME_SLIDER = 1;

var MAX_CONTROLS_HIDE_TIMEOUT = 2500;

function Controls(container, controlsElemCollection, altControlsElemCollection, infoElemCollection, volumeElemCollection, searchPanelElemCollection, seekElem) {
    var self = this;

    this.container = container;
    this.controlSeek = seekElem;

    this.volumeSlider = volumeElemCollection.item(VOLUME_SLIDER);

    this.searchButton = controlsElemCollection.item(CONTROLS_SEARCH);
    this.controlNext = controlsElemCollection.item(CONTROLS_NEXT);
    this.controlPrev = controlsElemCollection.item(CONTROLS_PREV);
    this.controlPlayPause = controlsElemCollection.item(CONTROLS_PLAYPAUSE);

    this.altCtrlSearchPanelExit = altControlsElemCollection.item(ALT_CONTROLS_EXIT);
    this.altCtrlQueueItemMoveUp = altControlsElemCollection.item(ALT_CONTROLS_QUEUE_MOVEUP);

    this.panelQueueToggle = searchPanelElemCollection.item(SEARCH_PANEL_QUEUE_TOGGLE);
    this.panelQueueToggleCounter = searchPanelElemCollection.item(SEARCH_PANEL_QUEUE_TOGGLE_COUNTER);
    this.panelSearchBar = searchPanelElemCollection.item(SEARCH_PANEL_SEARCHBAR);
    this.panelResults = searchPanelElemCollection.item(SEARCH_PANEL_RESULTS);
    this.panelQueue = searchPanelElemCollection.item(SEARCH_PANEL_QUEUE);

    this.infoTimeElapsed = infoElemCollection.item(INFO_TIME_ELAPSED);
    this.infoTimeTotal = infoElemCollection.item(INFO_TIME_TOTAL);
    this.infoTitle = infoElemCollection.item(INFO_TITLE);

    this.classNameControlActive = 'controls-container-active';
    this.classNameUserControls = 'user-controls';

    this.controlsHideTimeout = null;
    this.hidden = false;
    this.hasMouseOver = false;

    this.isPlaying = false;
    this.playbackTimer = 0;
    this.playbackTotal = 0;
    this.volume = 50;

    this.volumeSliderActive = false;
    this.volumeSliderDelta = 0;
    this.volumeScrollDelta = 3;

    this.defaultPlayingOpacity = 0.7;

    this.searchBarRequestInProgress = false;

    this.showQueueOrStack = SHOW_QUEUE;
    this.searchCache = {}; // cache for search result information - [url]->Result
    this.stackState = [];
    this.queueState = [];
    this.callbacks = {};

    this.queueActiveItem = null;

    this.getSearchPanel = function() {
        return this.searchPanel;
    };
    this.getSearchBar = function() {
        return this.panelSearchBar;
    };
    this.getContainer = function() {
        return this.container;
    };

    this.init = function() {
        // display queue
        $(self.searchButton).click();

        var pauseButton = $(this.controlPlayPause).children()[CONTROLS_PLAYPAUSE_PAUSE];
        $(pauseButton).hide();

        // hide alt controls
        $(self.altCtrlSearchPanelExit.parentNode).hide();
        $(self.altCtrlQueueItemMoveUp.parentNode).hide();

        // hide notification counter
        $(self.panelQueueToggleCounter).hide();
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

    this.showSearchPanel = function() {
        $(this.panelQueue).fadeOut();
        $(this.panelResults).fadeIn();

        // reset active queue item
        if (self.queueActiveItem) {
            self.queueActiveItem.click();
            self.queueActiveItem = null;
        }

        this.showAltControls();
    };

    this.showQueuePanel = function() {
        $(this.panelResults).fadeOut();
        $(this.panelQueue).fadeIn();

        this.showPlaybackControls();
    };

    this.showAltControls = function(mode) {
        $(this.searchButton.parentNode).stop().fadeOut();
        $(this.altCtrlQueueItemMoveUp.parentNode).stop().fadeOut();
        $(this.altCtrlSearchPanelExit.parentNode).stop().fadeOut();

        if(mode === SHOW_ITEM_ALT_CONTROLS) {
            $(this.altCtrlQueueItemMoveUp.parentNode).stop().fadeIn();
            return;
        }

        $(this.altCtrlSearchPanelExit.parentNode).stop().fadeIn();
    };

    this.showPlaybackControls = function() {
        $(this.altCtrlSearchPanelExit.parentNode).stop().fadeOut();
        $(this.altCtrlQueueItemMoveUp.parentNode).stop().fadeOut();
        $(this.searchButton.parentNode).stop().fadeIn();
    };

    this.setVolume = function(vol) {
        self.volume = vol;
        self.volumeSlider.style.height = vol + "%";
    };

    this.pause = function() {
        self.isPlaying= false;
        var playButton = $(self.controlPlayPause).children()[CONTROLS_PLAYPAUSE_PLAY];
        var pauseButton = $(self.controlPlayPause).children()[CONTROLS_PLAYPAUSE_PAUSE];

        // update playing opacity
        self.emit("opacitytoggle", [false]);

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

        // update playing opacity
        self.emit("opacitytoggle", [true, self.defaultPlayingOpacity]);

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
        if (!title) {
            title = "Untitled"
        }

        // reset previous title attribute
        this.infoTitle.removeAttribute("title");

        var text = title;
        if (title.length > MAX_MEDIA_TITLE_LENGTH) {
            text = title.substring(0, MAX_MEDIA_TITLE_LENGTH) + "...";
            this.infoTitle.setAttribute("title", title);
        }
        this.infoTitle.innerHTML = "<span>" + text + "</span>";
    };
    
    this.setMediaDuration = function(duration) {
        if(!duration) {
            this.infoTimeTotal.innerHTML = "--:--";
            return;
        }
        this.infoTimeTotal.innerHTML = secondsToHumanTime(duration);
    };

    this.setSearchPanelMessage = function(message) {
        self.panelResults.innerHTML = '<span class="message-wrapper"><span class="message-inner">' + message + '</span></span>';
    };

    this.setMediaElapsed = function(elapsedTimeSecs) {
        this.infoTimeElapsed.innerHTML = secondsToHumanTime(elapsedTimeSecs);
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

    this.updateSearchPanel = function(items) {
        // reset search cache
        var count = 0;
        for (var i in self.searchCache) {
            count++;
        }
        if(count > MAX_SEARCH_CACHE_RESULTS) {
            console.log("RESET CACHE");
            self.searchCache = {};
        }

        self.panelResults.innerHTML = '';

        if (!items.length) {
            self.panelResults.innerHTML = '<span class="message-wrapper"><span class="message-inner">No results found.</span></span>';
            return;
        }

        for(var i = 0; i < items.length; i++) {
            var thumb = "https://img.youtube.com/vi/" + items[i].id.videoId + "/default.jpg";
            var url = "https://www.youtube.com/watch?v=" + items[i].id.videoId;
            var item = new Result(items[i].snippet.title, Cons.STREAM_KIND_YOUTUBE, url, thumb);
            item.appendTo(self.panelResults);
            item.onClick((function(item, vidUrl) {
                return function() {
                    if (item.isClicked) {
                        return;
                    }

                    // add search item information to the search cache
                    self.searchCache[item.getUrl()] = item;

                    // disable re-queueing video for 10mins
                    item.disable(60 * 10 * 1000);
                    self.emit("chatcommand", ["/queue add " + vidUrl]);
                }
            })(item, url));
        }
    };
    
    this.updateQueue = function(items) {
        self.queueState = items;

        if (self.showQueueOrStack === SHOW_QUEUE) {
            self.showQueueItems();
        }
    };

    this.updateStack = function(items) {
        self.stackState = items;

        // update stack notification counter
        if (items.length > 1) {
            var count = items.length;
            if (count > 99) {
                count = '99+';
            }
            self.panelQueueToggleCounter.innerHTML = count;
            $(self.panelQueueToggleCounter).fadeIn();
        } else {
            $(self.panelQueueToggleCounter).hide();
        }

        if (self.showQueueOrStack === SHOW_STACK) {
            self.showStackItems();
        }
    };

    this.showQueueItems = function() {
        self.showQueueOrStack = SHOW_QUEUE;
        self.panelQueue.innerHTML = "";

        var items = self.queueState;
        if (!items.length) {
            self.panelQueue.innerHTML = '<span class="message-wrapper"><span class="message-inner">No items in the queue.</span></span>';
        }

        this.showQueueOrStackItems(items);
    };

    this.showStackItems = function() {
        self.showQueueOrStack = SHOW_STACK;
        self.panelQueue.innerHTML = "";

        var items = self.stackState;
        if (!items.length) {
            self.panelQueue.innerHTML = '<span class="message-wrapper"><span class="message-inner">No items in your queue.</span></span>';
        }

        self.showQueueOrStackItems(items);
    };

    this.showQueueOrStackItems = function(items) {
        if (!items.length) {
            self.queueActiveItem = null;
            self.showPlaybackControls();
            return;
        }

        // activeOrphanPanelItem signifies whether a queue / stack
        // item was active before, but no longer exists in the given
        // updated list of items.
        var activeOrphanPanelItem = true;

        for(var i = 0; i < items.length; i++) {
            var name = items[i].name;
            var kind = items[i].kind;
            var thumb = items[i].thumb;

            // check cache for cached information if missing
            var cachedData = self.searchCache[items[i].url];
            if (cachedData) {
                if(!name) {
                    name = cachedData.getName();
                }
                if(!thumb) {
                    thumb = cachedData.getThumb();
                }
                if(!kind) {
                    kind = cachedData.getKind();
                }
            } else {
                // TODO:
                // cache miss - store item in list outside of loop
                // and at the end of it make an http request to the
                // api for data (maybe one request for multiple items).
            }

            var item = new Result(name, kind, items[i].url, thumb);
            item.appendTo(self.panelQueue);
            item.onClick((function(item, vidUrl) {
                return function() {
                    if (item.isClicked) {
                        self.queueActiveItem = null;
                        item.setClicked(false);
                        item.removeClass(self.classNameControlActive);
                        self.showPlaybackControls();
                        return;
                    }

                    // reset other "active" item in the queue
                    if (self.queueActiveItem) {
                        self.queueActiveItem.click();
                    }

                    item.setClicked(true);
                    item.addClass(self.classNameControlActive);
                    self.showAltControls(SHOW_ITEM_ALT_CONTROLS);
                    self.queueActiveItem = item;
                }
            })(item, items[i].url));

            // determine if item was previously active
            if (self.queueActiveItem && self.queueActiveItem.getUrl() === items[i].url) {
                activeOrphanPanelItem = false;
                item.click();
            }
        }

        // reset controls panel back to playback controls panel if
        // activeOrphanPanel === true and self.queueActiveItem === true
        if(activeOrphanPanelItem && self.queueActiveItem) {
            self.queueActiveItem = null;
            self.showPlaybackControls();
            return;
        }
        
        // if we made it this far, an active item exists; scroll to it
        if(self.queueActiveItem) {
            self.queueActiveItem.scrollFrom(self.panelQueue);
        }
    };

    this.handleSearchButton = function(button, isActive) {
        if (isActive) {
            $(button).removeClass(self.classNameControlActive);
        } else {
            $(button).addClass(self.classNameControlActive);
        }

        $(self.panelQueue.parentNode).slideToggle(function() {
            if (!isActive) {
                $(self.panelSearchBar).children().focus();
            }
        });
    };

    this.handlePanelToggleButton = function(button, isActive) {
        if (isActive) {
            $(button).removeClass(self.classNameControlActive);
        } else {
            $(button).addClass(self.classNameControlActive);
        }

        self.emit("queuetoggle", [!isActive]);
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

    this.handleVolumeToggle = function(delta) {
        // slide up
        if (delta > 0) {
            self.emit("streamcontrol", ["increaseVolume", [delta]]);
            return;
        }

        // slide down
        self.emit("streamcontrol", ["decreaseVolume", [delta * -1]]);
    };

    this.handleSearchBarRequest = function(query) {
        this.showSearchPanel();
        if (self.searchBarRequestInProgress) {
            return;
        }
        self.searchBarRequestInProgress = true;
        self.setSearchPanelMessage("Loading, please wait...");

        var xhr = new XMLHttpRequest()
        xhr.open("GET", "/api/youtube/search/" + encodeURIComponent(query));
        xhr.send();
        xhr.addEventListener("readystatechange", function() {
            self.searchBarRequestInProgress = false;
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText)
                    self.updateSearchPanel(data.items || []);
                } catch(e) {
                    self.setSearchPanelMessage("Error fetching search results...");
                }
            }
        });
    };

    this.handleAltControlMoveItemUp = function() {
        // de-select item
        // self.queueActiveItem.click();

        if (!self.queueActiveItem) {
            console.log("WARN: attempt to hoist queue or stack item with no active item.");
            return;
        }

        if (self.showQueueOrStack === SHOW_QUEUE) {
            self.emit("chatcommand", ["/queue order next " + self.queueActiveItem.getUrl()]);
            return;
        }

        self.emit("chatcommand", ["/queue order mine " + self.queueActiveItem.getUrl() + " 0"])
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

    $(this.controlPrev).on('click', function() {
        self.handlePrevButton(this);
    });

    $(this.volumeSlider.parentNode).on("wheel", function(e) {
        if(e.originalEvent.deltaY < 0) {
            self.handleVolumeToggle(self.volumeScrollDelta);
            return;
        }

        self.handleVolumeToggle(-1 * self.volumeScrollDelta);
    });

    $(self.panelQueueToggle).on("click", function() {
        var isActive = $(this).hasClass(self.classNameControlActive);
        self.handlePanelToggleButton(this, isActive);
    });

    $(self.panelSearchBar).on("keypress", function(e) {
        if (e.keyCode !== 13 || !self.panelSearchBar.value) {
            return;
        }

        var query = self.panelSearchBar.value;
        self.panelSearchBar.value = '';
        self.handleSearchBarRequest(query);
    });

    $(this.volumeSlider.parentNode).on("mousedown", function() {
        self.volumeSliderActive = true;
    });

    $(self.container).on("mouseenter", function() {
       self.hasMouseOver = true;
    });

    $(self.container).on("mouseleave", function() {
        self.hasMouseOver = false;
    });

    $('.' + self.classNameUserControls).on("mouseenter", function() {
        if (self.isPlaying) {
            self.emit("opacitytoggle", [true]);
        }
    });

    $('.' + self.classNameUserControls).on("mouseleave", function() {
        if(self.isPlaying) {
            self.emit("opacitytoggle", [true, self.defaultPlayingOpacity, 4000]);
            return;
        }

        self.emit("opacitytoggle", [false]);
    });

    $(self.altCtrlSearchPanelExit).on("click", function() {
        self.showQueuePanel();
    });

    $(self.altCtrlQueueItemMoveUp).on("click", function() {
        self.handleAltControlMoveItemUp();
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

        self.handleVolumeToggle(delta);
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
},{"./constants.js":3,"./proto/emitter.js":6,"./result.js":7}],5:[function(require,module,exports){
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

    this.opacityOverlayClassName = ".opacity-overlay";
    this.defaultInterfaceOpacity = 0.8;
    
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
        document.getElementsByClassName("controls-container-button-alt"),
        document.getElementsByClassName("controls-container-info-inner"),
        document.getElementsByClassName("controls-container-volume-elem"),
        document.getElementsByClassName("controls-container-panel-elem"),
        document.getElementById("controls-container-seek")
    );

    // set application states
    this.initVideo = false;
    this.connectionLost = false;

    // initialize the client application
    // and its sub-components
    this.init = function() {
        this.chat.hide(true);

        $(self.opacityOverlayClassName).fadeTo("normal", 0.0);

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
                self.showOutput('The video file <span class="text-hl-name">' + self.video.getVideo().src.split(Cons.STREAM_URL_PREFIX)[1] + '</span> could not be loaded.');
            } else {
                self.showOutput('Unexpected error occurred while receiving video data.<br />' + err.target.error);
            }
            self.controls.pause();

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

        this.controls.on("opacitytoggle", function(enable, val, speed) {
            speed = speed || 200;
            $(self.opacityOverlayClassName).stop();

            if (!enable) {
                $(self.opacityOverlayClassName).animate({"opacity": 0.0}, {"duration": speed, "queue": false});
                return;
            }

            val = val || self.defaultInterfaceOpacity;
            $(self.opacityOverlayClassName).animate({"opacity": val}, {"duration": speed, "queue": false});
        });
        
        this.controls.on("queuetoggle", function(isQueueShowing) {
            self.controls.showQueuePanel();
            if (!isQueueShowing) {
                self.controls.showQueueItems();
                return;
            }

            self.controls.showStackItems();
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

    this.getControls = function() {
        return this.controls;
    };

    this.showOutput = function(text, timeout) {
        clearTimeout(this.outTimeout);

        $(this.overlay).stop();
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

        // request current queue status
        self.socket.send("request_queuesync");
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

        if (data.extra.stream.kind !== Cons.STREAM_KIND_YOUTUBE
            && data.extra.stream.kind !== Cons.STREAM_KIND_LOCAL) {
            self.showOutput("Server asked to load invalid stream type", '"' + data.extra.stream.kind + '"')
            return
        }

        self.socket.send("request_streamsync");
        self.socket.send("request_queuesync");

        if (self.controls.stackState.length) {
            self.socket.send("request_stacksync");
        }
    });

    this.socket.on('queuesync', function(data) {
        self.controls.updateQueue(data.extra.items || []);
    });

    this.socket.on('stacksync', function(data) {
        self.controls.updateStack(data.extra.items || [])
    });
    
    this.socket.on('streamsync', function(data) {
        data = parseSockData(data);
        if (data.extra.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            if (data.extra.stream.duration) {
                self.getVideo().ytVideoInfo.duration = data.extra.stream.duration;
            }
        } else {
            if (data.extra.playback.isPlaying && self.video.sourceFileError) {
                self.showOutput('The stream could not be loaded.');
                return;
            }
        }

        self.controls.setMediaTitle(data.extra.stream.name || data.extra.stream.url);
        self.controls.setMediaDuration(data.extra.stream.duration);
        self.controls.setMediaElapsed(data.extra.playback.time);
        self.controls.setSeeker(data.extra.playback.time, data.extra.stream.duration);

        self.video.canStartStream = false;

        var isNewClient = false;
        if (!self.video.alertShown) {
            self.video.alertShown = true;
            isNewClient = true;
        }

        if (Math.abs(parseInt(data.extra.playback.time) - parseInt(self.video.getTime())) > 10 && !data.extra.playback.isPaused) {
            if (data.extra.playback.time <= 1) {
                self.banner.showBanner('Resetting playback, please wait...');
            } else if (parseInt(data.extra.playback.time) - parseInt(self.video.getTime()) <= 0) {
                self.banner.showBanner('Seeking stream, please wait...');
            }
        }

        // only update video time if "lag" time > x seconds
        if (!self.video.getTime() || (self.video.getTime() && Math.abs(self.video.getTime() - data.extra.playback.time) > 0.7)) {
            self.video.setTime(data.extra.playback.time);
        }

        // safari bug fix - currentTime will not take
        // effect until a second after the page has loaded
        if (!self.video.getTime() && self.video.videoStreamKind === Cons.STREAM_KIND_LOCAL) {
            setTimeout(function() {
                self.video.setTime(data.extra.playback.time + 1);
            }, 1500);
        }

        if (!data.extra.playback.isPlaying) {
            self.video.pause();
            self.controls.pause();

            if (data.extra.playback.isStopped) {
                if(self.video.sourceFileError && data.extra.stream.kind === Cons.STREAM_KIND_LOCAL) {
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
        if (self.video.getDuration() && data.extra.playback.time >= self.video.getDuration()) {
            if (isNewClient) {
                self.showOutput('Welcome, the stream has already ended.');
            } else {
                self.showOutput('The stream has ended.');
            }

            return;
        }

        if(isNewClient) {
            // if (data.extra.startedBy) {
            //     self.showOutput('Welcome, the stream has already been started by <span class="text-hl-name">' + data.extra.startedBy + '</span>.', Cons.DEFAULT_OVERLAY_TIMEOUT);
            // } else {
            //     self.showOutput('Welcome, the stream has already been started.', Cons.DEFAULT_OVERLAY_TIMEOUT);
            // }
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
        // if ((e.keyCode == 70 || e.keyCode == 220) && !self.chat.isFocused() && self.chat.usernameInput !== document.activeElement) {
        //     if (self.video.getVideo().requestFullscreen) {
        //         self.video.getVideo().requestFullscreen();
        //         return;
        //     }
        //     if (self.video.getVideo().webkitRequestFullScreen) {
        //         self.video.getVideo().webkitRequestFullScreen();
        //         return;
        //     }
        //     if (self.video.getVideo().mozRequestFullScreen) {
        //         self.video.getVideo().mozRequestFullScreen();
        //         return;
        //     }
        //     if (self.video.getVideo().msRequestFullscreen) {
        //         self.video.getVideo().msRequestFullscreen();
        //         return;
        //     }
        // }
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
},{"./banner.js":1,"./chat.js":2,"./constants.js":3,"./controls.js":4,"./socket.js":8,"./video.js":9}],6:[function(require,module,exports){
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
var Cons = require('./constants.js');

function Result(name, kind, url, thumb) {
    var self = this;

    this.name = name || "Untitled";
    this.kind = kind || Cons.STREAM_KIND_LOCAL;
    this.url = url;
    this.thumbImgUrl = thumb;

    this.container = document.createElement("div");
    this.container.className = "controls-container-panel-result";

    this.thumb = document.createElement("div");
    this.thumb.className = "controls-container-panel-result-thumb";

    this.thumbSpan = document.createElement("span");
    this.thumbImg = new Image();

    this.disableTimeout = null;

    if (!thumb) {
        addThumbSpanClass(this.thumbSpan, kind)
    } else {
        this.thumbImg.src = thumb;
        this.thumbSpan.appendChild(this.thumbImg);

        // if error, default to above case
        this.thumbImg.addEventListener("error", function() {
            addThumbSpanClass(self.thumbSpan, self.kind);
        });
    }

    this.thumb.appendChild(this.thumbSpan);

    this.info = document.createElement("div");
    this.info.className = "controls-container-panel-result-info";
    this.info.innerHTML = "<span>" + this.name + "<br /><br />" + this.url + "</span>";

    // build sub-tree
    this.container.appendChild(this.thumb);
    this.container.appendChild(this.info);

    this.getName = function() {
        return this.name;
    };

    this.getUrl = function() {
        return this.url;
    };

    this.getThumb = function() {
        return this.thumbImgUrl;
    };
    
    this.getKind = function() {
        return this.kind;  
    };

    this.appendTo = function(elem) {
        elem.appendChild(self.container);
    };

    this.onClick = function(handler) {
        self.container.addEventListener("click", handler || function(e) {});
    };

    this.addClass = function(className) {
        if (self.container.className.indexOf(className) !== -1) {
            return;
        }
        self.container.className += " " + className;
    };

    this.removeClass = function(className) {
        var newClassName = self.container.className.split(" ");
        if (!newClassName.length) {
            return;
        }

        var idx = newClassName.indexOf(className);
        if (idx === -1) {
            return;
        }

        newClassName.splice(idx, 1);
        self.container.className = newClassName.join(" ");
    };

    this.setClicked = function(bool) {
        this.isClicked = bool;
    };

    this.click = function() {
        this.container.click();
    };

    // receives an optional timeout in seconds
    this.disable = function(timeout) {
        this.isClicked = true;
        this.addClass("disabled");

        if (timeout) {
            clearTimeout(self.disableTimeout);
            self.disableTimeout = setTimeout(function() {
                self.enable();
            }, timeout);
        }
    };

    this.scrollFrom = function(elem) {
        $(elem).stop().animate({scrollTop: $(self.container).offset().top});
    };

    this.enable = function() {
        self.isClicked = false;
        self.removeClass("disabled");
    };
}

module.exports = Result;

function addThumbSpanClass(span, kind) {
    if (kind === Cons.STREAM_KIND_YOUTUBE) {
        span.className = "fa fa-youtube";
    } else {
        span.className = "fa fa-film";
    }
}
},{"./constants.js":3}],8:[function(require,module,exports){
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
                self.subscriptions[data.event][i].apply(self.socket, [data.data]);
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
},{"./proto/emitter.js":6}],9:[function(require,module,exports){
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
        if (self.loadedData.stream.kind !== Cons.STREAM_KIND_LOCAL) {
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
    
    this.isStreamKindYouTube = function() {
        if(!self.loadedData) {
            return false;
        }
        return self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE;
    };

    this.load = function(data) {
        self.pause();
        self.sourceFileError = false;
        self.loadedData = data.extra;
        self.videoStreamKind = data.extra.stream.kind;
        self.pause();
        if (data.extra.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.hidePlayer();
            self.showYtPlayer();
            self.loadYtVideo(youtubeVideoIdFromUrl(data.extra.stream.url));
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

        try {
            self.video.src = Cons.STREAM_URL_PREFIX + data.extra.stream.url;
            self.video.volume = self.videoVolume;
        } catch(e) {
            console.log("EXCEPT VIDEO LOAD", e);
            self.emit("error", [{
                target: {
                    error: e
                }
            }]);
        }
    };

    this.play = function(time) {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to play video with no data loaded.');
            return;
        }

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
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
            var isPlaying = this.video.currentTime > 0 && !this.video.paused && !this.video.ended && this.video.readyState > 2;
            if (isPlaying) {
                return;
            }
            
            var promise = this.video.play();
            if (promise !== undefined) {
                promise.then(function () {
                    // Automatic playback started!
                }).catch(function (error) {
                    console.log('EXCEPT VIDEO PLAY', error);
                    self.emit("error", [{
                        target: {
                            error: error
                        }
                    }]);
                });
            }
        } catch(e) {
            console.log('EXCEPT VIDEO PLAY', e);
            self.emit("error", [{
                target: {
                    error: e
                }
            }]);
        }
    };

    this.pause = function() {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to pause video with no data loaded.');
            return;
        }

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.pauseYtVideo();
            return;
        }

        var isPlaying = !this.video.paused && !this.video.ended && this.video.readyState > 1;
        if (!isPlaying) {
            return;
        }

        try {
            self.video.pause();
        } catch(e) {
            console.log('EXCEPT VIDEO PAUSE', e);
            self.emit("error", [{
                target: {
                    error: e
                }
            }]);
        }
    };

    this.setTime = function(time) {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to pause video with no data loaded.');
            return;
        }

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.seekYtVideo(time);
        }

        this.video.currentTime = time;
    };

    this.getTime = function() {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to get video info with no data loaded.');
            return;
        }

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
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

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
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

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
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

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
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

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
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
