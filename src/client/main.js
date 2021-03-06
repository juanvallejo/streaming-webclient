/**
 * Main entry point for the client app
 */

var Banner = require('./banner.js');
var Chat = require('./chat/chat.js');
var Cons = require('./constants.js');
var VideoPlayer = require('./video.js');
var Socket = require('./socket.js');
var Controls = require('./controls.js');
var Overlays = require('./overlays/overlays.js');

// attempts to build a socket connection url using
// hostname constants. Defaults to window.location.hostname
function getSocketAddr(window) {
    return (Cons.DEFAULT_SOCKET_PROTO + '://' + window.location.host + Cons.DEFAULT_SOCKET_PATH + window.location.pathname);
}

function App(window, document) {
    var self = this;

    this.localStorage = window.localStorage;

    this.screenOutputOverlay = document.getElementById("overlay");
    this.out = document.getElementById("out");
    this.outTimeout = null;

    // container for ui overlays (settings, etc.)
    this.overlayPanels = new Overlays(document.getElementById('overlays-container'));

    this.opacityOverlayClassName = ".opacity-overlay";
    this.defaultInterfaceOpacity = 0.8;
    
    this.chat = new Chat(
        document.getElementsByClassName('chat-container-elem'),
        document.getElementsByClassName('chat-container-view-elem'),
        document.getElementsByClassName('chat-container-input-elem'),
        document.getElementById('chat-container-username-input'),
        document.getElementById('chat-container-overlay'),
        self.overlayPanels
    );

    this.socket = new Socket(getSocketAddr(window));
    this.video = new VideoPlayer(
        document.createElement('video'), 
        document.createElement('track')
    );
    this.banner = new Banner(document.getElementById("banner"));

    this.controls = new Controls(
        document.getElementById("controls-container"),
        document.getElementById("controls-container-panel-overlay"),
        document.getElementsByClassName("controls-container-button"),
        document.getElementsByClassName("controls-container-button-alt"),
        document.getElementsByClassName("controls-container-info-inner"),
        document.getElementsByClassName("controls-container-volume-elem"),
        document.getElementsByClassName("controls-container-panel-elem"),
        document.getElementsByClassName("controls-container-seek-elem")
    );

    // set application states
    this.initVideo = false;
    this.connectionLost = false;

    this.isQueueRestored = false;

    // initialize the client application
    // and its sub-components
    this.init = function() {
        this.chat.hide(true);

        $(self.opacityOverlayClassName).fadeTo("normal", 0.0);

        if (window.WebSocket === undefined) {
            this.out.innerHTML = "<span class='text-hl-name'>FlickTrack</span> is incompatible with your browser.<br />"
            this.out.innerHTML += "Try a different browser, such as <span class='text-hl-name'>Chrome</span> or <span class='text-hl-name'>FireFox</span>."
            return;
        }

        // init chat
        this.chat.init();

        this.out.innerHTML = '';
        // this.out.innerHTML = "Welcome.<br />Queue a video by using the <span class='text-hl-name'>panel to the left.</span>"
        // this.out.innerHTML += "<br />Press <span class='text-hl-name'>play</span> to begin room playback."

        // add main overlay event listener
        this.out.addEventListener('click', function() {
            if (self.video.canStartStream) {
                self.video.beginStream(self.socket, self.chat.getUsername());
            }
        });

        // init video object
        this.video.init(window.location);
        this.video.appendTo(document.body);

        this.video.on('error', function(err) {
            if (err.target.error.code === Cons.ERR_CODE_VID_NOTFOUND) {
                self.showOutput('The video file <span class="text-hl-name">' + self.video.getVideo().src.split(Cons.STREAM_URL_PREFIX)[1] + '</span> could not be loaded.');
            } else {
                self.showOutput('Unexpected error occurred while receiving video data.<br />' + err.target.error);
            }
            self.controls.pause();

            self.video.sourceFileError = true;
            self.video.canStartStream = false;
        });

        this.video.on('volumeupdate', function(vol) {
            self.controls.setVolume(vol);
        });

        // init user controls
        this.controls.init();
        this.controls.setVolume(this.video.getVolume())
        this.controls.on("chatcommand", function(cmd) {
            self.chat.sendText(self.socket, "system", cmd);
        });

        this.controls.on("streamcontrol", function(method, args) {
            if(!self.video[method]) {
                self.banner.showBanner("chat command attempted to control stream with an invalid operation (" + method + ").");
                return;
            }

            self.video[method].apply(self, args);
        });

        this.controls.on("opacitytoggle", function(enable, val, speed) {
            speed = speed || 200;
            $(self.opacityOverlayClassName).stop();

            if (!enable) {
                $(self.opacityOverlayClassName).animate({"opacity": 0.0}, {"duration": speed, "queue": false});
                return;
            }

            val = val || self.defaultInterfaceOpacity;
            $(self.opacityOverlayClassName).animate({"opacity": val}, {"duration": speed, "queue": false});
        });
        
        this.controls.on("queuetoggle", function(isQueueShowing) {
            self.controls.showQueuePanel();
            if (!isQueueShowing) {
                self.controls.showQueueItems();
                return;
            }

            self.controls.showStackItems();
        });
        
        // handle chat events
        this.chat.on('submit', function(user, msg) {
            this.sendText(self.socket, user, msg);
            this.focusInput();
        });
        
        this.chat.on('socketevent', function(e, data) {
            self.socket.send(e, data || {});
        });

        this.chat.on('username_submit', function(username) {
            self.socket.send('request_updateusername', {
                user: username
            });
            self.chat.usernameInput.value = '';
            this.lockOverlay("loading, please wait...");
        });

        this.chat.on('info', function(text, persist) {
            self.banner.showBanner(text, persist);
        });

        this.chat.on('streamcontrol', function(method, args) {
            if (!self.video[method]) {
                self.banner.showBanner("chat command attempted to control stream with an invalid operation (" + method + ").");
                return;
            }

            self.video[method].apply(self, args);
        });

        this.socket.on('info', function(text, persist) {
            self.banner.showBanner(text, persist);
        });
    };

    this.getVideo = function() {
        return this.video;
    };

    this.getControls = function() {
        return this.controls;
    };

    this.showOutput = function(text, timeout) {
        clearTimeout(this.outTimeout);

        $(this.screenOutputOverlay).stop();
        this.screenOutputOverlay.style.display = 'table';
        this.out.innerHTML = text;

        if (!timeout) {
            return;
        }

        this.outTimeout = setTimeout(function() {
            self.hideOutput();
        }, timeout);
    };

    this.hideOutput = function() {
        $(self.screenOutputOverlay).fadeOut();
    };

    this.socket.on('error', function(err) {
        self.banner.showBanner("websocket error: " + err.toString(), true);
    });

    // register socket events
    this.socket.on('connect', function() {
        // request authorization roles
        self.socket.send("request_authorization");

        // if username already stored, set as current username
        if (self.localStorage.username) {
            setTimeout(function() {
            	self.chat.emit("username_submit", [self.localStorage.username]);
            }, 1000);
        }

        if (self.video.savedTimer) {
            // TODO: it would be ideal to have the clickable overlay
            // at the begining of a stopped stream resume using this
            // timer, not have the server auto-play once connection
            // is re-established after a connection lost.
        }
        if (self.connectionLost) {
            self.connectionLost = false;
            self.banner.showBanner('Connection reestablished. Resuming stream.');
        }

        // request current queue status
        self.socket.send("request_queuesync");
    });

    this.socket.on('disconnect', function() {
        self.banner.showBanner('Connection lost, please wait - attempting to reestablish.', true);
        self.video.savedTimer = self.video.getTime();

        self.video.pause();
        self.controls.pause();
        self.video.canStartStream = false;
        self.connectionLost = true;

        // TODO: add reconnection logic
        self.showOutput('The stream will resume momentarily.<br />Please stand by.');
    });

    this.socket.on('updateusername', function(data) {
        self.chat.hideOverlay();
        self.chat.unlockOverlay();

        data = parseSockData(data);
        self.localStorage.username = data.user;
        self.chat.register(data.user);
        if (!self.chat.isHidden()) {
            self.chat.focusInput();
        }

        var minimizedButtonActive = $(self.chat.minimizeButton).hasClass(self.chat.classNameControlActive);
        if (self.chat.isMinimized && self.chat.isRegistered && !minimizedButtonActive) {
            $(self.chat.minimizeButton).click();
        }

        self.socket.send('request_userlist');
        if (self.chat.isDisplayingUserView) {
            if (self.chat.isMinimized) {
                self.chat.hideUserView();
                return;
            }
        }

        self.banner.showBanner("Your username has been updated to \"" + data.user + "\"")
    });

    this.socket.on('info_userlistupdated', function(data) {
        self.socket.send('request_userlist');
    });

    this.socket.on('info_updateusername', function(data) {
        self.socket.send('request_userlist');

        data = parseSockData(data);
        if (data.user === self.localStorage.username || (data.extra && data.extra.oldUser === self.localStorage.username)) {
            return self.banner.showBanner('<span class="text-hl-name">You</span> are now known as ' + data.user);
        }
        if(data.extra && data.extra.isNewUser) {
            return self.banner.showBanner('<span class="text-hl-name">' + data.user + '</span> has joined the chat.');
        }
        self.banner.showBanner('<span class="text-hl-name">' + ((data.extra && data.extra.oldUser) || 'Anonymous (' + (data.id || 'unknown id') + ')') + '</span> is now known as ' + data.user);
    });

    this.socket.on('chatmethodaction', function(data) {
        data = parseSockData(data);
        if (!data.extra) {
            return;
        }
        if (typeof self.chat[data.extra.methodname] !== 'function') {
            self.banner.showBanner('Warning: The server has requested an invalid action (' + data.extra.methodname + ') to be performed.');
            console.log('Warning: The server requested an invalid action (' + data.extra.methodname + ') from the chat handler. Possible incompatible version of the server being used.');
            return;
        }

        self.chat[data.extra.methodname].apply(self.chat, data.extra.args || []);
    });

    this.socket.on('chatmessage', function(data) {
        data = parseSockData(data);
        self.chat.unlockOverlay()
        if (self.chat.isRegistered) {
            self.chat.show();
        }
        self.chat.addMessage(data);
    });

    this.socket.on("streamload", function(data) {
        self.showOutput("Loading stream, please wait...");

        data = parseSockData(data);
        self.video.load(data);

        self.socket.send("request_streamsync");
        self.socket.send("request_queuesync");

        if (self.controls.stackState.length) {
            self.socket.send("request_stacksync");
        }
    });

    this.socket.on('authorization', function(data) {
        data = parseSockData(data);
        handleRemoteRequest(data, function(response) {
            var message = response.message;
            if (response.error) {
                message = response.error;
                self.chat.addMessage({
                    system: true,
                    user: 'system',
                    message: message
                });
                return;
            }

            // handle events that should happen only after we have
            // been authorized as a normal user by the server

            if (self.isQueueRestored) {
                return;
            }

            self.isQueueRestored = true;

            // restore a user's queue
            if (self.localStorage.lastSavedStackState && self.localStorage.lastSavedStackState.length) {
                try {
                    var items = JSON.parse(self.localStorage.lastSavedStackState);
                    if (items.length) {
                        self.chat.addMessage({
                            system: true,
                            user: 'system',
                            message: "attempting to restore your queue items..."
                        });
                    }

                    self.controls.restoreStack(items);
                } catch (e) {
                    self.chat.addMessage({
                        system: true,
                        user: 'system',
                        message: "unable to deserialize saved queue state - your previous queue items will not be restored"
                    });
                }
            }
        });
    });

    this.socket.on('httprequest', function(data) {
        data = parseSockData(data);
        handleRemoteRequest(data);
    });

    this.socket.on('queuesync', function(data) {
        self.controls.updateQueue(data.extra.items || []);
    });

    this.socket.on('stacksync', function(data) {
        // save the current queue state locally.
        // this allows us to restore it at a later session.
        if (data.extra.items) {
            window.localStorage.lastSavedStackState = JSON.stringify(data.extra.items || []);
        }

        self.controls.updateStack(data.extra.items || [])
    });
    
    this.socket.on('streamsync', function(data) {
        data = parseSockData(data);
        if (data.extra.stream.kind === Cons.STREAM_KIND_YOUTUBE) {
            if (data.extra.stream.duration) {
                self.getVideo().ytVideoInfo.duration = data.extra.stream.duration;
            }
        } else if (data.extra.stream.kind === Cons.STREAM_KIND_LOCAL) {
            if (data.extra.playback.isPlaying && self.video.sourceFileError) {
                self.showOutput('The stream could not be loaded.');
                return;
            }
        }

        // mark user as origin of current stream
        if (data.extra && data.extra.startedBy) {
            self.chat.userViewStartedBy = data.extra.startedBy;
            self.chat.showUsers(self.chat.users);
        }

        self.controls.setMediaTitle(data.extra.stream.name || data.extra.stream.url);
        self.controls.setMediaDuration(data.extra.stream.duration);
        self.controls.setMediaElapsed(data.extra.playback.time);
        self.controls.setSeeker(data.extra.playback.time, data.extra.stream.duration);

        self.video.canStartStream = false;

        var isNewClient = false;
        if (!self.video.alertShown) {
            self.video.alertShown = true;
            isNewClient = true;
        }

        if (Math.abs(parseInt(data.extra.playback.time) - parseInt(self.video.getTime())) > 10 && !data.extra.playback.isPaused) {
            if (data.extra.playback.time <= 1) {
                self.banner.showBanner('Resetting playback, please wait...');
            } else if (parseInt(data.extra.playback.time) - parseInt(self.video.getTime()) <= 0) {
                self.banner.showBanner('Seeking stream, please wait...');
            }
        }

        // only update video time if "lag" time > x seconds
        if (!self.video.getTime() || (self.video.getTime() && Math.abs(self.video.getTime() - data.extra.playback.time) > 0.7)) {
            self.video.setTime(data.extra.playback.time);
        }

        // safari bug fix - currentTime will not take
        // effect until a second after the page has loaded
        if (!self.video.getTime() && self.video.videoStreamKind === Cons.STREAM_KIND_LOCAL) {
            setTimeout(function() {
                self.video.setTime(data.extra.playback.time + 1);
            }, 1500);
        }

        if (!data.extra.playback.isPlaying) {
            self.video.pause();
            self.controls.pause();

            if (data.extra.playback.isStopped) {
                if(self.video.sourceFileError && data.extra.stream.kind === Cons.STREAM_KIND_LOCAL) {
                    console.log('FATAL', 'Detected source file error, preventing stream from starting.');
                    return;
                }

                self.showOutput('The stream has not yet started. <span class="text-hl-name">Click to start it.</span>');
                self.video.canStartStream = true;
                return;
            }

            self.video.canStartStream = true;

            if (isNewClient) {
                self.showOutput('Welcome, The stream has been paused.');
            } else {
                self.showOutput('The stream has been paused. <span class="text-hl-name">Click to resume it.</span>');
            }

            return;
        }

        self.hideOutput();

        // detect video end
        if (self.video.getDuration() && data.extra.playback.time >= self.video.getDuration()) {
            if (isNewClient) {
                self.showOutput('Welcome, the stream has already ended.');
            } else {
                self.showOutput('The stream has ended.');
            }

            return;
        }

        if(isNewClient) {
            // if (data.extra.startedBy) {
            //     self.showOutput('Welcome, the stream has already been started by <span class="text-hl-name">' + data.extra.startedBy + '</span>.', Cons.DEFAULT_OVERLAY_TIMEOUT);
            // } else {
            //     self.showOutput('Welcome, the stream has already been started.', Cons.DEFAULT_OVERLAY_TIMEOUT);
            // }
        }

        self.video.play();
        self.controls.play();
    });

    this.socket.on('userlist', function(data) {
        if (!data.clients) {
            return;
        }
        
        self.chat.showUsers(data.clients);
    });

    this.socket.on('info_clienterror', function(data) {
        data = parseSockData(data);
        self.chat.unlockOverlay();
        self.banner.showBanner(data.error);
    });

    this.socket.on('info_clientjoined', function(data) {
        data = parseSockData(data);
        self.banner.showBanner('client <span class="text-hl-name">' + data.id + '</span> has joined the stream.');
        self.socket.send('request_userlist');
    });

    this.socket.on('info_clientleft', function(data) {
        data = parseSockData(data);
        self.banner.showBanner('client <span class="text-hl-name">' + (data.user || data.id) + '</span> has left the stream.');
        self.socket.send('request_userlist');
        self.socket.send('request_queuesync');
    });

    this.socket.on('system_ping', function() {
        self.socket.send('system_ping')
    });

    this.socket.on('info_subtitles', function(data) {
        data = parseSockData(data);
        if (data.extra.on && data.extra.path) {
            self.video.addSubtitles(data.extra.path, function(err) {
                if(err) {
                    self.banner.showBanner(err);
                    return;
                }
                self.banner.showBanner('Successfully added subtitles track.');
            });

            return;
        }
        self.video.removeSubtitles();
        self.banner.showBanner('Subtitles off.');
    });

    this.video.on('subtitlesloaded', function() {
        self.banner.showBanner('The subtitle track has loaded. Subtitles enabled.');
    });

    this.video.on('emitsocketdata', function(sockEvt, data) {
        self.socket.send(sockEvt, data);
    });

    // add window event listeners
    window.addEventListener('mousemove', function(e) {
        var appWidth = window.innerWidth;
        var chatWidth = self.chat.getWidth();
        var chatHeight = self.chat.getHeight();

        if (e.clientX >= appWidth - chatWidth && e.clientY <= chatHeight) {
            self.chat.handleMouseOver(e.clientX, e.clientY);
            return;
        }

        self.chat.handleMouseOut();
    });

    window.addEventListener("message", function(e) {
        if (typeof e.data !== "string") {
            return;
        }

        try {
            var data = JSON.parse(e.data);
            if (data.event === "infoDelivery" && data.info) {
                self.video.ytVideoCurrentTime = data.info.currentTime;
            }
        } catch (err) {
            console.log("ERR IFRAME-MESSAGE unable to parse event data as json:", e.data, err);
        }
    });

    window.addEventListener('keydown', function(e) {
        // if ((e.keyCode == 70 || e.keyCode == 220) && !self.chat.isFocused() && self.chat.usernameInput !== document.activeElement) {
        //     if (self.video.getVideo().requestFullscreen) {
        //         self.video.getVideo().requestFullscreen();
        //         return;
        //     }
        //     if (self.video.getVideo().webkitRequestFullScreen) {
        //         self.video.getVideo().webkitRequestFullScreen();
        //         return;
        //     }
        //     if (self.video.getVideo().mozRequestFullScreen) {
        //         self.video.getVideo().mozRequestFullScreen();
        //         return;
        //     }
        //     if (self.video.getVideo().msRequestFullscreen) {
        //         self.video.getVideo().msRequestFullscreen();
        //         return;
        //     }
        // }
    });
}

function request(method, endpoint, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, endpoint);
    xhr.withCredentials = true;
    xhr.addEventListener('readystatechange', function() {
        if (xhr.readyState === 4) {
            var response = xhr.responseText;
            if (response) {
                response = JSON.parse(response);
            }

            callback(response || {});
        }
    });

    xhr.send();
}

function parseSockData(b64) {
    if (typeof b64 !== "string") {
        return b64;
    }
    return JSON.parse(atob(b64));
}

function handleRemoteRequest(data, callback) {
    if (data.error) {
        self.chat.addMessage({
            system: true,
            user: 'system',
            message: "error: " + data.error
        });
        return;
    }

    var endpoint = data.extra.endpoint;
    var method = data.extra.method || 'GET';

    if (!endpoint) {
        self.chat.addMessage({
            system: true,
            user: 'system',
            message: 'error: the server asked the client to initiate a request against an empty or invalid endpoint.'
        });
        return;
    }

    callback = callback || function(response) {
        var message = response.message;
        if (response.error) {
            message = response.error;
            self.chat.addMessage({
                system: true,
                user: 'system',
                message: message
            });
            return;
        }
    };

    request(method, endpoint, callback);
}

window.App = App;