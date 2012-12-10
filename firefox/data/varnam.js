(function() {
    var suggestionDivId = "varnam_ime_suggestions",
        suggestionDiv = "#" + suggestionDivId,
        suggestionList = suggestionDiv + ' select',
        suggestedItem = suggestionDiv + suggestionList + ' option';

    self.on('click', function(node, data) {
        var active = document.activeElement;
        if (active) {
            $(active).data('varnam-lang', data);
            $(active).off('keyup', hookVarnamIME);
            $(active).on('keyup', hookVarnamIME);
        }
    });

    self.port.on('showPopup', function(data) {
        populateSuggestions(data);
        var active = document.activeElement;
        console.log(active.type);
        if (active) {
            positionPopup(active);
        }
    });

    function positionPopup(editor) {
        var pos = getWordBeginingPosition(editor);
        //$(suggestionDiv).css('display', "block");
        var rects = editor.getClientRects();
        if (rects.length > 0) {
            var rect = rects[0];
            $(suggestionDiv).css({
                display: 'block',
                position: 'absolute',
                top: rect.top + pos.top,
                left: rect.left + pos.left
            });
        }
    }

    function getWordBeginingPosition(editor) {
        // This is required to set the selection back
        $(editor).focus();
        var prev = $(editor).getSelection();

        // Moving the cursor to the beginning of the word.
        var word = getWordUnderCaret(editor);
        $(editor).setSelection(word.start, word.end);
        var pos = $(editor).getCaretPosition();

        // Moving the cursor back to the old position
        $(editor).setSelection(prev.start, prev.end);

        return pos;
    }

    function populateSuggestions(data) {
        createSuggestionsDiv();
        var html = "";
        var textWidth = 0;
        $.each(data.result, function(index, value) {
            if (index === 0) {
                html += '<option selected>' + value + '</option>';
            } else {
                html += '<option>' + value + '</option>';
            }
            if (textWidth < value.length) {
                textWidth = value.length;
            }
        });
        $(suggestionList).html(html).css('height', (data.result.length + 1) + 'em').css('width', (textWidth + 2) + 'em');
    }

    function createSuggestionsDiv() {
        if ($(suggestionDiv).length <= 0) {
            var divHtml = '<div id="' + suggestionDivId + '" style="display: none;"><select multiple="false"></select></div>';
            $("body").append(divHtml);
        }
    }

    function hookVarnamIME() {
        self.postMessage({
            lang: $(document.activeElement).data('varnam-lang'),
            word: getWordUnderCaret(document.activeElement).word
        });
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
})();