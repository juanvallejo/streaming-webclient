var Cons = require('./constants.js');

function Result(name, kind, url, thumb, description) {
    var self = this;
    var nameTruncated = false;

    this.name = name || "Untitled";

    // truncate name
    if (this.name.length > 45) {
        var n = this.name.split('');
        n.splice(46, this.name.length - 44);
        this.name = n.join('') + '...';
        nameTruncated = true;
    }

    this.kind = kind || Cons.STREAM_KIND_LOCAL;
    this.url = url;
    this.thumbImgUrl = thumb;
    this.description = description;

    this.container = document.createElement("div");
    this.container.className = "controls-container-panel-result";

    this.thumb = document.createElement("div");
    this.thumb.className = "controls-container-panel-result-thumb";

    this.thumbSpan = document.createElement("span");
    this.thumbImg = new Image();

    this.duration = document.createElement("div");
    this.duration.className = "controls-container-panel-result-duration";

    this.disableTimeout = null;

    if (!thumb) {
        addThumbSpanClass(this.thumbSpan, kind)
    } else {
        this.thumbImg.src = thumb;
        this.thumbSpan.appendChild(this.thumbImg);

        // if error, default to above case
        this.thumbImg.addEventListener("error", function() {
            addThumbSpanClass(self.thumbSpan, self.kind);
        });
    }

    this.thumb.appendChild(this.thumbSpan);
    this.thumb.appendChild(this.duration);

    this.info = document.createElement("div");
    this.info.className = "controls-container-panel-result-info";
    this.info.innerHTML = "<span>" + this.name + "<br /><br />" + this.description + "</span>";
    if (nameTruncated) {
        this.info.title = name;
    }

    // build sub-tree
    this.container.appendChild(this.thumb);
    this.container.appendChild(this.info);

    this.hideDuration = function() {
        this.duration.style.display = 'none';
    };

    this.showDuration = function(duration) {
        this.duration.style.display = "block";
        this.duration.innerHTML = "<span>" + duration + "</span>"
    };

    this.getName = function() {
        return this.name;
    };

    this.getUrl = function() {
        return this.url;
    };

    this.getThumb = function() {
        return this.thumbImgUrl;
    };
    
    this.getKind = function() {
        return this.kind;  
    };

    this.getDescription = function() {
        return this.description;
    };

    this.appendTo = function(elem) {
        elem.appendChild(self.container);
    };

    this.onClick = function(handler) {
        self.container.addEventListener("click", handler || function(e) {});
    };

    this.onInfoClick = function(handler) {
        self.info.addEventListener("click", handler || function(e) {});
    };

    this.onThumbClick = function(handler) {
        self.thumb.addEventListener("click", handler || function(e) {});
    };

    this.addClass = function(className) {
        if (self.container.className.indexOf(className) !== -1) {
            return;
        }
        self.container.className += " " + className;
    };

    this.removeClass = function(className) {
        var newClassName = self.container.className.split(" ");
        if (!newClassName.length) {
            return;
        }

        var idx = newClassName.indexOf(className);
        if (idx === -1) {
            return;
        }

        newClassName.splice(idx, 1);
        self.container.className = newClassName.join(" ");
    };

    this.setClicked = function(bool) {
        this.isClicked = bool;
    };

    this.clickInfo = function() {
        self.info.click();
    };

    this.click = function() {
        this.container.click();
    };

    this.getInfoElem = function() {
        return this.info;  
    };
    
    this.getThumbElem = function() {
        return this.thumb;  
    };
    
    // receives an optional timeout in seconds
    this.disable = function(timeout) {
        this.isClicked = true;
        this.addClass("disabled");

        if (timeout) {
            clearTimeout(self.disableTimeout);
            self.disableTimeout = setTimeout(function() {
                self.enable();
            }, timeout);
        }
    };

    this.scrollFrom = function(elem) {
        $(elem).stop().animate({scrollTop: $(self.container).offset().top});
    };

    this.enable = function() {
        self.isClicked = false;
        self.removeClass("disabled");
    };
}

module.exports = Result;

function addThumbSpanClass(span, kind) {
    if (kind === Cons.STREAM_KIND_YOUTUBE) {
        span.className = "fa fa-youtube";
    } else if (kind === Cons.STREAM_KIND_TWITCH) {
        span.className = "fa fa-twitch";
    } else {
        span.className = "fa fa-film";
    }
}