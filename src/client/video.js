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
		if (this.video) {
			return;
		}

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
				return;
			}
			outputHandler('The stream has not yet started. <span class="text-hl-name">Click to start it.</span>');
			canStartStream = true;
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