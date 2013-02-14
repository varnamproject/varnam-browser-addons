var data = require("self").data,
contextMenu = require("context-menu"),
tabs = require('tabs'),
request = require("request").Request,
prefs = require("simple-prefs").prefs,
contentScripts = [data.url("jquery-1.8.2.min.js"), data.url("textinputs_jquery.js"), data.url("caret.js"), data.url("varnam.js")];

var options = {
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
	var disable = contextMenu.Item({
		label: "Disable",
		data: 'disable',
		context: kontext
	}),
	separator = contextMenu.Separator(),
	malayalam = contextMenu.Item({
		label: "Malayalam",
		data: 'ml',
		context: kontext
	});
	var searchMenu = contextMenu.Menu({
		label: "Varnam",
		context: kontext,
		contentScriptWhen: 'ready',
		contentScript: "self.on('click', function(node, data) {self.postMessage({'data': data, 'id': node.id});});",
		items: [disable, separator, malayalam],
		image: data.url('icons/icon.png'),
		onMessage: function(data) {
			var worker = getActiveWorker();
			if (worker) {
				if (data.data == 'disable') {
					worker.port.emit('disableVarnam', data);
				}
				else {
					worker.port.emit('initVarnam', data);
				}
			}
		}
	});
	return searchMenu;
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

var addontab = require("addon-page");
exports.main = function(options, callbacks) {
	if (options.loadReason == 'install') {
		require("tabs").open(data.url("howto.html"));
	}
};

