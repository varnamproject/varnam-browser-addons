var varnamMenu = chrome.contextMenus.create({"title": "Varnam IME", "contexts":["editable"]});
var english = chrome.contextMenus.create({"title": "English", "parentId": varnamMenu, "id" : "varnam_eng", "contexts":["editable"], "onclick": handleLanguageSelection});
var malayalam = chrome.contextMenus.create({"title": "Malayalam", "parentId": varnamMenu,"id" : "varnam_ml","contexts":["editable"], "onclick": handleLanguageSelection});

function handleLanguageSelection(info,tab){
  var lang = info.menuItemId.replace("varnam_","");
  chrome.tabs.sendMessage(tab.id, {action: "LanguageSelect",language: lang });
}



chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
      if(request.action == "fetch"){
          var xhr = new XMLHttpRequest();
          xhr.open("GET", request.vurl, true);
          xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
              chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {action: "trans",data: JSON.parse(xhr.responseText)});
              });
            }
          }
        xhr.send();
      }
    });
