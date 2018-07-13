var Overlay = require('./proto/overlay.js');

function Settings(parent) {
    this.init(this);
    this.parent = parent;
}

Settings.prototype = new Overlay();
module.exports = Settings;