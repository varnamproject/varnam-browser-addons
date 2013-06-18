const data = require("self").data;
const contextMenu = require("context-menu");
const tabs = require('tabs');
const request = require("request").Request;
const prefs = require("simple-prefs").prefs;
const notifications = require("sdk/notifications");
const Hotkey = require("sdk/hotkeys").Hotkey;

// Content scripts that page mod uses
const contentScripts = [data.url("jquery-1.8.2.min.js"), data.url("textinputs_jquery.js"), data.url("caret.js"), data.url("varnam.js")];

// Options which are available to content script
const options = {
	progressImage: data.url('progress.gif')
};

var workers = [];
var pageMod = require("page-mod");
var page = pageMod.PageMod({
	include: '*',
	contentScriptWhen: 'ready',
	contentStyleFile: [data.url('varnam.css')],
	contentScriptFile: contentScripts,
	contentScriptOptions: options,
	attachTo: ["existing", "top"],
	onAttach: function(worker) {
		workers.push(worker);
		worker.on("detach", function() {
			var index = workers.indexOf(worker);
			if (index >= 0) workers.splice(index, 1);
		});
		worker.port.on("fetchSuggestions", fetchSuggestions);
		worker.port.on("learnWord", learnWord);
		worker.port.on("enableOrDisableVarnam", enableOrDisableVarnam);
	}
});

page.include.add("about:home");

function createContextMenu(kontext) {
	var enableOrDisable = contextMenu.Item({
		label: "Enable",
		data: 'enable',
		contentScriptFile: [data.url('enable_disable.js')],
		context: kontext,
		onMessage: function(data) {
			if (data.kind == 'context') {
				this.data = data.data;
			}
		}
	}),
	separator = contextMenu.Separator(),
	hindi = contextMenu.Item({
		label: "Hindi",
		data: 'hi',
		context: kontext
	});
	malayalam = contextMenu.Item({
		label: "Malayalam",
		data: 'ml',
		context: kontext
	});
	var varnamMenu = contextMenu.Menu({
		label: "Varnam",
		context: kontext,
		contentScriptWhen: 'ready',
		contentScriptFile: [data.url('context_menu.js')],
		items: [enableOrDisable, separator, hindi, malayalam],
		image: data.url('icons/icon.png'),
		onMessage: function(data) {
            enableOrDisableVarnam (data);
		}
	});

	return varnamMenu;
};

function enableOrDisableVarnam(options) {
    var action = 'initVarnam';
    if (options.data == 'disable') {
        action = 'disableVarnam';
    }
    else if (options.data == 'enable') {
        // We are enabling varnam without saying which language to use. So just using the preferred one
        options.data = prefs.language;
        if (options.data === null || options.data == '' || options.data == 'none') {
            // No preferred language available.
            notifyUser("Error while enabling varnam. Default language is not set. Click on the language name or set a default language from the preferences screen (Tools -> Add-ons -> Extensions -> Preferences) before enabling varnam");
            return;
        }
    }
    else {
        // If no default language is set, setting current one as the default language
        if (prefs.language == 'none') {
            prefs.language = options.data;
        }
    }
    emitSafely(action, options);
}

function validUrl(urlLikeString) {
    return /((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(urlLikeString);
}

function varnamServer() {
    var defaultServer = "http://varnamproject.com";
    var serverFromPrefs = prefs.varnamServer.replace(" ", "");
    if(validUrl(serverFromPrefs)) {
        return serverFromPrefs;
    } else {
        return defaultServer;
    }
}

function fetchUrl() {
    return varnamServer().concat('/tl');
}

function learnUrl() {
    return varnamServer().concat('/learn');
}

function fetchSuggestions(data) {
	var suggestionsRequest = request({
		url: fetchUrl(),
		headers: {
			Connection: 'keep-alive'
		},
		content: {
			text: data.word,
			lang: data.lang
		},
		onComplete: function(response) {
            emitSafely('showPopup', response.json);
		}
	});
	suggestionsRequest.get();
}

function learnWord(data) {
	var learnRequest = request({
		url: learnUrl(),
		headers: {
			Connection: 'keep-alive'
		},
		content: {
			text: data.word,
			lang: data.lang
		}
	});
	learnRequest.post();
}

function getActiveWorker() {
	for (var i = 0; i < workers.length; i++) {
		if (workers[i].tab === tabs.activeTab) {
			return workers[i];
		};
	}
	return undefined;
}

var searchMenu = createContextMenu(contextMenu.SelectorContext("textarea, input"));

var enableHotKey = Hotkey({
	combo: "accel-shift-v",
	onPress: function() {
        // This is a toggle hotkey. If varnam is enable, this will disable else it will be enabled
        // This sends a enableOrDisable message
        emitSafely('enableOrDisable', {});
	}
});

function notifyUser(message) {
	notifications.notify({
		title: "Varnam",
		text: message
	});
}

function emitSafely(funcName, payload) {
    try {
        var worker = getActiveWorker();
        if (worker) {
            worker.port.emit(funcName, payload);
        }
    }
    catch(e) {
        // Ignoring exceptions because SDK may throw error if user accidently moved away from the current page
        // where page-mod is registered
    }
}

var addontab = require("addon-page");
exports.main = function(options, callbacks) {
	if (options.loadReason == 'install') {
		require("tabs").open(data.url("howto.html"));
	}
};

