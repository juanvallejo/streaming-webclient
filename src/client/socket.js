/**
 * application socket utils, emitters, and listeners
 */

var Emitter = require('./proto/emitter.js');

function Socket(url) {
    var self = this;

    if (window.WebSocket === undefined) {
        return;
    }

    this.subscriptions = {};
    this.socket = new WebSocket(url || window.location.origin.replace(/^http\:/, "ws:") + "/ws" + window.location.pathname);

    // stores a SocketEvent with a evtName key
    // returns the pushed SocketEvent
    this.on = function(evtName, fn, params) {
        if (!self.callbacks[evtName]) {
            self.callbacks[evtName] = [];

            // subscribe to the netSocket event
            self.subscribe(evtName, (function(e) {
                return function() {
                    self.emit(e, arguments);
                }
            })(evtName));
        }
        return self.callbacks[evtName].push(fn);
    };

    this.subscribe = function(evtName, callback) {
        if (!self.subscriptions[evtName]) {
            self.subscriptions[evtName] = [];
        }

        self.subscriptions[evtName].push(callback);
    };

    this.socket.addEventListener("open", function() {
        self.emit("connect", []);
    });

    this.socket.addEventListener("close", function() {
        self.emit("disconnect", []);
    });

    this.socket.addEventListener("message", function(e) {
        try {
            var data = JSON.parse(e.data);
            if (!data.event) {
                self.emit("info", ["server sent malformed response: \"event\" field missing.", false]);
                return;
            }

            if (!self.subscriptions[data.event]) {
                self.emit("info", ["server sent unknown event: " + '"' + data.event + '"', false]);
                return;
            }

            for (var i = 0; i < self.subscriptions[data.event].length; i++) {
                self.subscriptions[data.event][i].apply(self.socket, [data.data]);
            }
        } catch(e) {
            self.emit("info", ["error parsing socket response from server: " + e.toString(), false]);
        }
    });

    this.socket.addEventListener("error", function(e) {
        self.emit("error", [e]);
    });

    // emits a socket message -> differs from this#emit
    // in that this method sends a network socket event
    this.send = function(netEvtName, data) {
        self.socket.send(JSON.stringify({
            "event": netEvtName,
            "data": data
        }));
    };

    this.getSocket = function() {
        return this.socket;
    };
}

Socket.prototype = new Emitter();

module.exports = Socket;