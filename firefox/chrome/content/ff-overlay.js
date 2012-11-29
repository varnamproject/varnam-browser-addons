window.addEventListener("load", addonLoaded, false);

function addonLoaded() {
    window.removeEventListener("load", addonLoaded, false);
    varnam_ime.initialize();
}

function injectJavaScript(id, url) {
    var script = content.document.getElementById(id);
    if (!script) {
        var scriptNode = content.document.createElement('SCRIPT');
        scriptNode.type = 'text/javascript';
        scriptNode.src = url;
        scriptNode.id = id;
        var headNode = content.document.getElementsByTagName('HEAD');
        if (headNode[0] != null) {
            headNode[0].appendChild(scriptNode);
        }
    }
}

function injectCSS(id, url) {
    var css = content.document.getElementById(id);
    if (!css) {
        var styleNode = content.document.createElement('LINK');
        styleNode.type = 'text/css';
        styleNode.src = url;
        styleNode.id = id;
        var headNode = content.document.getElementsByTagName('HEAD');
        if (headNode[0] != null) {
            headNode[0].appendChild(styleNode);
        }
    }
}

function showContextMenu(event) {
    document.getElementById("context-varnam_ime").hidden = !gContextMenu.onTextInput;
};

var varnam_ime = {
    initialize: function() {
        var appcontent = document.getElementById("appcontent");
        if (appcontent) {
            appcontent.addEventListener("DOMContentLoaded", varnam_ime.onPageLoad, true);
        }

        document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", showContextMenu, false);
        this.initialized = true;
        this.strings = document.getElementById("varnam_ime-strings");
    },

    onPageLoad: function(e) {
        // Injecting Varnam IME scripts to the page
        injectJavaScript('varnam-ime-jquery', 'http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js');
        injectJavaScript('varnam-ime-core', 'http://varnamproject.com/javascripts/addon.js');
        injectCSS('varnam-ime-css', 'http://varnamproject.com/stylesheets/addon.css');
    },

    onMenuItemCommand: function(e) {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        promptService.alert(window, this.strings.getString("helloMessageTitle"), this.strings.getString("helloMessage"));

        Firebug.Console.log(content.document);
        Firebug.Console.log(document);
    },

    onToolbarButtonCommand: function(e) {
        varnam_ime.onMenuItemCommand(e);
    }
};