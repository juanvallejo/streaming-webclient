var isActive = false;

// ChatUserHeader
function ChatUserHeader(title, overlays) {
    var self = this;

    this.title = title;

    this.elem = document.createElement("span");
    this.elem.className = "chat-container-view-message chat-container-view-message-center";

    this.titleElem = document.createElement("span");
    this.titleElem.className = "chat-container-view-message-text";
    this.titleElem.innerHTML = title;

    this.buttonWrapper = document.createElement("div");
    this.buttonWrapper.className = "chat-container-view-button-wrapper";

    this.settingsButton = document.createElement("span");
    this.settingsButton.id = "chat-container-view-settings-btn";
    this.settingsButton.className = "button chat-container-view-button";
    this.settingsButton.title = "User settings";
    this.settingsButton.innerHTML = "<span class='span-wrapper'><span class='fa fa-gear'></span></span>";
    this.settingsButton.addEventListener("click", function() {
        if (isActive) {
            var classes = this.className.split(" active");
            this.className = classes[0];
            if (classes.length > 1) {
                this.className += classes[1];
            }

            isActive = false;
            overlays.settings.hide();
            return;
        }

        isActive = true;
        this.className += " active";

        overlays.settings.show();
        // listen for an "exit" event from this overlay
        overlays.settings.onExit(function() {
            if (!isActive) {
                return;
            }
            self.settingsButton.click();
        });
    });

    // restore previous button visual state
    if (isActive) {
        this.settingsButton.className += " active";
    }

    // append child elems
    this.elem.appendChild(this.titleElem);
    this.elem.appendChild(this.buttonWrapper);
    this.buttonWrapper.appendChild(this.settingsButton);

    this.appendTo = function(parent) {
        parent.appendChild(self.elem);
    };

    this.appendReplaceTo = function(parent) {
        parent.innerHTML = '';
        this.appendTo(parent);
    };
}

module.exports = ChatUserHeader;