function Overlay() {
    var isShowing = false;
    var self = null;

    var onExitCallbacks = [];

    this.elem = document.createElement('div');
    this.elem.className = 'overlay';

    this.init = function(ctx) {
        self = ctx;
    };

    this.show = function() {
        if (!this.parent) {
            console.log('FATAL: unable to display settings overlay - nil or undefined parent node');
            return;
        }

        // remove any present sibling overlays
        for(var i = 0; i < this.parent.children.length; i++) {
            this.parent.removeChild(this.parent.children[i]);
        }

        isShowing = true;
        this.parent.style.display = 'block';
        this.parent.appendChild(this.elem);
        this.elem.focus();
    };

    this.hide = function() {
        if (!this.parent) {
            console.log('FATAL: unable to close settings overlay - nil or undefined parent node');
            return;
        }

        isShowing = false;
        this.parent.removeChild(this.elem);

        if (!this.parent.children.length) {
            this.parent.style.display = 'none';
        }
    };

    this.onExit = function(fn) {
        onExitCallbacks.push(fn);
    };

    window.addEventListener('keydown', function(e) {
       if (e.keyCode !== 27) {
           return;
       }

       if (!isShowing) {
           return;
       }

       if (!self) {
           console.log("FATAL: attempt to add event listener to overlay without calling init(context) first.");
           return;
       }

       for(var i = 0; i < onExitCallbacks.length; i++) {
           onExitCallbacks.shift().call(self);
       }
    });
}

module.exports = Overlay;