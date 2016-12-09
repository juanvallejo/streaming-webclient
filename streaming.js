/**
 * Video streaming server
 */

var fs = require('fs');
var http = require('http');
var io = require('socket.io');

const APP_PORT = '8000';
const APP_HOST = '0.0.0.0';
const INDEX_FILE = 'index.html';
const SRC_ROOT = __dirname + '/videos';
const VALID_VIDEO_EXTS = [
	'mp4'
];

var mimeType = {
	'css': 'text/css',
	'gif': 'image/gif',
	'html': 'text/html',
	'ico': 'image/x-ico',
	'jpg': 'image/jpeg',
	'jpeg': 'image/jpeg',
	'json': 'application/json',
	'js': 'application/javascript',
	'mp4': 'video/mp4',
	'pl': 'text/plain',
	'png': 'image/png',
	'txt': 'text/plain'
};

var pages = {
	'home': '/',
	'videos': '/videos'
};

var socket = null;
var playback = null;

function Playback() {
	var self = this;

	this.isStarted = false;
	this.startedBy = null;
	this.isPaused = false;
	this.timer = 1;

	// begin playback and playback timer
	this.start = function(client, resumeTime) {
		if (!client) {
			throw "EXCEPT no client handler provided when trying to start playback.";
		}

		if (this.isStarted) {
			return;
		}

		if (resumeTime) {
			this.timer = resumeTime;
		}

		this.isStarted = true;
		this.startedBy = client.id;
		this.isPaused = false;

		// increase playback timer every second
		setTimeout(function t() {
			self.increase(1, 1000, function(increment, timeout, callback) {
				if (self.timer % 60 == 0 && self.timer > 0) {
					console.log('INFO', 'sending streamsync command');
					socket.broadcastAll(null, 'streamsync', {
						timer: this.timer
					});
				}
				this.increase.call(this, increment, timeout, callback);
			});
		}, 1000);
	};

	this.increase = function(increment, timeout, callback) {
		if (!this.isPaused) {
			console.log(self.timer);
			self.timer += (increment || 1);
		}

		if (!timeout || !callback) {
			return;
		}

		setTimeout(function() {
			callback.call(self, increment, timeout, callback);
		}, timeout);
	};
}

function Socket(io) {
	if (!io) {
		throw "EXCEPT Socket object initialized without a socket handler.";
	}

	this.clients = [];
	this.events = {};
	this.socket = io;

	this.addClient = function(client) {
		this.clients.push(client);
	};

	this.removeClient = function(client) {
		for (var i = 0; i < this.clients.length; i++) {
			if (this.clients[i].id == client.id) {
				this.clients.splice(i, 1);
			}
		}
	};

	this.getClientById = function(clientId) {
		for (var i = 0; i < this.clients.length; i++) {
			if (this.clients[i].id == clientId) {
				return this.clients[i];
			}
		}
	};

	// broadcasts event data to a specific client
	this.broadcastTo = function(client, eventName, data) {
		if (!client) {
			return;
		}

		if (typeof client === 'object') {
			client.emit(eventName, data);
			return;
		}

		var c = this.getClientById(client);
		if (c) {
			return c.emit(eventName, data);
		}

	};

	// broadcasts event data from one client to the rest
	this.broadcastFrom = function(client, eventName, data) {
		client.broadcast.emit(eventName, data);
	};

	// broadcasts data to all clients
	this.broadcastAll = function(client, eventName, data) {
		if (!client) {
			client = this.clients[0];
		}
		if (!client) {
			return;
		}
		this.broadcastFrom(client, eventName, data);
		this.broadcastTo(client, eventName, data);
	};

	this.getSize = function() {
		return this.clients.length;
	};

	this.on = function(eventName, callback) {
		if (!this.events[eventName]) {
			this.events[eventName] = [];
		}

		this.events[eventName].push(callback);
	};

	this.emit = function(eventName, params) {
		if (!this.events[eventName]) {
			return;
		}

		for (var i = 0; i < this.events[eventName].length; i++) {
			this.events[eventName][i].apply(this, params || []);
		}
	};
}

function addSocketEvents() {
	socket.on('request_playbackstatus', function(client, data) {
		console.log('INFO client', client.id, 'requested playback status', data);
		socket.broadcastTo(client, 'playbackstatus', {
			location: data.location,
			playback: {
				startedBy: playback.startedBy,
				timer: playback.timer,
				isPaused: playback.isPaused,
				isStarted: playback.isStarted
			}
		});
	});

	socket.on('request_beginstream', function(client, data) {
		console.log('INFO client', client.id, 'requested to begin the stream');

		// if client sent saved timer, only broadcast to that client.
		// chances are that every separate client will request this.
		if (data && data.timer) {
			playback.start(client, parseInt(data.timer));
			socket.broadcastTo(client, 'beginstream', {
				timer: parseInt(data.timer) || 0
			});
			return;
		}

		playback.start(client);
		socket.broadcastAll(client, 'beginstream', {
			timer: 0
		});
	});

	socket.on('request_streamsync', function(client) {
		console.log('INFO client', client.id, 'requested a stream sync');
		socket.broadcastAll(client, 'streamsync', {
			timer: playback.timer
		});

	});
}

function serveIndex(page, req, res) {
	fs.readFile(__dirname + '/' + (page ? page + '.html' : INDEX_FILE), function(err, data) {
		if (err) {
			res.writeHead(500);
			res.end('<div class="center middle">Unable to load page.<br />' + err.toString() + '</div>');
			return console.log('ERR', 'Could not serve static index file "' + INDEX_FILE + '"', err);
		}

		res.writeHead(200, {
			'Content-Type': 'text/html'
		});
		res.end(data);
	});
}

