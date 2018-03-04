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

    this.ytPlayer = null;
    this.ytVideoInfo = {};
    this.ytVideoCurrentTime = 0;
    this.ytElem = null;
    this.ytReadyCallbacks = [];
    this.ytLoadCallbacks = [];
    this.ytPlayerReady = false;

    this.twitchPlayer = null;
    this.twitchElem = null;
    this.twitchReadyCallbacks = [];
    this.twitchPlayerReady = false;


    this.isPlaying = false;

    // ignores the actual HTMLEntity when adding
    // an event listener to this wrapper object.
    this.EVT_IGNORE_ELEM = true;

    // youtube iframe player events
    this.YT_PLAYER_STATE_UNSTARTED = -1;
    this.YT_PLAYER_STATE_ENDED     = 0;
    this.YT_PLAYER_STATE_PLAYING   = 1;
    this.YT_PLAYER_STATE_PAUSED    = 2;
    this.YT_PLAYER_STATE_BUFFERING = 3;

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

    this.hideTwitchPlayer = function() {
        self.onTwitchPlayerReady(function() {
            self.twitchElem.style.display = 'none';
        });
    };

    this.showYtPlayer = function() {
        self.onYtPlayerReady(function() {
            self.ytElem.style.display = 'block';
        });
    };

    this.showTwitchPlayer = function() {
        self.onTwitchPlayerReady(function() {
            self.twitchElem.style.display = 'block';
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

    this.callTwitchPlayerCallbacks = function() {
        self.twitchPlayerReady = true;
        while(self.twitchReadyCallbacks.length) {
            self.twitchReadyCallbacks.shift().call(self, self.twitchPlayer);
        }
    };

    this.onYtPlayerLoad = function(callback) {
        this.ytLoadCallbacks.push(callback);
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

    this.onTwitchPlayerReady = function(callback) {
        if (this.twitchPlayerReady) {
            callback.call(self, self.twitchPlayer);
            return;
        }

        this.twitchReadyCallbacks.push(callback);
    };

    this.onYtPlayerStateChange = function(evt) {
        // catch video player state changes
        // and stop player if playing, but
        // current app state is set to pause.
        if (evt.data === self.YT_PLAYER_STATE_PLAYING) {
            if (!self.isPlaying) {
                self.pause();
            }
        }
    };

    this.onTwitchPlayerStateChange = function(evt) {
        // catch video player state events
        // and prevent twitch player from
        // continuing playback if global
        // state is set to stopped or paused.
        if (evt === Twitch.Player.PLAY) {
            if (!self.isPlaying) {
                self.pause();
            }
        }

        if (evt === Twitch.Player.ENDED) {
            // TODO
        }
    };

    this.loadYtVideo = function(videoId) {
        self.onYtPlayerReady(function(frame) {
            frame.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': 'loadVideoById',
                'args': [videoId, 0, 'large']
            }), "*");

            // call onload callbacks
            while (self.ytLoadCallbacks.length) {
                self.ytLoadCallbacks.shift().call(self, videoId);
            }
        });
    };

    this.loadTwitchVideo = function(videoId) {
        self.onTwitchPlayerReady(function(player) {
            player.setVideo(videoId);
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

    this.seekTwitchVideo = function(time) {
        self.onTwitchPlayerReady(function(player) {
            player.seek(time);
        });
    };

    this.muteYtVideoVolume = function() {
        self.onYtPlayerReady(function(frame) {
            frame.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': 'mute',
                'args': []
            }), "*");
        });
    };

    this.muteTwitchVideoVolume = function() {
        self.onTwitchPlayerReady(function(player) {
            player.setMuted(true);
        });
    };

    this.unmuteYtVideoVolume = function() {
        self.onYtPlayerReady(function(frame) {
            frame.contentWindow.postMessage(JSON.stringify({
                'event': 'command',
                'func': 'unMute',
                'args': []
            }), "*");
        });
    };

    this.unmuteTwitchVideoVolume = function() {
        self.onTwitchPlayerReady(function(player) {
            player.setMuted(false);
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

    this.setTwitchVideoVolume = function(vol) {
        self.onTwitchPlayerReady(function(player) {
            player.setVolume(vol);
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

    this.playTwitchVideo = function() {
        self.onTwitchPlayerReady(function(player) {
            player.play();
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

    this.pauseTwitchVideo = function() {
        self.onTwitchPlayerReady(function(player) {
            player.pause();
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

    this.initTwitchPlayer = function() {
        this.twitchPlayer = new Twitch.Player(Cons.DOM_TWITCH_CONTAINER, {
            width: '100%',
            height: '100%',
            controls: false,
            autoplay: false
        });

        this.twitchElem = document.getElementById(Cons.DOM_TWITCH_CONTAINER);
        this.twitchElem.style.display = 'none';

        this.twitchPlayer.addEventListener(Twitch.Player.READY, self.callTwitchPlayerCallbacks)
        this.twitchPlayer.addEventListener(Twitch.Player.PAUSE, function() {
            self.onTwitchPlayerStateChange(Twitch.Player.PAUSE);
        });
        this.twitchPlayer.addEventListener(Twitch.Player.PLAY, function() {
            self.onTwitchPlayerStateChange(Twitch.Player.PLAY);
        });
        this.twitchPlayer.addEventListener(Twitch.Player.ENDED, function() {
            self.onTwitchPlayerStateChange(Twitch.Player.ENDED);
        });
        this.twitchPlayer.addEventListener(Twitch.Player.ONLINE, function() {
            self.onTwitchPlayerStateChange(Twitch.Player.ONLINE);
        });
        this.twitchPlayer.addEventListener(Twitch.Player.OFFLINE, function() {
            self.onTwitchPlayerStateChange(Twitch.Player.OFFLINE);
        });
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

        // we do not init the youtube player as that requires a global event
        // that is caught before the initialization of this module
        this.initTwitchPlayer();
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

    this.isStreamKindTwitch = function() {
        if(!self.loadedData) {
            return false;
        }
        return self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH;
    };

    this.load = function(data) {
        self.pause();

        // clear previously loaded html5 video source if any
        if (self.video.src && self.video.currentTime) {
            self.video.currentTime = 0;
        }

        self.sourceFileError = false;
        self.loadedData = data.extra;
        self.videoStreamKind = data.extra.stream.kind;
        if (data.extra.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.hidePlayer();
            self.hideTwitchPlayer();
            self.showYtPlayer();
            self.loadYtVideo(youtubeVideoIdFromUrl(data.extra.stream.url));
            self.pause();

            var volMod = 1;
            if (self.videoVolume < 1) {
                volMod = 100;
            }

            self.setYtVideoVolume(self.videoVolume * volMod);
            return;
        } else if (data.extra.stream.kind === Cons.STREAM_KIND_TWITCH) {
            self.hidePlayer();
            self.hideYtPlayer();
            self.showTwitchPlayer();
            self.loadTwitchVideo(twitchVideoIdFromUrl(data.extra.stream.url));
            self.pause();

            self.seekTwitchVideo(0);
            self.setTwitchVideoVolume(self.videoVolume);
            return;
        }

        self.pause();
        self.hideYtPlayer();
        self.hideTwitchPlayer();
        self.showPlayer();
        
        var url = Cons.STREAM_URL_PREFIX + data.extra.stream.url;

        // default to using local player for other stream kinds.
        // handle url sanitizing / parsing accordingly
        if (data.extra.stream.kind === Cons.STREAM_KIND_TWITCH_CLIP) {
            url = twitchClipVideoUrlFromUrl(data.extra.stream.url);
        }

        try {
            self.video.src = url;
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

        this.isPlaying = true;

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            this.playYtVideo();
            return;
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            this.playTwitchVideo();
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

        this.isPlaying = false;

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.pauseYtVideo();
            return;
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            self.pauseTwitchVideo();
            return;
        }

        // var isPlaying = !this.video.paused && !this.video.ended && this.video.readyState > 1;
        // if (!isPlaying) {
        //     return;
        // }

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
            return;
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            self.seekTwitchVideo(time);
            return;
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

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            if (!self.twitchPlayerReady || !self.twitchPlayer) {
                return 0;
            }

            return self.twitchPlayer.getCurrentTime();
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
        if (self.videoVolume >= 1) {
            self.videoVolume = 0.99;
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
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            self.setTwitchVideoVolume(self.videoVolume);
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
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            self.setTwitchVideoVolume(self.videoVolume);
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
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            self.setTwitchVideoVolume(self.videoVolume);
            return;
        }

        if (self.video.muted) {
            self.video.muted = false;
        }

        self.video.volume = self.videoVolume;
    };
    
    this.mute = function() {
        if (!self.loadedData) {
            return;
        }

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.muteYtVideoVolume();
            return;
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            self.muteTwitchVideoVolume();
            return;
        }

        self.video.muted = true;
    };
    
    this.unmute = function() {
        if (!self.loadedData) {
            return;
        }

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            self.unmuteYtVideoVolume();
            return;
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            self.unmuteTwitchVideoVolume();
            return;
        }

        self.video.muted = false;
    };

    this.getDuration = function() {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to get video duration with no data loaded.');
            return;
        }

        if (self.loadedData.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            return this.ytVideoInfo ? this.ytVideoInfo.duration : 0;
        } else if (self.loadedData.stream.kind === Cons.STREAM_KIND_TWITCH) {
            if (!self.twitchPlayerReady || !self.twitchPlayer) {
                return 0;
            }

            return self.twitchPlayer.getDuration();
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

function twitchVideoIdFromUrl(url) {
    var segs = url.split("/videos/");
    if (segs.length >= 2) {
        return 'v' + segs[1].split("?")[0];
    }

    return url
}

function twitchClipVideoUrlFromUrl(url) {
    return url.split("?")[0];
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
