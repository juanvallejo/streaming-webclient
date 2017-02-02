/**
 * Video streaming server
 */

var fs = require('fs');
var http = require('http');
var io = require('socket.io');

const APP_PORT = '8000';
const APP_HOST = '0.0.0.0';
const BASE_DIR = __dirname + '/src/static/'
const INDEX_FILE = __dirname + '/src/static/index.html';
const SRC_ROOT = __dirname + '/videos';
const SUBS_ROOT = __dirname + '/src/static/subtitles';
const VALID_VIDEO_EXTS = [
	'mp4',
	'avi'
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
	'avi': 'video/avi',
	'pl': 'text/plain',
	'png': 'image/png',
	'srt': 'text/plain',
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
	this.isPaused = true;
	this.timer = 1;
	this.timeout = null;
	this.increaseTimeout = null;

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
		clearTimeout(this.timeout);
		this.timeout = setTimeout(function t() {
			self.increase(1, 1000, function(increment, timeout, callback) {
				if (self.timer % 60 == 0 && self.timer > 0) {
					console.log('INFO', 'sending streamsync command to', socket.getSize(), 'clients.');
					socket.broadcastAll(null, 'streamsync', {
						timer: this.timer,
						playback: playback.getStatus()
					});
				}
				this.increase.call(this, increment, timeout, callback);
			});
		}, 1000);
	};

	this.getStatus = function() {
		return {
			startedBy: self.startedBy,
			timer: self.timer,
			isPaused: self.isPaused,
			isStarted: self.isStarted
		};
	};

	this.increase = function(increment, timeout, callback) {
		if (!this.isPaused) {
			console.log(self.timer);
			self.timer += (increment || 1);
		}

		if (!timeout || !callback) {
			return;
		}

		clearTimeout(this.increaseTimeout);
		this.increaseTimeout = setTimeout(function() {
			callback.call(self, increment, timeout, callback);
		}, timeout);
	};

	this.pause = function() {
		this.isPaused = true;
	};

	this.play = function() {
		this.isPaused = false;
	};

	this.stop = function() {
		this.isPaused = true;
		this.timer = 1;
	};

	this.reset = function() {
		this.timer = 1;
	};

	this.setTimer = function(time) {
		this.timer = time || this.timer;
	};
}

function SocketCommand(name, shortDesc) {
	if (!name || !shortDesc) {
		throw "FATAL: SocketCommand requires a name and a short description."
	}

	this.name = name;
	this.desc = shortDesc;
	this.longDesc = shortDesc;
	this.usage = '';

	this.getName = function() {
		return this.name;
	};

	this.getDescription = function() {
		return this.desc;
	};

	this.getLongDescription = function() {
		return this.longDesc;
	};

	this.run = function(socket, client, args, data, callback) {
		if (!client || !args) {
			return 'Invalid command implementation.';
		}
		if (!callback || typeof callback != 'function') {
			return false;
		}

		var output = 'This command has not yet been implemented.';
		callback.call(this, null, 'This command has not yet been implemented.');
		return 'This command has not yet been implemented.';
	};

	this.getUsageText = function() {
		return convertHTMLEntities(this.usage) || 'Usage: ' + this.name;
	};
}

