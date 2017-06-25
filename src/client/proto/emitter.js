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