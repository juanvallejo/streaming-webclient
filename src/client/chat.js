/**
 * Chat handler
 */

var Emitter = require('./proto/emitter.js');

var INPUT_ELEM_INPUT = 0;
var INPUT_ELEM_USERS = 1;
var INPUT_ELEM_MINIM = 2;

var CONTAINER_ELEM_CONTAINER = 0;

var VIEW_ELEM_USER = 0;
var VIEW_ELEM_CHAT = 1;

function Chat(containerElemCollection, viewElemCollection, inputElemCollection, usernameInputElem, overlayElem) {
	var self = this;

	this.viewElemDefaultOpacity = 0.8;

	this.container = containerElemCollection.item(CONTAINER_ELEM_CONTAINER);
	this.view = viewElemCollection.item(VIEW_ELEM_CHAT);
	this.userView = viewElemCollection.item(VIEW_ELEM_USER);
	this.input = inputElemCollection.item(INPUT_ELEM_INPUT);
	this.usersButton = inputElemCollection.item(INPUT_ELEM_USERS);
	this.minimizeButton = inputElemCollection.item(INPUT_ELEM_MINIM);
	this.focused = false;
	this.hidden = false;
	this.width = this.container.clientWidth;
	this.height = this.container.clientHeight;
	this.timeout = null;
	this.chatHideDelay = 2000;
	this.hasMouseOver = false;
	this.isRegistered = false;
	this.user = 'Anonymous';
	this.overlay = overlayElem;
	this.usernameInput = usernameInputElem;
	this.isMinimized = localStorage.minimizedChat;
    this.isDisplayingUserView = localStorage.displayUserView;

    // track users in userView
    this.userViewStartedBy = '';
    this.users = [];

    this.classNameControlActive = 'controls-container-active';
    this.classNameContainerMinimized = 'chat-container-minimized';

    this.getView = function() {
		return this.view;
	};
	this.getInput = function() {
		return this.input;
	};
	this.getContainer = function() {
		return this.container;
	};

	this.getUsername = function() {
		return this.user;
	};

	this.getWidth = function() {
		return this.width;
	};
	this.getHeight = function() {
		return this.height;
	};

	this.clearInput = function() {
		this.input.value = '';
	};

	this.increaseVolume = function(val) {
		this.emit("streamcontrol", ["increaseVolume", [val]]);
	};

	this.decreaseVolume = function(val) {
        this.emit("streamcontrol", ["decreaseVolume", [val]]);
	};

	this.setVolume = function(val) {
        this.emit("streamcontrol", ["setVolume", [val]]);
	};

	this.focusInput = function() {
		this.input.focus();
		this.isFocused(true);
	};

	this.register = function(username) {
		this.isRegistered = true;
		this.user = username;
	};

	// clears all messages from the chat's view
	this.clearView = function() {
		this.view.innerHTML = '';
	};

	this.show = function(noAnimation) {
		this.hidden = false;
		if (noAnimation) {
			this.container.style.display = 'block';
			return;
		}
		$(this.container).fadeIn();
		if (!this.hasMouseOver && !this.isFocused()) {
			clearTimeout(this.timeout);
			this.timeout = setTimeout(function() {
				self.hide();
			}, this.chatHideDelay);
		}
	};

	this.hide = function(noAnimation) {
		this.hidden = true;
		if (noAnimation) {
			this.container.style.display = 'none';
			return;
		}
		$(this.container).fadeOut();
	};

	this.hideOverlay = function() {
	    for (var i = 0; i < viewElemCollection.length; i++) {
	        viewElemCollection.item(i).style.opacity = this.viewElemDefaultOpacity;
        }
		this.overlay.style.display = 'none';
	};

	this.lockOverlay = function(message) {
		this.usernameInput.value = message;
		this.usernameInput.disabled = true;
	};

	this.unlockOverlay = function() {
		this.usernameInput.value = '';
		this.usernameInput.removeAttribute("disabled");
	};

	this.showUsers = function(users) {
        this.users = users || [];

        if (this.usersButton.children.length) {
	        if(this.usersButton.children[0].children.length > 1) {
                if (this.usersButton.children[0].children[1].children[0]) {
                    this.usersButton.children[0].children[1].children[0].innerHTML = (users.length || '0');
                }
            }
        }

        if (!users || !users.length) {
	        this.userView.innerHTML = '<span class="chat-container-view-message chat-container-view-message-middle-wrapper"><span class="chat-container-view-message-middle">Unable to display users at this time.</span></span>';
	        return;
        }
	    this.userView.innerHTML = '<span class="chat-container-view-message chat-container-view-message-center"><span class="chat-container-view-message-text">List of users</span></span>';

	    for (var i = 0; i < users.length; i++) {
	        var hlClassName = '';
	        if (users[i].username === self.getUsername() || users[i].id === self.getUsername()) {
	            hlClassName = ' text-hl-name';
            }

            var currentDj = '';
            if (self.userViewStartedBy && (users[i].username === self.userViewStartedBy || users[i].id === self.userViewStartedBy)) {
                currentDj = '<span class="fa-wrapper" title="This user has queued up the current stream"><span class="fa fa-music"></span></span>'
            }

	        this.userView.innerHTML += '<span class="chat-container-view-message chat-container-view-message"><span class="chat-container-view-message-status">' + currentDj + '</span><span class="chat-container-view-message-text' + hlClassName + '">' + (users[i].username || users[i].id || '[Unknown]') + '</span></span>';
        }
	};

	this.isHidden = function() {
		return this.hidden;
	};
	this.isFocused = function(focused) {
		if (focused !== undefined) {
			this.focused = focused;
			return this.focused;
		}
		return this.focused;
	};

	this.videoURLToEmbeddable = function(link) {
		var videoId = link;
		if (link.match(/watch\?v\=/gi)) {
			videoId = link.split("watch?v=")[1];
		} else {
			videoId = link.split('/');
			videoId = videoId[videoId.length - 1];
		}
		return ('https://www.youtube.com/embed/' + videoId);
	};

	this.reloadClient = function() {
		window.location.reload();
	};

	this.addMessage = function(data) {
		var message = document.createElement('span');
		message.className = 'chat-container-view-message';
		message.innerHTML = (!data.system ? ('<span class="chat-container-view-message-user text-hl-name">' + data.user + ': ') : '') + '</span><span class="chat-container-view-message-text">' + data.message + '</span>';

		if (data.extra && data.extra.images && data.extra.images.length) {
			var noun = 'image';
			if (data.extra.images.length > 1) {
				noun += 's';
			}

			var images = [];
			var imagesLoaded = 0;
			message.innerHTML += '<span class="block full-size images-loading-text">[loading ' + noun + '...]</span>';
			for (var i = 0; i < data.extra.images.length; i++) {
				images[i] = new Image();
				images[i].src = data.extra.images[i];
				images[i].addEventListener('load', function(image, message) {
					return function() {
						checkImagesLoaded(message);
						
						image.style.cursor = 'pointer';
						image.addEventListener('click', function() {
							window.open(image.src, '_blank');
						});

						var imageSpan = document.createElement('span');
						imageSpan.className = 'full-size text-center block chat-container-view-message-image';
						imageSpan.appendChild(image);
						message.appendChild(imageSpan);

						image.style.width = "100%";

						if (images.length > 1) {
							self.view.scrollTop += imageSpan.clientHeight;
							return;
						}

						$(self.view).animate({
							scrollTop: self.view.scrollTop + imageSpan.clientHeight * 2
						}, 500);
					};
				}(images[i], message));
				images[i].addEventListener('error', function(image, message) {
					return function() {
						checkImagesLoaded(message);
						message.innerHTML += '<span class="block full-size">An error ocurred loading image with url "' + image.src + '"</span>';
					};
				}(images[i], message));
			}

			function checkImagesLoaded(message) {
				imagesLoaded++;
				if (imagesLoaded >= images.length) {
					var imagesLoadingText = message.getElementsByClassName('images-loading-text');
					if (imagesLoadingText && imagesLoadingText.item(0)) {
						message.removeChild(imagesLoadingText.item(0));
					}
				}
			};

		}

		if (data.videos && data.videos.length) {
			for (var i = 0; i < data.videos.length; i++) {
				var video = document.createElement('iframe');
				video.className = 'full-size text-center block chat-container-view-message-image';
				video.frameborder = "0";
				video.allowfullscreen = true;
				video.src = self.videoURLToEmbeddable(data.videos[i]);
				message.appendChild(video);
			}
		}

		this.view.appendChild(message);

		if (data.extra && (data.extra.images && data.extra.images.length > 1)) {
			this.view.scrollTop = this.view.scrollHeight * 2;
			return;
		}
		$(this.view).animate({
			scrollTop: self.view.scrollHeight
		}, {
			duration: 500,
			queue: false
		});
	};

	this.sendText = function(socket, sender, text) {
		this.clearInput();
		socket.send('request_chatmessage', {
			user: sender,
			message: text
		});
	};

	this.handleMouseOver = function(x, y) {
		this.hasMouseOver = true;
		clearTimeout(this.timeout);

		if (!this.isHidden()) {
			return;
		}

		this.show();
	};

	this.handleMouseOut = function() {
		this.hasMouseOver = false;
		clearTimeout(this.timeout);
		if (this.isFocused()) {
			clearTimeout(this.timeout);
			return;
		}

		this.timeout = setTimeout(function() {
			if (self.isFocused()) {
				return;
			}
			self.hide();
		}, this.chatHideDelay);
	};

	// TODO sendText requires a socket: implement in the main package
	this.handleKeypress = function(keyCode) {
		switch (keyCode) {
			case 13:
				if (!this.input.value) {
					break;
				}
				self.emit('submit', [(localStorage.username || self.getUsername()), self.input.value]);
				break;
		}
	};

	this.showMinimizedChat = function() {
	    this.isMinimized = true;

		$(this.container).addClass(self.classNameContainerMinimized);
		this.addMessage({
            system: true,
            user: 'system',
            message: 'chat minimized'
        });

		localStorage.minimizedChat = true;
	};

	this.showMaximizedChat = function() {
        this.isMinimized = false;

        delete localStorage.minimizedChat;
        $(this.container).removeClass(self.classNameContainerMinimized);
    };

	this.showUserView = function() {
	    this.isDisplayingUserView = true;

	    $(this.view).addClass('chat-container-display-user-view');
	    $(this.userView).addClass('chat-container-display-user-view');
        localStorage.displayUserView = true;
    };

	this.hideUserView = function() {
	    this.isDisplayingUserView = false;

	    delete localStorage.displayUserView;
        $(this.view).removeClass('chat-container-display-user-view');
        $(this.userView).removeClass('chat-container-display-user-view');
    };

	this.handleMinimizeButton = function(button, isActive) {
        if (isActive) {
            $(button).removeClass(self.classNameControlActive);
        } else {
            $(button).addClass(self.classNameControlActive);
        }

        if (!isActive) {
        	self.showMinimizedChat();
        	return;
		}

		self.showMaximizedChat();
	};

    this.handleUsersButton = function(button, isActive) {
        if (!isActive && this.isMinimized) {
            this.addMessage({
                system: true,
                user: 'system',
                message: 'error: this view is not available in minimized mode'
            });
            return;
        }

        if (isActive) {
            $(button).removeClass(self.classNameControlActive);
        } else {
            $(button).addClass(self.classNameControlActive);
        }

        if (isActive) {
            self.hideUserView();
            return
        }

        this.userView.innerHTML = '<span class="chat-container-view-message chat-container-view-message-middle-wrapper"><span class="chat-container-view-message-middle">Loading, please wait...</span></span>';
        self.emit('socketevent', ['request_userlist']);
        self.showUserView();
    };

    $(this.minimizeButton).on('click', function() {
        var isActive = $(this).hasClass(self.classNameControlActive);
        self.handleMinimizeButton(this, isActive);
    });

    $(this.usersButton).on('click', function() {
        var isActive = $(this).hasClass(self.classNameControlActive);
        self.handleUsersButton(this, isActive);
    });

	this.input.addEventListener('focus', function() {
		self.isFocused(true);
	});
	this.input.addEventListener('blur', function() {
		if (!self.hasMouseOver) {
			self.handleMouseOut();
		}
		self.isFocused(false);
	});

	this.input.addEventListener('keypress', function(e) {
		self.handleKeypress(e.keyCode);
	});

	this.usernameInput.addEventListener('keydown', function(e) {
		if (e.keyCode == 13) {
			if (!self.usernameInput.value.match(/^[a-z0-9\_]+$/gi)) {
				self.emit('info', ['Usernames may only contain letters, numbers, and underscores.']);
				return;
			}

			self.emit('username_submit', [self.usernameInput.value]);
		}
	});
};

Chat.prototype = new Emitter();

module.exports = Chat;