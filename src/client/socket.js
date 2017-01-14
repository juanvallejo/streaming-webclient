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