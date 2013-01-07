(function() {
    var data = require("self").data,
        contextMenu = require("context-menu"),
        tabs = require('tabs'),
        request = require("request").Request,
        contentScripts = [data.url("jquery-1.8.2.min.js"), data.url("textinputs_jquery.js"), data.url("caret.js"), data.url("varnam.js")];

    var workers = [];
    var pageMod = require("page-mod");
    var page = pageMod.PageMod({
        include: '*',
        contentScriptWhen: 'ready',
        contentScriptFile: contentScripts,
        onAttach: function(worker) {
            workers.push(worker);
            worker.on("detach", function() {
                var index = workers.indexOf(worker);
                if (index >= 0) workers.splice(index, 1);
            });
        }
    });

    function createContextMenu(kontext) {
        var english = contextMenu.Item({
            label: "English",
            data: 'en'
        }),
            malayalam = contextMenu.Item({
                label: "Malayalam",
                data: 'ml'
            });
        var searchMenu = contextMenu.Menu({
            label: "Varnam",
            context: kontext,
            contentScriptFile: contentScripts,
            items: [english, malayalam],
            onMessage: function(data) {
                fetchSuggestions(data);
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

    function getActiveWorker() {
        for (var i = 0; i < workers.length; i++) {
            if (workers[i].tab === tabs.activeTab) {
                return workers[i];
            };
        }
        return undefined;
    }

    var searchMenu = createContextMenu(contextMenu.SelectorContext("textarea, input"));

    // Uncomment below line for testing
    page.include.add(data.url("test.html"));
    require("tabs").activeTab.url = data.url("test.html");
})();