// resolves a request url and returns a handler function
// if one exists for the matched path, or null otherwise
function pathResolver(req) {
	var path = req.url;
	if (path.match(/^\/static\/.*/gi)) {
		return staticHandler;
	}
	if (path.match(/^\/s(tream)?.*/gi)) {
		return streamHandler;
	}
	if (path.match(/^\/v(ideo)?.*/gi)) {
		return videoHandler;
	}
	if (path.match(/^\/v(ideos)?.*/gi)) {
		return videoPageHandler;
	}
	return null;
}

var app = http.createServer(function(req, res) {
	var pathHandler = pathResolver(req);
	if (pathHandler) {
		return pathHandler(req, res);
	}

	res.end('Hello world');
});

console.log('INFO', 'Listening on port', APP_PORT);
app.listen(APP_PORT);

io.listen(app).on('connection', function(client) {
	if (!socket) {
		socket = new Socket(io);
		addSocketEvents();
	}
	if (!playback) {
		playback = new Playback();
	}

	console.log('INFO', 'client has connected', client.id);
	socket.addClient(client);
	socket.broadcastFrom(client, 'info_clientjoined', {
		id: client.id
	});
	socket.emit('request_playbackstatus', [client, {}]);

	client.on('request_playbackstatus', function(data) {
		socket.emit('request_playbackstatus', [client, data]);
	});

	client.on('request_beginstream', function(data) {
		socket.emit('request_beginstream', [client, data]);
	});

	client.on('request_streamsync', function() {
		socket.emit('request_streamsync', [client]);
	});

	client.on('disconnect', function() {
		socket.removeClient(client);
		socket.broadcastAll(null, 'info_clientleft', {
			id: client.id
		});
	});
});

function staticHandler(req, res) {
	var file = req.url;
	var ext = getFileExtension(file);
	fs.readFile(__dirname + '/' + file, function(err, data) {
		if (err) {
			res.writeHead(404);
			return res.end('File not found.');
		}

		res.writeHead(200, {
			'Content-Type': getFileMime(file)
		});
		res.end(data);
	});
}

// handle /stream/* paths
function streamHandler(req, res) {
	var pathFragments = req.url.split('/');
	var fileFragment = pathFragments[pathFragments.length - 1];
	var extension = getFileExtension(fileFragment);

	// grab last fragment and determine if it is a file
	if (isVideoFile(extension)) {
		if (!isStreamFileExtensionValid(extension)) {
			return res.end('500: Unsupported file extension.');
		}
		return streamFileHandler(req, res, fileFragment);
	}

	redirectRequest(req, res, getPathForPage('videos'));
}

// handle individual video files
function streamFileHandler(req, res, fileFragment) {
	var filePath = SRC_ROOT + '/' + fileFragment;
	fs.stat(filePath, function(err, stats) {
		if (err) {
			if (err.code === 'ENOENT') {
				res.writeHead(404);
				return res.end('404: File "' + fileFragment + '" not found.');
			}
			res.writeHead(500);
			return res.end('500: Internal server error: ' + err.toString());
		}

		var contentRange = req.headers.range;
		if (!contentRange) {
			res.writeHead(416);
			return res.end('416: Invalid range.');
		}

		var positions = contentRange.replace(/bytes=/gi, '').split('-');
		var start = parseInt(positions[0], 10);
		var total = stats.size;
		var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
		var chunkSize = (end - start) + 1;

		if (start > end) {
			res.writeHead(416);
			return res.end('416: Invalid range.');
		}

		res.writeHead(206, {
			'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
			'Accept-Ranges': 'bytes',
			'Content-Length': chunkSize,
			'Content-Type': getFileMime(fileFragment)
		});

		var stream = fs.createReadStream(filePath, {
			start: start,
			end: end
		});
		stream.on('open', function() {
			stream.pipe(res);
		});
		stream.on('error', function(err) {
			console.log('ERR STREAM', err.toString());
			res.end(err.toString());
		});

	});
}

function isVideoFile(extension) {
	if (mimeType.hasOwnProperty(extension)) {
		return true;
	}
	return false;
}

// handle /stream/* paths
function videoHandler(req, res) {
	var pathFragments = req.url.split('/');
	var fileFragment = pathFragments[pathFragments.length - 1];
	var extension = getFileExtension(fileFragment);

	// grab last fragment and determine if it is a file
	if (isVideoFile(extension)) {
		return videoFileHandler(req, res, fileFragment);
	}

	redirectRequest(req, res, getPathForPage('videos'));
}

function videoFileHandler(req, res, fileFragment) {
	serveIndex('video', req, res);
}

function videoPageHandler(req, res) {
	res.end('Unfinished endpoint.');
}

function isStreamFileExtensionValid(extension) {
	for (var i = 0; i < VALID_VIDEO_EXTS.length; i++) {
		if (VALID_VIDEO_EXTS[i] == extension) {
			return true;
		}
	}
	return false;
}

function getPathForPage(page) {
	return pages[page] || '/';
}

function getFileMime(fragment) {
	var ext = getFileExtension(fragment);
	return mimeType[ext];
}

function getFileExtension(fragment) {
	var ext = fragment.split('.');
	return ext[ext.length - 1];
}

function redirectRequest(req, res, destination) {
	res.writeHead(302, {
		'Location': destination || '/'
	});
	res.end('Redirecting....');
}