/**
 * Controls handler
 */

var Result = require('./result.js');
var Cons = require('./constants.js');

var Emitter = require('./proto/emitter.js');

var MAX_SEARCH_CACHE_RESULTS = 10;
var MAX_MEDIA_TITLE_LENGTH = 39;

var CONTAINER_OVERLAY_CLOSE_BUTTON = 0;
var CONTAINER_OVERLAY_CONTENT = 1;

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

var SEEK_BAR = 0;
var SEEK_TRIGGER = 1;
var SEEK_BUTTONS = 2;

var SEEK_BUTTONS_FORWARD = 0;
var SEEK_BUTTONS_REWIND = 1;
var SEEK_BUTTONS_CLOSE = 2;

var MAX_CONTROLS_HIDE_TIMEOUT = 2500;

function Controls(container, containerOverlay, controlsElemCollection, altControlsElemCollection, infoElemCollection, volumeElemCollection, searchPanelElemCollection, seekElemCollection) {
    var self = this;

    this.container = container;
    this.controlSeek = seekElemCollection.item(SEEK_BAR);
    this.controlSeekTrigger = seekElemCollection.item(SEEK_TRIGGER);
    this.controlSeekButtons = seekElemCollection.item(SEEK_BUTTONS);
    this.controlSeekButtonsRewind = this.controlSeekButtons.children[SEEK_BUTTONS_REWIND];
    this.controlSeekButtonsForward = this.controlSeekButtons.children[SEEK_BUTTONS_FORWARD];
    this.controlSeekButtonsClose = this.controlSeekButtons.children[SEEK_BUTTONS_CLOSE];
    // set to false on user interaction with the seeker
    this.controlSeekCanUpdate = true;
    // seek ui controls
    this.controlSeekCanSeek = false;
    this.controlSeekDelta = 0;
    this.controlSeekDeltaStart = 0;
    this.controlSeekClientWidthStart = 0;
    this.controlSeekTriggerTextTimeout = null;
    self.controlSeekTriggerText = 'Click + drag your mouse left or right to seek.';


    this.containerOverlay = containerOverlay;
    this.containerOverlayCloseButton = containerOverlay.children[CONTAINER_OVERLAY_CLOSE_BUTTON];
    this.containerOverlayContent = containerOverlay.children[CONTAINER_OVERLAY_CONTENT];

    this.volumeSliderIcon = volumeElemCollection.item(VOLUME_ICON);
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
    this.classNameVolumeDefault = 'fa-volume-up';
    this.classNameVolumeMuted = 'fa-volume-off';

    this.controlsHideTimeout = null;
    this.hidden = false;
    this.hasMouseOver = false;
    this.isSearchBarFocused = false;

    this.isDisplayingVideoPreview = false;
    this.isPlaying = false;
    this.playbackTimer = 0;
    this.playbackTotal = 0;
    this.volume = 50;

    this.volumeSliderActive = false;
    this.volumeSliderDelta = 0;
    this.volumeScrollDelta = 3;

    this.defaultPlayingOpacity = 0.7;

    this.searchBarRequestInProgress = false;
    this.searchPanelShowing = false;

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
        if(this.hidden || this.hasMouseOver || this.isSearchBarFocused) {
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
        self.searchPanelShowing = true;
        $(this.panelQueue).fadeOut();
        $(this.panelResults).fadeIn();

        // reset active queue item
        if (self.queueActiveItem) {
            self.queueActiveItem.click();
            self.queueActiveItem = null;
        }

        this.showAltControls();
    };

    this.hideSearchPanel = function() {
        self.searchPanelShowing = false;
        $(this.panelResults).fadeOut();
    };

    this.showQueuePanel = function() {
        this.hideSearchPanel();
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
        if (self.searchPanelShowing) {
            return;
        }

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

        this.playbackTimer = current;
        this.playbackTotal = total || 0;

        // only update ui if it is not being interacted with by the user
        if (!this.controlSeekCanUpdate) {
            return;
        }

        this.controlSeek.style.width = percent + "%";
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

        var playlistItems = [];

        // append queue-all button if displaying playlist
        var isPlaylist = false;
        switch(items[0].kind) {
        case Cons.YOUTUBE_ITEM_KIND_PLAYLIST_ITEM:
        case Cons.SOUNDCLOUD_ITEM_KIND_PLAYLIST_ITEM:
            isPlaylist = true;
        }

        if (isPlaylist) {
            var queueall = document.createElement('div');
            queueall.className = 'controls-container-panel-queueall';
            queueall.innerHTML = 'Queue all playlist items'
            queueall.addEventListener('click', (function(self, items) {
                return function() {
                    if (self.isDisabled) {
                        return;
                    }

                    self.isDisabled = true;
                    $(self).fadeOut();

                    // TODO: consider modifying the queue add command to receive multiple arguments.
                    for (var i = 0; i < items.length; i++) {
                        items[i].clickInfo();
                    }
                }
            })(queueall, playlistItems));

            self.panelResults.appendChild(queueall);
        }

        for(var i = 0; i < items.length; i++) {
            var isTwitchVideo = items[i].kind === Cons.TWITCH_ITEM_KIND_ITEM;
            var isPlaylistItem = false;

            switch(items[i].kind) {
            case Cons.YOUTUBE_ITEM_KIND_PLAYLIST_ITEM:
            case Cons.SOUNDCLOUD_ITEM_KIND_PLAYLIST_ITEM:
                isPlaylistItem = true;
            }
            
            var videoId = items[i].id;
            var thumb = items[i].thumb;
            var url = items[i].url;

            var streamKind = Cons.STREAM_KIND_YOUTUBE;
            if (isTwitchVideo) {
                streamKind = Cons.STREAM_KIND_TWITCH;
            }

            var title = items[i].title || 'Untitled';
            var description = url;
            if (streamKind === Cons.STREAM_KIND_TWITCH) {
                description = items[i].channel.display_name + " - " + items[i].game;
            }

            var urlPieces = items[i].url.split("?clip=");
            if (items[i].kind === Cons.STREAM_KIND_TWITCH_CLIP && urlPieces.length > 1) {
                description = "Twitch clip - " + items[i].slug;
            }

            var item = new Result(title, streamKind, url, thumb, description);
            item.hideDuration();
            item.appendTo(self.panelResults);
            item.onInfoClick((function(item, vidUrl) {
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

            item.onThumbClick((function(item, videoId, kind) {
                return function() {
                    if (kind === Cons.STREAM_KIND_YOUTUBE) {
                        self.showVideoPreview(videoId);
                        return;
                    }

                    item.clickInfo();
                }
            })(item, videoId, streamKind));

            if (isPlaylistItem) {
                playlistItems.push(item);
            }
        }
    };

    this.showVideoPreview = function(videoId) {
        self.isDisplayingVideoPreview = true;

        self.emit("streamcontrol", ["mute", []]);
        $(self.volumeSlider.parentNode).addClass('muted');
        $(self.volumeSliderIcon).removeClass(self.classNameVolumeDefault);
        $(self.volumeSliderIcon).addClass(self.classNameVolumeMuted);

        $(this.containerOverlay).fadeIn();
        this.containerOverlayContent.innerHTML = '<iframe border="0" src="https://www.youtube.com/embed/' + videoId + '?autoplay=1&controls=1"></iframe>';
    };

    this.hideVideoPreview = function() {
        self.isDisplayingVideoPreview = false;

        $(self.volumeSlider.parentNode).removeClass('muted');
        $(self.volumeSliderIcon).removeClass(self.classNameVolumeMuted);
        $(self.volumeSliderIcon).addClass(self.classNameVolumeDefault);

        this.containerOverlayContent.innerHTML = '';
        $(this.containerOverlay).fadeOut();
        self.emit("streamcontrol", ["unmute", []]);
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
        if (items.length > 0) {
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

    this.restoreStack = function(items) {
        for (var i = 0; i < items.length; i++) {

            var url = items[i].url;
            if (!url || !url.length) {
                continue
            }

            self.emit("chatcommand", ["/queue add " + url]);
        }
    };

    this.showQueueItems = function() {
        self.showQueueOrStack = SHOW_QUEUE;
        self.panelQueue.innerHTML = "";

        var items = self.queueState;
        if (!items.length) {
            self.panelQueue.innerHTML = '<span class="message-wrapper"><span class="message-inner">Queue a video<br />by using the search bar above.</span></span>';
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

            if (duration) {
                duration = secondsToHumanTime(duration);
            }

            var desc = items[i].url;
            var urlPieces = items[i].url.split("?clip=");
            if (kind === Cons.STREAM_KIND_TWITCH_CLIP && urlPieces.length > 1) {
                desc = 'Twitch clip - ' + urlPieces[1];
            }

            var item = new Result(name, kind, items[i].url, thumb, desc);
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
                item.showDuration(duration);
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

        if (isActive && self.isDisplayingVideoPreview) {
            self.hideVideoPreview();
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

        if (self.handleYoutubeUriQuery(query)) {
            return;
        }
        if (self.handleTwitchUriQuery(query)) {
            return;
        }
        if (self.handleSoundCloudUriQuery(query)) {
            return;
        }

        // treat query as search keywords and default to youtube search
        RESTYoutubeCall("/api/youtube/search/" + encodeYoutubeURIComponent(query), function(data, error) {
            self.searchBarRequestInProgress = false;
            if (error !== null) {
                self.setSearchPanelMessage("Error fetching video results...")
                return;
            }

            self.updateSearchPanel(data.items || []);
        });
    };

    this.handleYoutubeUriQuery = function(query) {
        if (!query.match(/^http(s)?:\/\/(www\.)?youtu(\.)?be/gi)) {
            return false;
        }

        var id = null;
        var params = query.split('watch?')[1];
        if (!params) {
            // handle "youtu.be" format
            var segs = query.split('/');
            segs = segs[segs.length - 1];
            if (!segs) {
                return false;
            }

            segs = segs.split('?');
            id = segs[0];
            params = segs[1];

            if (!params) {
                return false;
            }
        }

        params = params.split('&');

        var keys = {};
        for (var i = 0; i < params.length; i++) {
            var kv = params[i].split('=');
            keys[kv[0]] = kv[1];
        }

        if (keys['v']) {
            id = keys['v'];
        }

        var endpoint = "/api/youtube/search/" + encodeYoutubeURIComponent(query);
        if (keys['list']) {
            endpoint = "/api/youtube/list/" + keys['list'];
        }

        RESTYoutubeCall(endpoint, function(data, error) {
            self.searchBarRequestInProgress = false;
            if (error !== null) {
                self.setSearchPanelMessage("Error fetching video results...");
                return;
            }

            self.updateSearchPanel(data.items || []);
        });

        return true;
    };

    this.handleTwitchUriQuery = function(query) {
        if (!query.match(/^http(s)?:\/\/(www\.)?(clips\.)?twitch\.tv/gi)) {
            return false;
        }

        var endpoint = "/api/twitch/stream/";
        var id = "";

        // handle clips
        if (query.split("clips.twitch").length > 1) {
            endpoint = "/api/twitch/clip/";

            var segs = query.split("/");
            id = segs[segs.length - 1];
        } else {
            var segs = query.split('/videos/');
            if (segs.length < 2) {
                return false;
            }

            id = segs[1];
        }

        if (!id) {
            return false;
        }

        var xhr = new XMLHttpRequest();
        xhr.open("GET", endpoint + id);
        xhr.send();
        xhr.addEventListener("readystatechange", function() {
            self.searchBarRequestInProgress = false;
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data.httpCode && data.httpCode === 500 && data.error) {
                        var errMessage = data.error;
                        if (errMessage.length) {
                            errMessage[0] = errMessage[0].toUpperCase();
                        }

                        self.setSearchPanelMessage(errMessage);
                        return;
                    }

                    self.updateSearchPanel(data.items || []);
                } catch(e) {
                    self.setSearchPanelMessage("Error fetching video results...");
                }
            } else if (xhr.readyState === 4 && xhr.status === 500) {
                self.setSearchPanelMessage("Error from server while fetching video results...<br />Try again later.");
            }
        });

        return true;
    };

    this.handleSoundCloudUriQuery = function(query) {
        if (!query.match(/^http(s)?:\/\/(www\.)?soundcloud\.com/gi)) {
            return false;
        }

        var endpoint = "/api/soundcloud/stream/";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", endpoint + query);
        xhr.send();
        xhr.addEventListener("readystatechange", function() {
            self.searchBarRequestInProgress = false;
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data.httpCode && data.httpCode === 500 && data.error) {
                        var errMessage = data.error;
                        if (errMessage.length) {
                            errMessage[0] = errMessage[0].toUpperCase();
                        }

                        self.setSearchPanelMessage(errMessage);
                        return;
                    }
                    
                    self.updateSearchPanel(data.items || []);
                } catch(e) {
                    self.setSearchPanelMessage("Error fetching video results...");
                }
            } else if (xhr.readyState === 4 && xhr.status === 500) {
                self.setSearchPanelMessage("Error from server while fetching video results...<br />Try again later.");
            }
        });

        return true;
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

    $(self.panelSearchBar).on("focus", function() {
        self.isSearchBarFocused = true;
    });

    $(self.panelSearchBar).on("blur", function() {
        self.isSearchBarFocused = false;
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

    $(self.containerOverlayCloseButton).on("click", function() {
        self.hideVideoPreview();
    });

    $(self.altCtrlQueueItemMoveUp).on("click", function() {
        self.handleAltControlMoveItemUp();
    });

    $(self.altCtrlQueueItemDelete).on("click", function() {
        self.handleAltControlDeleteItem();
    });

    // control seek interaction
    $(self.controlSeekTrigger).on('mouseout', function() {
        if (!self.controlSeekCanSeek) {
            $(self.controlSeekTrigger).animate({
                opacity: '0'
            }, {
                duration: 500,
                queue: false
            });
        }
    });
    $(self.controlSeekTrigger).on('mouseover', function() {
        if (!self.controlSeekCanSeek) {
            $(self.controlSeekTrigger).animate({
                opacity: '1.0'
            }, {
                duration: 500,
                queue: false
            });

            return;
        }
    });
    $(self.controlSeekTrigger).on('mousedown', function(e) {
        if (!self.playbackTotal) {
            return;
        }

        if (self.controlSeekCanSeek && self.controlSeekCanUpdate) {
            self.controlSeekCanUpdate = false;
            self.controlSeekDeltaStart = e.pageX;
            self.controlSeekClientWidthStart = self.controlSeek.clientWidth;
        }
    });
    $(self.controlSeekTrigger).on('mouseup', function() {
        if (!self.playbackTotal) {
            self.controlSeekButtons.style.display = 'table';
            $(self.controlSeekButtons).animate({
                opacity: "1.0",
            }, {
                duration: 500,
                queue: false
            });
            return;
        }

        if (self.controlSeekCanSeek) {
            if (self.controlSeekDelta === 0) {
                self.controlSeekCanSeek = false;
                self.controlSeekTrigger.children[0].style.display = 'none';

                $(self.controlSeekTrigger).animate({
                    height: "18%"
                }, {
                    opacity: "0",
                    duration: 500,
                    queue: false,
                    complete: function() {
                        if (!self.controlSeekCanSeek) {
                            self.controlSeekTrigger.style.background = 'rgba(255,255,255,0.1)';
                        }
                    }
                });
                return;
            }

            // update stream position
            var percent  = parseInt((self.controlSeekDelta / self.controlSeekTrigger.clientWidth) * 100);
            var existingPercent = parseInt(self.controlSeekClientWidthStart / self.controlSeekTrigger.clientWidth * 100);
            var newPercent = existingPercent + percent;

            if (percent !== existingPercent) {
                if (newPercent < 0) {
                    newPercent = 0;
                }
                if (newPercent > 100) {
                    newPercent = 100;
                }

                var newTime = parseInt(newPercent * self.playbackTotal / 100);
                self.emit("chatcommand", ["/stream seek " + newTime]);
            }

            self.controlSeekDelta = 0;
            self.controlSeekCanUpdate = true;
            return;
        }

        $(self.controlSeekTrigger).animate({
            height: "110%"
        }, {
            duration: 500,
            queue: false
        });

        self.controlSeekTrigger.style.background = 'rgba(0,0,0,0.8)';
        self.controlSeekTrigger.children[0].style.display = 'table-cell';
        self.controlSeekTrigger.children[0].innerHTML = self.controlSeekTriggerText;

        self.controlSeekCanSeek = true;
    });

    $(self.controlSeekButtonsClose).on('click', function() {
        $(self.controlSeekButtons).animate({
            opacity: "0.0"
        }, {
            duration: 500,
            queue: false,
            complete: function() {
                self.controlSeekButtons.style.display = "none";
            }
        });
    });

    $(self.controlSeekButtonsForward).on('click', function() {
        self.emit("chatcommand", ["/stream seek -30s"]);
    });

    $(self.controlSeekButtonsRewind).on('click', function() {
        self.emit("chatcommand", ["/stream seek +30s"]);
    });

    // handle seek bar drag
    $(window).on("mouseup", function() {
        if (!self.playbackTotal) {
            return;
        }

       self.controlSeekCanUpdate = true;
       self.volumeSliderActive = false;
       self.volumeSliderDelta = 0;

       if (self.controlSeekCanSeek) {
           clearTimeout(self.controlSeekTriggerTextTimeout);
           self.controlSeekTriggerTextTimeout = setTimeout(function () {
               self.controlSeekTrigger.children[0].innerHTML = self.controlSeekTriggerText;
           }, 1000);
       }
    });

    // handle seek bar drag
    $(window).on("mousemove", function(e) {
        if (!self.playbackTotal) {
            return;
        }

        if (self.controlSeekCanSeek && !self.controlSeekCanUpdate) {
            self.controlSeekDelta = (e.pageX - self.controlSeekDeltaStart);

            var percent  = parseInt((self.controlSeekDelta / self.controlSeekTrigger.clientWidth) * 100);
            var existingPercent = parseInt(self.controlSeekClientWidthStart / self.controlSeekTrigger.clientWidth * 100);
            var newPercent = existingPercent + percent;

            if (percent !== existingPercent) {
                if (newPercent < 0) {
                    newPercent = 0;
                }
                if (newPercent > 100) {
                    newPercent = 100;
                }

                var newTime = parseInt(newPercent * self.playbackTotal / 100);
                clearTimeout(self.controlSeekTriggerTextTimeout);

                self.controlSeek.style.width = newPercent + "%";
                self.controlSeekTrigger.children[0].style.display = 'table-cell';
                self.controlSeekTrigger.children[0].innerHTML = secondsToHumanTime(newTime);
            }
        }
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

function encodeYoutubeURIComponent(query) {
    if (!query.match(/^http(s)?:\/\/(www\.)?youtu(\.)?be/gi)) {
        return encodeURIComponent(query);
    }

    var params = query.split('watch?')[1];
    if (!params) {
        // handle "youtu.be" format
        query = query.split('?')[0];
        return encodeURIComponent(query);
    }

    query = query.split('&')[0];
    return encodeURIComponent(query);
}

function RESTYoutubeCall(endpoint, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", endpoint);
    xhr.send();
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState !== 4) {
            return;
        }

        if (xhr.status !== 200) {
            callback(null, "invalid http status code from server:", xhr.status);
            return;
        }

        try {
            var data = JSON.parse(xhr.responseText);
            callback(data, null);
        } catch(e) {
            callback(null, e.toString());
        }
    });
}

Controls.prototype = new Emitter();

module.exports = Controls;