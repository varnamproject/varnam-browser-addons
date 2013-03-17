function save_language () {
  var select = document.getElementById("language");
  var language = select.children[select.selectedIndex].value;
  localStorage["default_language"] = language;
}

function restore_options () {
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
}
document.querySelector('#language').addEventListener('change', save_language);
document.addEventListener('DOMContentLoaded', restore_options);
