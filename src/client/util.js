
var Util = {}

Util.convertHTMLEntities = function(text) {
    return text.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

module.exports = Util;