/**
 * Retrieve information details and statistics
 * about the current connection with the server
 */

function Conn() {
	var self = this;

	this.has_init = false;
	this.pings = [];

	this.timeout_lim_fn = null;
	this.timeout_int_fn = null;

	// timeout for the total limit between each latency calculation
	this.timeout_lim = 1000 * 60;
	// amount of pings to send per timeout_lim
	this.timeout_int = 10;

	// initializes a metrics loop that emits and receives a ping from
	// the current socket connection. Latency is measured by taking
	// the mean value of 10 * (time.pingSent - time.pongReceived)
	// over a perdiod of ten seconds (one ping is sent every 6 seconds).
	this.initLatencyMetrics = function(socket) {
		this.has_init = true;

		// send a ping to the server every (timeout_lim / timeout_int) seconds.
		this.timeout_int_fn = setTimeout(function() {
			socket.emit('request_metrics_ping');
			socket.on('metrics_pong', (function() {
				// begin timer for pong response
				var pingTime = 0;
				var t = setTimeout(function t_fn() {
					pingTime++;
					clearTimeout(t);
					t = setTimeout(t_fn, 1000);
				}, 1000);

				return function() {
					clearTimeout(t);
					self.pings.push(pingTime);
				};
			})());
		}, this.timeout_lim / this.timeout_int);

		// reset this.pings every this.timeout_lim seconds
		// to recalculate a new average
		this.timeout_lim_fn = setTimeout(function() {
			self.pings = [];
		}, this.timeout_lim);
	};

	this.getMeanLatency = function() {
		if(!this.has_init) {
			throw "EXCEPT connection.js attempted to retrieve mean latency without first initializing the module.";
		}

		return this.getPingsAverage();
	};

	// iterates through all ping value responses and returns the average
	// result by adding each ping value and dividing by this.pings.length.
	this.getPingsAverage = function() {
		if(!this.pings.length) {
			return this.pings.length;
		}

		var total = 0;
		for(var i = 0; i < this.pings.length; i++) {
			total += this.pings[i];
		}
		return total / this.pings.length;
	};
};


module.exports = Conn;