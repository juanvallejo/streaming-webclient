/**
 * handles local video streaming
 */

var Cons = require('./constants.js');
var Emitter = require('./proto/emitter.js');

function Video(videoElement, sTrackElement) {
	var self = this;

	this.loadedData = null;
	this.ytElem = null;
	this.video = videoElement;
	this.duration = null;
	this.savedTimer = null;
	this.sourceFileError = null;
	this.alertShown = false;
	this.canStartStream = false;
	this.metadataLoaded = false;
	this.subtitlesTrack = sTrackElement;
	this.subtitlesTrackActivated = false;

	// ignores the actual HTMLEntity when adding
	// an event listener to this wrapper object.
	this.EVT_IGNORE_ELEM = true;

	// handlers
	this.defaultSubtitlesHandler = function(path, handler) { 
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
		this.ytElem.style.display = 'none';
	};

	this.showYtPlayer = function() {
        this.ytElem.style.display = 'block';
	};

	this.onYtPlayerReady = function(evt) {

	};

	this.onYtPlayerStateChange = function(evt) {

	};

	this.loadYtVideo = function(frame, videoId) {
		frame.contentWindow.postMessage(JSON.stringify({
			'event': 'command',
			'func': 'loadVideoById',
			'args': [videoId, 0, 'large']
		}), "*")
	};

	this.seekYtVideo = function(frame, time) {
		console.log("paring bfsd", time);
        frame.contentWindow.postMessage(JSON.stringify({
            'event': 'command',
            'func': 'seekTo',
            'args': [time, "true"]
        }), "*")
	};

	this.playYtVideo = function(frame) {
        frame.contentWindow.postMessage(JSON.stringify({
            'event': 'command',
            'func': 'playVideo',
            'args': []
        }), "*")
	};

    this.pauseYtVideo = function(frame) {
        frame.contentWindow.postMessage(JSON.stringify({
            'event': 'command',
            'func': 'pauseVideo',
            'args': []
        }), "*")
    };

    this.initYtPlayer = function(YT, ytElem) {
        this.ytPlayer = new YT.Player(ytElem, {
            width: '100%',
            height: '100%',
            events: {
                'onReady': self.onYtPlayerReady,
                'onStateChange': self.onYtPlayerStateChange
            }
        });
        this.ytElem = this.ytPlayer.getIframe();
		this.hideYtPlayer();
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

	this.appendTo = function(parent) {
		parent.appendChild(this.video);
	};

	this.load = function(data) {
		this.pause();

		self.loadedData = data.extra;
        if (data.extra.kind == Cons.STREAM_KIND_YOUTUBE) {
            this.hidePlayer();
            this.showYtPlayer();
        	this.loadYtVideo(self.ytPlayer.getIframe(), youtubeVideoIdFromUrl(data.extra.url))
			return;
        }

        this.hideYtPlayer();
        this.showPlayer();
		this.video.src = "/s/" + data.extra.url;
	};

	this.play = function(time) {
		if (!self.loadedData) {
			console.log("WARN:", 'attempt to play video with no data loaded.');
			return;
		}

		if (self.loadedData.kind == Cons.STREAM_KIND_YOUTUBE) {
			this.playYtVideo(self.ytPlayer.getIframe());
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
            this.pauseYtVideo(self.ytPlayer.getIframe());
            return;
        }

		try {
			this.video.pause();
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
            this.seekYtVideo(self.ytPlayer.getIframe(), time);
            return;
        }

		this.video.currentTime = time;
	};

	this.getTime = function() {
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

	this.getDuration = function() {
		return this.duration;
	};

	// add event listeners
	this.on('loadedmetadata', function() {
		self.duration = self.video.duration;
		self.metadataLoaded = true;
	});
};

Video.prototype = new Emitter();

function getStreamURLFromLocation(location) {
	return location.replace(/^\/v\//gi, '/s/');
}

function youtubeVideoIdFromUrl(url) {
	return url.split("watch?v=")[1].split("&")[0]
}

module.exports = Video;
