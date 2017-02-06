/**
 * handles local video streaming
 */

var Cons = require('./constants.js');
var Emitter = require('./proto/emitter.js');

function Video(videoElement) {
	var self = this;

	this.video = videoElement;
	this.duration = null;
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
		this.video.src = getStreamURLFromLocation(location.pathname);
	};

	this.appendTo = function(parent) {
		parent.appendChild(this.video);
	};

	this.play = function(time) {
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
		try {
			this.video.pause();
		} catch(e) {
			console.log('EXCEPT VIDEO PAUSE', e);
		}
	};

	this.setTime = function(time) {
		this.video.currentTime = time;
	};

	this.getTime = function() {
		return this.video.currentTime;
	};

	this.beginStream = function(socket) {
		socket.send('request_beginstream', {
			timer: self.savedTimer
		});
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
	});
};

Video.prototype = new Emitter();

function getStreamURLFromLocation(location) {
	return location.replace(/^\/v\//gi, '/s/');
}

module.exports = Video;
