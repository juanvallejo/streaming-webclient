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
var ALT_CONTROLS_QUEUE_ITEM_DELETE = 2;

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
    this.altCtrlQueueItemDelete = altControlsElemCollection.item(ALT_CONTROLS_QUEUE_ITEM_DELETE);

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
        // $(self.searchButton).click();

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
        if (!self.isPlaying) {
            return;
        }

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
        if (self.isPlaying) {
            return;
        }

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
            var duration = items[i].duration;

            // check cache for cached information if missing
            // we do not worry about cached duration, since that
            // information is not available through search api
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

            if (duration) {
                item.showDuration(secondsToHumanTime(duration));
            }

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

    this.handleAltControlDeleteItem = function() {
        if (!self.queueActiveItem) {
            console.log("WARN: attempt to delete queue or stack item with no active item.");
            return;
        }

        if (self.showQueueOrStack === SHOW_QUEUE) {
            self.emit("chatcommand", ["/queue clear room " + self.queueActiveItem.getUrl()]);
            return;
        }

        self.emit("chatcommand", ["/queue clear mine " + self.queueActiveItem.getUrl()])

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

    $(self.altCtrlQueueItemDelete).on("click", function() {
        self.handleAltControlDeleteItem();
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