var varnamMenu = chrome.contextMenus.create({
    "title": "Varnam",
    "contexts": ["editable"]
});
var english = chrome.contextMenus.create({
    "title": "English",
    "parentId": varnamMenu,
    "id": "varnam_en",
    "contexts": ["editable"],
    "onclick": handleLanguageSelection
});
var malayalam = chrome.contextMenus.create({
    "title": "Malayalam",
    "parentId": varnamMenu,
    "id": "varnam_ml",
    "contexts": ["editable"],
    "onclick": handleLanguageSelection
});

function handleLanguageSelection(info, tab) {
    var lang = info.menuItemId.replace("varnam_", "");
    chrome.tabs.sendMessage(tab.id, {
        action: "LanguageSelect",
        language: lang
    });
}

function fetchSuggestions(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    action: "trans",
                    data: JSON.parse(xhr.responseText)
                });
            });
        }
    };
    xhr.send();
}

function learnWord(data) {
  var vurl = 'http://www.varnamproject.com/learn';
  var xhr = new XMLHttpRequest();
  xhr.open("POST", vurl, true);
  xhr.send(data.params);
}

chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
      switch(request.action){
        case 'fetch':
          fetchSuggestions(request.vurl);
        break;
        case 'learnWord':
          learnWord(request);
        break;
      }
  });