function Socket(io) {
	if (!io) {
		throw "EXCEPT Socket object initialized without a socket handler.";
	}

	var self = this;

	// determine if garbage collector started
	this.hasGC = false;
	this.GCPingTimeout = {};
	this.GCTimeout = null;
	this.GCMaxPingTimeout = 10000;

	this.commands = [];

	this.clients = [];
	this.clientAliases = {};
	this.events = {};
	this.socket = io;
	this.reservedAliases = [
		'system',
		'juan',
		'alux'
	];

	this.addClient = function(client) {
		this.clients.push(client);
	};

	this.getClients = function(outputTransform) {
		if (!outputTransform || typeof outputTransform != 'function') {
			return this.clients;
		}
		var transformed = [];
		for (var i = 0; i < this.clients.length; i++) {
			transformed.push(outputTransform(this.clients[i]));
		}
		return transformed;
	};

	this.removeClient = function(client) {
		if (this.clientAliases[client.id]) {
			delete this.clientAliases[client.id];
		}
		for (var i = 0; i < this.clients.length; i++) {
			if (this.clients[i].id == client.id) {
				this.clients.splice(i, 1);
			}
		}
	};

	this.removeClientById = function(clientId) {
		if (!clientId) {
			return;
		}
		if (this.clientAliases[client.id]) {
			delete this.clientAliases[client.id];
		}
		for (var i = 0; i < this.clients.length; i++) {
			if (this.clients[i].id == clientId) {
				this.clients.splice(i, 1);
				return true;
			}
		}
		return false;
	};

	this.getSocket = function() {
		return this.socket;
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

	this.registerCommand = function(socketCommand) {
		this.commands.push(socketCommand);
	};

	this.commandExists = function(cmdName) {
		return this.getCommandByName(cmdName);
	};

	this.getCommandByName = function(cmdName) {
		for (var i = 0; i < this.commands.length; i++) {
			if (this.commands[i].getName() == cmdName) {
				return this.commands[i];
			}
		}
	};

	this.executeCommand = function(client, data, cmdName, args) {
		console.log('INFO', 'executing command', cmdName, 'with args', args);
		var command = this.getCommandByName(cmdName);
		if (!command || !command.run || !(typeof command.run == 'function')) {
			return false;
		}

		var output = command.run(this, client, args, data);
		if (output) {
			this.broadcastSystemMessageTo(client, output);
		}
		return true;
	};

	this.getCommands = function() {
		return this.commands;
	};

	// handle commands sent by a client
	this.handleCommandMessage = function(client, data) {
		var cmd = data.message.split('/');
		if (!cmd || !cmd.length || cmd.length > 2) {
			this.broadcastSystemMessageTo(client, 'Invalid command "' + data.message + '"');
			return;
		}

		var cmdSlice = cmd[1].split(' ');
		var cmdName = cmdSlice.splice(0, 1);
		if (!this.executeCommand(client, data, cmdName, cmdSlice)) {
			this.broadcastSystemMessageTo(client, 'That command does not exist.');
		}
	};

	this.isDuplicateUsername = function(username) {
		for (var i = 0; i < this.clients.length; i++) {
			if (username == this.clients[i].id) {
				return true;
			}
		}
		for (var i in this.clientAliases) {
			if (this.clientAliases[i][1] && username.toLowerCase() == this.clientAliases[i][1].toLowerCase()) {
				return true;
			}
		}
		return false;
	};

	this.isReservedUsername = function(username) {
		for (var i = 0; i < this.reservedAliases.length; i++) {
			if (username.toLowerCase() == this.reservedAliases[i].toLowerCase()) {
				return true;
			}
		}
		return false;
	};

	this.getLastUsernameForClient = function(client) {
		if (!this.clientAliases[client.id]) {
			return client.id;
		}
		return this.clientAliases[client.id][0];
	};

	this.getUsernameForClient = function(client) {
		if (!this.clientAliases[client.id]) {
			return client.id;
		}
		return this.clientAliases[client.id][1] || this.clientAliases[client.id][0] || client.id;
	};

	// updates the clien's current alias
	this.updateUsernameForClient = function(client, data) {
		var username = data.user;
		var forcedUpdate = false;
		if (this.getUsernameForClient(client) == username) {
			this.broadcastErrorTo(client, 'You already have this username.');
			return false;
		}
		if (this.isDuplicateUsername(username)) {
			if (data.forced) {
				for (var i in this.clientAliases) {
					if (this.clientAliases[i][1] && this.clientAliases[i][1] == username) {
						forcedUpdate = true;
						console.log('INFO', 'forcing username update ("' + username + '") for', client.id);

						// if forced update, there is a high chance that original client with that
						// username does not exist. Attempt to clean up list by deleting old client.
						this.removeClientById(i);
						break;
					}
				}
			}
			if (!forcedUpdate) {
				this.broadcastErrorTo(client, 'That username is already taken.');
				return false;
			}
		}
		if (this.isReservedUsername(username) && !data.force) {
			this.broadcastErrorTo(client, 'You may not use that username.');
			return false;
		}

		if (!this.clientAliases[client.id]) {
			this.clientAliases[client.id] = [client.id];
			this.clientAliases[client.id].push(data.user);
		}

		this.clientAliases[client.id][0] = this.clientAliases[client.id][1] || 'Anonymous';
		this.clientAliases[client.id][1] = data.user;

		return true;
	};

	// sends a general app error to a client (is not concerned with chat)
	this.broadcastErrorTo = function(client, errorMsg) {
		socket.broadcastTo(client, 'info_clienterror', {
			error: errorMsg,
			system: true
		});
	};

	// sends a system chat message to a client
	this.broadcastSystemMessageTo = function(client, systemMsg) {
		this.broadcastTo(client, 'chatmessage', {
			user: 'system',
			message: systemMsg,
			system: true
		});
	};

	// sends a system chat message from a specific client
	this.broadcastSystemMessageFrom = function(client, systemMsg) {
		this.broadcastFrom(client, 'chatmessage', {
			user: 'system',
			message: systemMsg,
			system: true
		});
	};

	// sends a system chat message to all clients
	this.broadcastSystemMessageAll = function(client, systemMsg) {
		this.broadcastAll(client, 'chatmessage', {
			user: 'system',
			message: systemMsg,
			system: true
		});
	};

	// receives a user data object and replaces all of the image URLs in its message field with empty strings.
	// an additional .images field is added to the user data object.
	this.replaceMessageImageURL = function(data) {
		console.log('CHAT FORMAT', 'parsing all images in user message...', data.message);
		data.images = data.message.match(/((http(s)?)([^ ]+)\.(png|gif|jpeg|jpg))/gi);
		data.message = data.message.replace(/((http(s)?)([^ ]+)\.(png|gif|jpeg|jpg))/gi, '');
	};

	// receives a user data object and replaces all of the youtube video URLs in its message field with empty strings.
	// an additional .videos field is added to the user data object
	this.replaceMessageVideoLink = function(data) {
		console.log('CHAT FORMAT', 'parsing videos in user message...', data.message);
		data.videos = data.message.match(/(http(s)?)([^\ ]+)(youtu(be)?)+\.(com|be)([^\ ]+)/gi);
		data.message = data.message.replace(/(http(s)?)([^\ ]+)(youtu(be)?)+\.(com|be)([^\ ]+)/gi, '');
	};

	// broadcasts a command to the client's chat handler
	this.broadcastChatActionTo = function(client, methodName, args) {
		socket.broadcastTo(client, 'chatmethodaction', {
			method: methodName,
			args: args || []
		});
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

	// init garbage collector for clients
	this.initGC = function() {
		if (this.hasGC) {
			return;
		}

		console.log('INFO', 'initialized garbage collector for socket handler.');

		this.hasGC = true;
		clearTimeout(this.GCTimeout);
		this.GCTimeout = setTimeout(function GC() {
			console.log('INFO', 'sending GC ping to', self.clients.length, 'clients.');
			for (var i = 0; i < self.clients.length; i++) {
				clearTimeout(self.GCPingTimeout[self.clients[i].id]);
				self.GCPingTimeout[self.clients[i].id] = setTimeout(function(index) {
					return function() {
						if (!index || !self.clients[index]) {
							console.log('ERR GC invalid index.');
							return;
						}
						console.log('INFO', self.clients[index].id, ' connection timed out. Closing connection.');
						self.removeClient(self.clients[index]);
					}
				}(i), self.GCMaxPingTimeout);
				self.clients[i].emit('system_ping');
			}

			clearTimeout(this.GCTimeout);
			this.GCTimeout = setTimeout(GC, 60 * 1000);
		}, 60 * 1000);
	};
}

function addSocketCommands() {
	var helpCmd = new SocketCommand('help', 'displays this output');
	helpCmd.usage = 'Usage: /help';
	helpCmd.run = function(socket, client, args) {
		var commands = socket.getCommands();
		var output = 'Commands help:<br />';
		for (var i = 0; i < commands.length; i++) {
			output += ('<br /><span class="text-hl-name">' + commands[i].getName() + '</span>: ' + commands[i].getDescription());
		}
		return output;
	};
	socket.registerCommand(helpCmd);

	var streamCmd = new SocketCommand('stream', 'controls the stream playback (pause|play|stop)');
	streamCmd.usage = 'Usage: /stream (pause|play|stop|subtitles <on|off>)';
	streamCmd.run = function(socket, client, args, data) {
		if (!args.length) {
			return this.getUsageText();
		}

		if (args[0] == 'pause') {
			playback.pause();
			socket.broadcastAll(client, 'streamsync', {
				timer: playback.timer,
				playback: playback.getStatus()
			});
			return 'Pausing stream...';
		}
		if (args[0] == 'stop') {
			playback.stop();
			playback.isStarted = false;
			socket.broadcastAll(client, 'streamsync', {
				timer: playback.timer,
				playback: playback.getStatus()
			});
			return 'Stopping stream...';
		}
		if (args[0] == 'play') {
			playback.play();
			socket.broadcastAll(client, 'streamsync', {
				timer: playback.timer,
				playback: playback.getStatus()
			});
			return 'Playing stream...';
		}
		if (args[0] == 'reset') {
			playback.reset();
			socket.broadcastAll(client, 'streamsync', {
				timer: playback.timer,
				playback: playback.getStatus()
			});
			return 'Resetting stream...';
		}

		// subtitles handler
		if (args[0] == 'subtitles') {
			return 'This command does not yet work on your browser.';
			if (!data || !data.location) {
				return 'The client sent incomplete command data.';
			}
			if (!args[1] || (args[1] != 'on' && args[1] != 'off')) {
				return convertHTMLEntities('This sub-command only takes "on" or "off" as arguments.');
			}
			if (args[1] == 'on') {
				var sfile = (data.location.pathname.replace(/^\/v\//gi, '')) + '.srt';
				fs.stat(SUBS_ROOT + '/' + sfile, function(err, stats) {
					if (err) {
						if (err.code === 'ENOENT') {
							socket.broadcastSystemMessageTo(client, 'Error loading subtitles file.');
							return;
						}
						socket.broadcastSystemMessageTo(client, 'Unexpected error loading subtitles file.');
						return;
					}
					socket.broadcastTo(client, 'info_subtitles', {
						path: '/static/subtitles/' + sfile,
						on: true
					});
				});
				return 'Attempting add subtitles to your stream...';
			}

			socket.broadcastTo(client, 'info_subtitles', {
				path: null,
				on: false
			});
			return 'Subtitles have been turned off for your stream.';
		}

		return this.getUsageText();
	};
	socket.registerCommand(streamCmd);

	var userCmd = new SocketCommand('user', 'controls user settings');
	userCmd.usage = 'Usage: /user (name <username>|list)';
	userCmd.run = function(socket, client, args) {
		if (!args.length) {
			return this.getUsageText();
		}

		if (args[0] == 'name') {
			if (!args[1]) {
				return convertHTMLEntities('Usage: /user (name <username>)');
			}
			socket.emit('request_updateusername', [client, {
				id: client.id,
				user: args[1],
				force: args[2]
			}]);
			return 'Attempting to update username to "' + args[1] + '"...';
		}

		if (args[0] == 'list') {
			var users = [];
			for (var i = 0; i < socket.getSize(); i++) {
				users.push(socket.getUsernameForClient(socket.getClients()[i]));
			}
			return 'All users in the chat:<br /><br />' + (users.join('<br />'));
		}

		return this.getUsageText();
	};
	socket.registerCommand(userCmd);

	var whoamiCmd = new SocketCommand('whoami', 'prints your current username');
	whoamiCmd.run = function(socket, client, args) {
		return socket.getUsernameForClient(client);
	};
	socket.registerCommand(whoamiCmd);

	var clearCmd = new SocketCommand('clear', 'clears all messages from the chat window');
	clearCmd.run = function(socket, client, args) {
		socket.broadcastChatActionTo(client, 'clearView');
		return 'Clearing chat window messages...';
	};
	socket.registerCommand(clearCmd);
}

function convertHTMLEntities(text) {
	return text.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
};

function addSocketEvents() {
	socket.on('system_ping', function(client) {
		console.log('INFO', 'received ping from client', client.id, '... keeping connection alive.', socket.getClients(function(client) {
			return client.id;
		}));
		clearTimeout(socket.GCPingTimeout[client.id]);
	});

	socket.on('request_beginstream', function(client, data) {
		console.log('INFO client', client.id, 'requested to begin the stream');

		// if client sent saved timer, only broadcast to that client.
		// chances are that every separate client will request this.
		if (data && data.timer) {
			console.log('INFO', 'client', client.id, 'requested stream to begin at time', data.timer, parseInt(data.timer) || 0);

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
			timer: playback.timer,
			playback: playback.getStatus()
		});

	});

	socket.on('request_chatmessage', function(client, data) {
		console.log('INFO client', client.id, 'requested a chat message broadcast with name', data.user);
		if (isChatCommand(data.message)) {
			socket.handleCommandMessage(client, data);
			return;
		}
		if (canReplaceImage(data.message)) {
			socket.replaceMessageImageURL(data);
		}
		if (canReplaceVideo(data.message)) {
			socket.replaceMessageVideoLink(data);
		}
		socket.broadcastAll(client, 'chatmessage', data);
	});

	socket.on('request_updateusername', function(client, data) {
		var oldUsername = socket.getLastUsernameForClient(client);
		console.log('INFO client', client.id, 'requested a username update', oldUsername + '->' + data.user);

		if (!socket.updateUsernameForClient(client, data)) {
			console.log('INFO failed to update username for', client.id);
			return;
		}

		// if old username == client.id, client is new to the chat
		if (oldUsername == client.id) {
			socket.broadcastSystemMessageFrom(client, (data.user || client.id) + ' has joined the chat.');
		} else {
			socket.broadcastSystemMessageFrom(client, (oldUsername || client.id) + ' is now known as ' + (data.user || client.id));
		}

		socket.broadcastTo(client, 'updateusername', data);
		socket.broadcastAll(client, 'info_updateusername', {
			id: client.id,
			user: data.user,
			oldUser: oldUsername
		});
	});
}

// returns true if there is a youtube video URL in a user message
// and the video URL does not begin with a '\'
function canReplaceVideo(message) {
	var match = message.match(/(http(s)?)([^\ ]+)(youtu(be)?)+\.(com|be)([^\ ]+)/gi);
	return (match && match[0][0] != '\\');
}

// returns true if there is an image URL contained in a user message
// and the image URL does not begin with a '\'
function canReplaceImage(message) {
	var match = message.match(/(http(s)?)(.*)\.(png|gif|jpeg|jpg)/gi);
	return (match && match[0][0] != '\\');
}

function isChatCommand(cmd) {
	return cmd && cmd[0] == '/';
}

function serveIndex(page, req, res, errCode, err) {
	fs.readFile((page ? BASE_DIR + page + '.html' : INDEX_FILE), function(err, data) {
		if (err) {
			res.writeHead(errCode);
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
	if (path.match(/^\/src\/static\/.*/gi)) {
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

	serveIndex('index', req, res, 404);
});

console.log('INFO', 'Listening on port', APP_PORT);
app.listen(APP_PORT);

io.listen(app).on('connection', function(client) {
	if (!socket) {
		socket = new Socket(io);
		socket.initGC();
		addSocketEvents();
		addSocketCommands();
	}
	if (!playback) {
		playback = new Playback();
	}

	console.log('INFO', 'client has connected', client.id, (socket.getSize() + 1), 'total clients.');
	socket.addClient(client);
	socket.broadcastFrom(client, 'info_clientjoined', {
		id: client.id
	});

	socket.emit('request_streamsync', [client, {}]);

	client.on('request_beginstream', function(data) {
		socket.emit('request_beginstream', [client, data]);
	});

	client.on('request_streamsync', function() {
		socket.emit('request_streamsync', [client]);
	});

	client.on('request_chatmessage', function(data) {
		socket.emit('request_chatmessage', [client, data]);
	});

	client.on('system_ping', function() {
		socket.emit('system_ping', [client]);
	});

	client.on('request_updateusername', function(data) {
		socket.emit('request_updateusername', [client, data]);
	});

	client.on('disconnect', function() {
		console.log('INFO', client.id + ' (' + (socket.getUsernameForClient(client)) + ')', 'has disconnected');
		var username = socket.getUsernameForClient(client);
		socket.broadcastAll(null, 'info_clientleft', {
			id: client.id,
			user: username
		});
		socket.broadcastSystemMessageFrom(client, username + ' has left the stream.');
		socket.removeClient(client);
	});
});

function staticHandler(req, res) {
	var file = req.url;
	var ext = getFileExtension(file);
	fs.readFile(__dirname + '/' + file, function(err, data) {
		if (err) {
			console.log('ERR', 'unable to find file', __dirname + '/' + file);
			res.writeHead(404);
			return res.end('File not found.');
		}

		console.log('INFO', 'serving file', __dirname + '/' + file, 'with mime', '"' + getFileMime(file) + '"');
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
			res.writeHead(500);
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

// handle /video/* paths
function videoHandler(req, res) {
	var pathFragments = req.url.split('/');
	var fileFragment = pathFragments[pathFragments.length - 1];
	var extension = getFileExtension(fileFragment);

	// grab last fragment and determine if it is a file
	if (isVideoFile(extension)) {
		return videoFileHandler(req, res, fileFragment);
	}

	videoFileHandler(req, res, fileFragment, 500);
}

function videoFileHandler(req, res, fileFragment) {
	serveIndex('video', req, res, 200);
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