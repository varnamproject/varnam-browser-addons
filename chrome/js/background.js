var varnamMenu = chrome.contextMenus.create({
    "title": "Varnam",
    "contexts": ["editable"]
});

var disableOrEnable = chrome.contextMenus.create({
    "type": "checkbox",
    "title": "Enable",
    "parentId": varnamMenu,
    "id": "varnam_disable",
    "checked": true,
    "contexts": ["editable"],
    "onclick": disableOrEnableVarnam
});

var separator = chrome.contextMenus.create({
    type: "separator",
    parentId: varnamMenu,
    contexts: ["editable"]
});

var hindi = chrome.contextMenus.create({
    "title": "Hindi",
    "parentId": varnamMenu,
    "id": "varnam_hi",
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
    default_language=localStorage["default_language"];
  if(!default_language || default_language == ''){
    localStorage["default_language"]=lang;
  }
    chrome.tabs.sendMessage(tab.id, {
        action: "LanguageSelect",
        language: lang,
        server: varnamServer()
    });
}

function disableOrEnableVarnam(info, tab) {
    chrome.tabs.sendMessage(tab.id, {
    action: "VarnamEnable",
    enable: info.checked,
        language: localStorage["default_language"],
        server: varnamServer()
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

function endsWith(original, suffix) {
    return original.indexOf(suffix, original.length - suffix.length) !== -1;
}

function varnamServer() {
    var serverInStorage = localStorage['varnam_server'];
    if(validUrl(serverInStorage)) {
        if (!endsWith(serverInStorage, "/"))
            serverInStorage += "/";
        return serverInStorage;
    } else {
        return defaultVarnamServer();
    }
}

function defaultVarnamServer() {
  return "http://www.varnamproject.com/";
}

function validUrl(urlLikeString) {
    return /((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(urlLikeString);
}

function varnamLearnUrl() {
    return varnamServer().concat('learn');
}

function learnWord(data) {
    var vurl = varnamLearnUrl();
    var xhr = new XMLHttpRequest();
    xhr.open("POST", vurl, true);
    xhr.send(data.params);
}

chrome.extension.onMessage.addListener(
function(request, sender, sendResponse) {
    switch (request.action) {
    case 'fetch':
        fetchSuggestions(request.vurl);
        break;
    case 'learnWord':
        learnWord(request);
        break;
    case 'contextMenu':
    chrome.contextMenus.update(
    disableOrEnable,
    {
      type: 'checkbox',
      checked: request.text === 'true'
    });
    break;
    }
});
