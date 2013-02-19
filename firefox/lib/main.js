const data = require("self").data;
const contextMenu = require("context-menu");
const tabs = require('tabs');
const request = require("request").Request;
const prefs = require("simple-prefs").prefs;
const {
	Hotkey
} = require("sdk/hotkeys");
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
	}
});

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
		items: [enableOrDisable, separator, malayalam],
		image: data.url('icons/icon.png'),
		onMessage: function(data) {
			// This will be called when any item in the menu gets a click
			var worker = getActiveWorker();
			if (!worker) {
				return;
			}

			var action = 'initVarnam';
			if (data.data == 'disable') {
				action = 'disableVarnam';
			}
			else if (data.data == 'enable') {
				// We are enabling varnam without saying which language to use. So just using the preferred one
				data.data = prefs.language;
				if (data.data == 'none') {
					action = 'failedEnable';
				}
			}
			else {
				// If no default language is set, setting current one as the default language
				if (prefs.language == 'none') {
					prefs.language = data.data;
				}
			}
			worker.port.emit(action, data);

		}
	});
	return varnamMenu;
};

function fetchSuggestions(data) {
	var suggestionsRequest = request({
		url: 'http://varnamproject.com/tl',
		headers: {
			Connection: 'keep-alive'
		},
		content: {
			text: data.word,
			lang: data.lang
		},
		onComplete: function(response) {
			var worker = getActiveWorker();
			if (worker) {
				worker.port.emit('showPopup', response.json);
			}
		}
	});
	suggestionsRequest.get();
}

function learnWord(data) {
	var learnRequest = request({
		url: 'http://varnamproject.com/learn',
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
		var worker = getActiveWorker();
		if (!worker) {
			return;
		}

		worker.port.emit('initVarnam', {
			data: prefs.language,
			id: ''
		});
	}
});

var addontab = require("addon-page");
exports.main = function(options, callbacks) {
	if (options.loadReason == 'install') {
		require("tabs").open(data.url("howto.html"));
	}
};

