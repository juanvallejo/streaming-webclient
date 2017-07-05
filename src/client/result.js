var Cons = require('./constants.js');

function Result(name, kind, url, thumb) {
    var self = this;

    this.name = name || "Untitled";
    this.kind = kind || Cons.STREAM_KIND_LOCAL;
    this.url = url;

    this.container = document.createElement("div");
    this.container.className = "controls-container-panel-result";

    this.thumb = document.createElement("div");
    this.thumb.className = "controls-container-panel-result-thumb";

    this.thumbSpan = document.createElement("span");
    this.thumbImg = new Image();

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

    this.appendTo = function(elem) {
        elem.appendChild(self.container);
    }
}

module.exports = Result;

function addThumbSpanClass(span, kind) {
    if (kind === Cons.STREAM_KIND_YOUTUBE) {
        span.className = "fa fa-youtube";
    } else {
        span.className = "fa fa-film";
    }
}