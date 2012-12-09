self.on('click', function(node, data) {
    var active = document.activeElement;
    if (active) {
        $(active).data('varnam-lang', data);
        $(active).off('keyup', hookVarnamIME);
        $(active).on('keyup', hookVarnamIME);
    }
});

self.port.on('showPopup', function(data) {
    alert(data.result[0]);
});

function hookVarnamIME() {
    console.log("Word - " + getWordUnderCaret(document.activeElement).word);
    console.log("Language - " + $(document.activeElement).data('varnam-lang'));
    self.postMessage({lang: $(document.activeElement).data('varnam-lang'), word: getWordUnderCaret(document.activeElement).word});
}

function isWordBoundary(text) {
    if (text === null || text === "" || text == " " || text == "\n" || text == "." || text == "\t" || text == "\r" || text == "\"" || text == "'" || text == "?" || text == "!" || text == "," || text == "(" || text == ")" || text == "\u000B" || text == "\u000C" || text == "\u0085" || text == "\u2028" || text == "\u2029" || text == "\u000D" || text == "\u000A" || text == ";") {
        return true;
    }
    return false;
}

function getWordUnderCaret(editor) {
    var insertionPoint = editor.selectionStart;
    var startAt = 0;
    var endsAt = 0;
    var lastPosition = editor.value.length + 1;
    var text = '';

    // Moving back till we hit a word boundary
    var caretPos = insertionPoint;
    startAt = insertionPoint;
    while (caretPos) {
        text = editor.value.substring(caretPos - 1, caretPos);
        if (isWordBoundary(text)) {
            break;
        }--caretPos;
        startAt = caretPos;
    }

    endsAt = insertionPoint;
    caretPos = insertionPoint;
    while (caretPos < lastPosition) {
        text = editor.value.substring(caretPos, caretPos + 1);
        if (isWordBoundary(text)) {
            break;
        }++caretPos;
        endsAt = caretPos;
    }

    return {
        start: startAt,
        end: endsAt,
        word: editor.value.substring(startAt, endsAt)
    };
}

