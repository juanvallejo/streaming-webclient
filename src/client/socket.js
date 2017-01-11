/**
 * application socket utils, emitters, and listeners
 */

// stores callback function data to be called on Socket#emit
function SocketEvent(fn, params) {
	this.callback = fn || function() {};
	this.params = params || [];
	this.ctx = this;

	this.call = function(params) {
		this.setParams(params || []);
		this.callback.apply(this.ctx || this, this.params);
	};
	this.set = function(fn, params) {
		this.callback = fn;
		this.params = params;
	};

	this.setCallback = function(fn) {
		this.callback = fn;
	};

	// sets the event's params to the speficied array
	// or appends the specified array to an existing
	// array of previously specified params.
	this.setParams = function(params) {
		if (this.params && this.params.length) {
			for (var i = 0; i < params; i++) {
				this.params.push(params[i]);
			}
			return;
		}
		this.params = params;
	};

	this.bind = function(ctx) {
		this.ctx = ctx;
	};
};

// a list structure for SocketEvent objects
function SocketEventList() {
	this.socket_events = [];

	// appends a new SocketEvent to the end of the list
	// returns the newly added SocketEvent.
	this.push = function(socketEvent) {
		this.socket_events.push(socketEvent);
		return socketEvent;
	};

	// iterates through every socket event and calls each one
	this.callAll = function(params) {
		params = params || [];
		for (var i = 0; i < this.socket_events.length; i++) {
			this.socket_events[i].call(params);
		}
	};
}

function Socket(url) {
	var self = this;

	this.socket = io.connect(url || window.location.origin);

	// map['evtName']->SocketEventList
	this.callbacks = {};

	// iterates through every stored function for an evtName
	// and calls the function with stored params
	this.emit = function(evtName, params) {
		if (!this.callbacks[evtName]) {
			return;
		}

		var evtList = this.callbacks[evtName];
		evtList.callAll(params);
	};

	// stores a SocketEvent with a evtName key
	// returns the pushed SocketEvent
	this.on = function(evtName, fn, params) {
		if (!this.callbacks[evtName]) {
			this.callbacks[evtName] = new SocketEventList();

			// subscribe to the netSocket event
			this.socket.on(evtName, (function(evtName) {
				return function(args) {
					if (evtName == 'chatmessage') {
						console.log(arguments);
					}
					self.emit(evtName, arguments);
				}
			})(evtName));
		}
		return this.callbacks[evtName].push(new SocketEvent(fn, params));
	};

	// emits a socket message -> differs from this#emit
	// in that this method sends a network socket event
	this.send = function(netEvtName, data) {
		this.socket.emit(netEvtName, data);
	};
}

module.exports = Socket;