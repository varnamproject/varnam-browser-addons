
// Handles the context event for enable and disable and checks varnam attributes are available
// If available, it changes the menu item text accordingly
self.on('context', function(node) {
    var lang = document.activeElement.getAttribute('data-varnam-lang');
    if (lang) {
        // Varnam is currently enabled. So providing option to disable
        self.postMessage({kind: 'context', data: 'disable'});
        return 'Disable';
    }

    // Varnam is in disabled state. Allowing user to enable
    // Informing main.js to change the data value of the menu item
    self.postMessage({kind: 'context', data: 'enable'});
    return 'Enable';
});

