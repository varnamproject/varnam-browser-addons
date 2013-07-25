function saveOptions() {
  saveLanguageConfig();
  saveServerConfig();
}

function saveServerConfig() {
  var serverInput = document.getElementById("server");
  var server = serverInput.value;
  if(validUrl(server)) {
    localStorage["varnam_server"] = server;
  } else {
    serverInput.value = defaultVarnamServer();
    localStorage["varnam_server"] = defaultVarnamServer();
  }
}

function saveLanguageConfig () {
  var select = document.getElementById("language");
  var language = select.children[select.selectedIndex].value;
  localStorage["default_language"] = language;
}

function validUrl(urlLikeString) {
    return /((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(urlLikeString);
}

function defaultVarnamServer() {
  return "http://varnamproject.com";
}

function restoreServerConfig() {
  var serverInput = document.getElementById("server");
  var varnamServer = localStorage["varnam_server"];
  if(!varnamServer) {
      serverInput.value =  defaultVarnamServer();
  } else {
      serverInput.value = varnamServer;
  }
}

function restoreOptions () {
  var language = localStorage["default_language"];
  if (!language) {
    return;
  }
  var select = document.getElementById("language");
  for (var i = 0; i < select.children.length; i++) {
    var child = select.children[i];
    if (child.value == language) {
      child.selected = "true";
      break;
    }
  }
  restoreServerConfig();
}
document.querySelector('#save').addEventListener('click', saveOptions);
document.addEventListener('DOMContentLoaded', restoreOptions);
