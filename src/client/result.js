var Cons = require('./constants.js');

function Result(name, kind, url, thumb) {
    var self = this;

    this.name = name || "Untitled";
    this.kind = kind || Cons.STREAM_KIND_LOCAL;
    this.url = url;
    this.thumbImgUrl = thumb;

    this.container = document.createElement("div");
    this.container.className = "controls-container-panel-result";

    this.thumb = document.createElement("div");
    this.thumb.className = "controls-container-panel-result-thumb";

    this.thumbSpan = document.createElement("span");
    this.thumbImg = new Image();

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

    this.info = document.createElement("div");
    this.info.className = "controls-container-panel-result-info";
    this.info.innerHTML = "<span>" + this.name + "<br /><br />" + this.url + "</span>";

    // build sub-tree
    this.container.appendChild(this.thumb);
    this.container.appendChild(this.info);

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

    this.appendTo = function(elem) {
        elem.appendChild(self.container);
    };

    this.onClick = function(handler) {
        self.container.addEventListener("click", handler || function(e) {});
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

    this.click = function() {
        this.container.click();
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
    } else {
        span.className = "fa fa-film";
    }
}