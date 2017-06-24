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
    this.ytVideoVolume = 50;
    this.ytElem = null;
    this.ytReadyCallbacks = [];
    this.ytPlayerReady = false;


    // ignores the actual HTMLEntity when adding
	// an event listener to this wrapper object.
	this.EVT_IGNORE_ELEM = true;

	// handlers
	this.defaultSubtitlesHandler = function(path, handler) {
        if (self.loadedData.kind != Cons.STREAM_KIND_LOCAL) {
        	handler('This type of stream does not support adding subtitles.');
        	return false;
        }

		if (!handler || typeof handler != 'function') {
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
        if (data.extra.kind == Cons.STREAM_KIND_YOUTUBE) {
            self.hidePlayer();
			self.showYtPlayer();
            self.loadYtVideo(youtubeVideoIdFromUrl(data.extra.url));
            self.pause();
            return;
        }

        self.pause();
        self.hideYtPlayer();
        self.showPlayer();
		self.video.src = Cons.STREAM_URL_PREFIX + data.extra.url;
	};

	this.play = function(time) {
		if (!self.loadedData) {
			console.log("WARN:", 'attempt to play video with no data loaded.');
			return;
		}

		if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
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

        if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
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

        if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
            self.seekYtVideo(time);
        }

		this.video.currentTime = time;
	};

	this.getTime = function() {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to get video info with no data loaded.');
            return;
        }

        if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
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

	this.increaseVolume = function(val) {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to set volume with no data loaded.');
            return;
        }

        if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
            self.ytVideoVolume += val;
        	self.setYtVideoVolume(self.ytVideoVolume);
        	return;
        }

        if (val > 1) {
            val /= 100;
        }

        self.video.volume = self.video.volume + val;
    };

	this.decreaseVolume = function(val) {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to set volume with no data loaded.');
            return;
        }

        if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
            self.ytVideoVolume -= val;
            self.setYtVideoVolume(self.ytVideoVolume);
            return;
        }

        if (val > 1) {
			val /= 100;
		}

        self.video.volume = self.video.volume - val;
    };

	this.setVolume = function(val) {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to set volume with no data loaded.');
            return;
        }

        if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
            self.ytVideoVolume = val;
            self.setYtVideoVolume(self.ytVideoVolume);
            return;
        }

        if (val > 1) {
        	val /= 100;
		}

        self.video.volume = val;
	};

	this.getDuration = function() {
        if (!self.loadedData) {
            console.log("WARN:", 'attempt to get video duration with no data loaded.');
            return;
        }

        if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
            return this.ytVideoInfo ? this.ytVideoInfo.duration : 0;
        }

		return this.duration;
	};

	// add event listeners
	this.on('loadedmetadata', function() {
		self.duration = self.video.duration;
		self.metadataLoaded = true;

        // send stream info to server
        self.emit('emitsocketdata', ['streamdata', {
        	duration: self.duration
		}]);
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
