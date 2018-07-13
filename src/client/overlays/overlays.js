var SettingsPanel = require('./settings.js');

// Convenience object for holding instances of overlay panels
function OverlayPanels(parent) {
    this.parent = parent;

    this.settings = new SettingsPanel(parent);
}

module.exports = OverlayPanels;