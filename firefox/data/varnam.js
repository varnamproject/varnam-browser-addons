(function() {
    var suggestionDivId = "varnam_ime_suggestions",
        suggestionDiv = "#" + suggestionDivId,
        suggestionList = suggestionDiv + ' ul',
        selectedItemId = 'varnam_ime_selected',
        selectedItem = "#" + selectedItemId,
        KEYS = {
            ESCAPE: 27,
            ENTER: 13,
            TAB: 9,
            SPACE: 32,
            PERIOD: 190,
            UP_ARROW: 38,
            DOWN_ARROW: 40,
            QUESTION: 191,
            EXCLAMATION: 49,
            COMMA: 188,
            LEFT_BRACKET: 57,
            RIGHT_BRACKET: 48,
            SEMICOLON: 59
        },
        WORD_BREAK_CHARS = [KEYS.ENTER, KEYS.TAB, KEYS.SPACE, KEYS.PERIOD, KEYS.QUESTION, KEYS.EXCLAMATION, KEYS.COMMA, KEYS.LEFT_BRACKET, KEYS.RIGHT_BRACKET, KEYS.SEMICOLON],
        skipTextChange = false;

    self.on('click', function(node, data) {
        var active = document.activeElement;
        if (active) {
            $(active).data('varnam-lang', data);
            $(active).data('varnam-input-value', active.value);

            $(active).off('keydown', hookVarnamIME);
            $(active).on('keydown', hookVarnamIME);
            $(active).off('keyup', showSuggestions);
            $(active).on('keyup', showSuggestions);
        }
    });

    self.port.on('showPopup', function(data) {
        populateSuggestions(data);
        var active = document.activeElement;
        console.log(active.type);
        if (active && getWordUnderCaret(active).word == data.input) {
            positionPopup(active);
            stylePopup();
        }
    });

    function hidePopup() {
        $(suggestionDiv).hide();
    }

    function positionPopup(editor) {
        var pos = getWordBeginingPosition(editor);
        var rects = editor.getClientRects();
        if (rects.length > 0) {
            var popupHeight = $(suggestionDiv).height();
            var popupWidth = $(suggestionDiv).width();
            console.log("popup height " + popupHeight);
            console.log("popup width " + popupWidth);
            console.log("window scrollY " + window.scrollY);
            console.log("editor offset " + $(editor).offset().top);
            console.log("window height " + $(window).height());
            console.log("document height " + $(document).height());

            var rect = rects[0];
            console.log('popup position ' + (window.scrollY + rect.top + pos.top));
            $(suggestionDiv).css({
                display: 'block',
                position: 'absolute',
                top: window.scrollY + rect.top + pos.top,
                left: rect.left + pos.left,
                'z-index': 25000
            });
        }



        //     if ((y + popupHeight) > editor.position().top + editor.innerHeight()) {
        //         popup.css('top', (y - popupHeight) + 'px');
        //     }
        //     if ((x + popupWidth) > editor.position().left + editor.innerWidth()) {
        //         popup.css('left', (x - popupWidth) + 'px');
        //     }
        // console.log($(suggestionDiv).height());
        // console.log($(suggestionDiv).innerHeight());
    }

    function stylePopup() {
        $(suggestionList).css({
            border: '1px solid rgba(0, 0, 0, 0.2)',
            'border-radius': '6px 6px 6px 6px',
            'box-shadow': '0 5px 10px rgba(0, 0, 0, 0.2)',
            display: 'block',
            float: 'left',
            'list-style': 'none outside none',
            margin: '0',
            padding: '5px 0',
            position: 'static',
            top: '100%',
            'z-index': '1000'
        });
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
        if (prev) {
            $(editor).setSelection(prev.start, prev.end);
        }

        return pos;
    }

    function populateSuggestions(data) {
        createSuggestionsDiv();
        var html = "";
        $.each(data.result, function(index, value) {
            if (index === 0) {
                html += '<li id="' + selectedItemId + '">' + value + '</li>';
            } else {
                html += '<li>' + value + '</li>';
            }
        });
        $(suggestionList).html(html);
    }

    function createSuggestionsDiv() {
        if ($(suggestionDiv).length <= 0) {
            var divHtml = '<div id="' + suggestionDivId + '" style="display: none;"><ul></ul></div>';
            $("body").append(divHtml);
        }
    }

    function replaceWordUnderCaret(text) {
        var editor = document.activeElement;
        var w = getWordUnderCaret(document.activeElement);
        $(editor).setSelection(w.start, w.end);
        $(editor).replaceSelectedText(text);
        hidePopup();
    }

    function hookVarnamIME(e) {
        var event = $.event.fix(e);
        if (event.keyCode == KEYS.ESCAPE) {
            hidePopup();
            return;
        }
        skipTextChange = false;

        if (event.keyCode == KEYS.DOWN_ARROW || event.keyCode == KEYS.UP_ARROW) {
            handleSelectionOnSuggestionList(event);
        }

        if (isSuggestionsVisible()) {
            if (isWordBreakKey(event.keyCode)) {
                var text = getSelectedText();
                if (text !== undefined && text !== '') {
                    replaceWordUnderCaret(text);
                    if (event.keyCode == KEYS.ENTER) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }
                skipTextChange = true;
            }
        }
        else if (isWordBreakKey(event.keyCode)) {
            skipTextChange = true;
        }
    }

    function showSuggestions() {
        if (hasTextChanged() && !skipTextChange) {
            // Fetch suggestions from server
            self.postMessage({
                lang: $(document.activeElement).data('varnam-lang'),
                word: getWordUnderCaret(document.activeElement).word
            });
        }
    }

    function handleSelectionOnSuggestionList(event) {
        if (event.keyCode == KEYS.UP_ARROW) {
            var selected = $(selectedItem);
            selected.removeAttr('id');
            selected.removeAttr('style');
            var nextSelection = null;
            if (selected.prev().length == 0) {
                nextSelection = selected.siblings().last();
            } else {
                nextSelection = selected.prev();
            }
            nextSelection.attr("id", selectedItemId);
            nextSelection.css({
                'background-color': 'grey'
            });
        }

        if (event.keyCode == KEYS.DOWN_ARROW) {
            var selected = $(selectedItem);
            selected.removeAttr('id');
            selected.removeAttr('style');
            var nextSelection = null;
            if (selected.next().length == 0) {
                nextSelection = selected.siblings().first();
            } else {
                nextSelection = selected.next();
            }
            nextSelection.attr("id", selectedItemId);
            nextSelection.css({
                'background-color': 'grey'
            });
        }
    }

    function hasTextChanged() {
        var active = document.activeElement;
        var oldValue = $(active).data('varnam-input-value');
        var newValue = $(active).val();
        if (oldValue != newValue) {
            $(active).data('varnam-input-value', active.value);
            return true;
        }
        return false;
    }

    function isWordBoundary(text) {
        if (text === null || text === "" || text == " " || text == "\n" || text == "." || text == "\t" || text == "\r" || text == "\"" || text == "'" || text == "?" || text == "!" || text == "," || text == "(" || text == ")" || text == "\u000B" || text == "\u000C" || text == "\u0085" || text == "\u2028" || text == "\u2029" || text == "\u000D" || text == "\u000A" || text == ";") {
            return true;
        }
        return false;
    }

    function isWordBreakKey(keyCode) {
        var exists = $.inArray(keyCode, WORD_BREAK_CHARS) == -1 ? false : true;
        if (exists) {
            return true;
        }
        return false;
    }

    function getSelectedText() {
        return $(selectedItem).text();
    }

    function isSuggestionsVisible() {
        return $(suggestionDiv).is(':visible');
    }

    function getWordUnderCaret(editor) {
        var insertionPoint = editor.selectionStart;
        var startAt = 0;
        var endsAt = 0;
        var lastPosition = $(editor).val().length + 1;
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
            word: $(editor).val().substring(startAt, endsAt)
        };
    }
})();