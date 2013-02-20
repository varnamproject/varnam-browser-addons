var suggestionDivId = "varnam_ime_suggestions",
suggestionDiv = "#" + suggestionDivId,
suggestionList = suggestionDiv + ' ul',
selectedItemId = 'varnam_ime_selected',
selectedItem = "#" + selectedItemId,
closeButtonId = 'varnam_suggestions_close',
closeButton = '#' + closeButtonId,
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
	QUOTE: 222,
	SEMICOLON: 59
},
WORD_BREAK_CHARS = [KEYS.ENTER, KEYS.TAB, KEYS.SPACE, KEYS.PERIOD, KEYS.QUESTION, KEYS.EXCLAMATION, KEYS.COMMA, KEYS.LEFT_BRACKET, KEYS.RIGHT_BRACKET, KEYS.SEMICOLON, KEYS.QUOTE],
skipTextChange = false,
activeElement = null;

self.port.on('initVarnam', initVarnam);
self.port.on('disableVarnam', disableVarnam);
self.port.on('showPopup', showPopup);

function findElementById(id) {
	var element = document.getElementById(id);
	if (element) return element;

	var frames = document.getElementsByTagName('iframe');
	for (var i = 0; i < frames.length; i++) {
		var frame = frames[i];
		try {
			element = frame.contentDocument.documentElement.getElementById(id);
			if (element) return element;
		}
		catch(e) {}
	}

	return null;
}

function initVarnam(data) {
	var active = findElementById(data.id);
	if (!active) {
		active = document.activeElement;
		if (active.localName != 'textarea' && active.localName != 'input') {
			console.log('Unable to init varnam. Varnam can be initialized only on a textarea and input');
			return;
		}
	}

	if (active != document.body) {
		active.setAttribute('data-varnam-lang', data.data);
		active.setAttribute('data-varnam-input-value', active.value);

		$(active).off('keydown', hookVarnamIME);
		$(active).on('keydown', hookVarnamIME);
		$(active).off('keyup', showSuggestions);
		$(active).on('keyup', showSuggestions);
	}
}

function disableVarnam(data) {
	var active = findElementById(data.id);
	if (!active) {
		active = document.activeElement;
	}
	if (active != document.body) {
		active.removeAttribute('data-varnam-lang');
		active.removeAttribute('data-varnam-input-value');
		$(active).off('keydown', hookVarnamIME);
		$(active).off('keyup', showSuggestions);
	}
}

function hookVarnamIME(e) {
	var event = $.event.fix(e);
	activeElement = event.target;
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
	} else if (isWordBreakKey(event.keyCode)) {
		skipTextChange = true;
	}
}

function getCurrentLanguage() {
	var lang = document.activeElement.getAttribute('data-varnam-lang');
	return lang;
}

function showSuggestions() {
	var wordUnderCaret = getWordUnderCaret(document.activeElement);

	var lang = getCurrentLanguage();
	if ($.trim(wordUnderCaret.word) != '') {
		if (hasTextChanged() && ! skipTextChange) {

			showProgress();

			// Fetch suggestions from server
			self.port.emit("fetchSuggestions", {
				lang: lang,
				word: wordUnderCaret.word
			});
		}
	}
	else {
		hidePopup();
	}
}

function showProgress() {
	createSuggestionsDiv();

	$(suggestionList).empty();
	$(suggestionList).append($('<li>').append($('<img>', {
		src: self.options.progressImage
	})));

	positionPopup(document.activeElement);
}

function showPopup(data) {
	var active = document.activeElement;
	if (active != undefined && active != document.body) {
		var wordUnderCaret = getWordUnderCaret(active);
		if ($.trim(wordUnderCaret.word) != '' && wordUnderCaret.word == data.input) {
			populateSuggestions(data);
			positionPopup(active);
		}
	}
}

function hidePopup() {
	$(suggestionDiv).hide();
}

function positionPopup(editor) {
	var pos = getWordBeginingPosition(editor);
	var rects = editor.getClientRects();
	if (rects.length > 0) {
		var rect = rects[0];
		var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
		var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
		var height = $(window).height() - $(suggestionDiv).height();
		var topPos = rect.top + pos.top + 25;
		if (height < topPos) {
			topPos = topPos - $(suggestionDiv).height() - 40;
		}

		var viewportWidth = $(window).width();
		var calculatedLeft = rect.left + scrollLeft + pos.left;
		var suggestionDivsRight = calculatedLeft + $(suggestionDiv).width();
		if (suggestionDivsRight > viewportWidth) {
			// Right side of suggestion list is going off the screen
			var diff = suggestionDivsRight - viewportWidth;
			calculatedLeft = calculatedLeft - diff - 10;
		}

		$(suggestionDiv).css({
			display: 'block',
			position: 'absolute',
			top: topPos + scrollTop + 'px',
			left: calculatedLeft + 'px',
			'z-index': '25000'
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
	if (prev) {
		$(editor).setSelection(prev.start, prev.end);
	}

	return pos;
}

function populateSuggestions(data) {
	createSuggestionsDiv();
	$(suggestionList).empty();

	$.each(data.result, function(index, value) {
		if (index === 0) {
			$(suggestionList).append($("<li>", {
				class: "selected",
				id: selectedItemId,
				text: value
			}));
		} else {
			$(suggestionList).append($("<li>", {
				text: value
			}));
		}
	});

	// Appending the English text
	$(suggestionList).append($("<li>", {
		text: data.input
	}));

	$(suggestionList + ' li').off('click', suggestedItemClicked);
	$(suggestionList + ' li').on('click', suggestedItemClicked);
}

function suggestedItemClicked(event) {
	var text = $(this).text();
	if (activeElement) {
		$(activeElement).focus();
		replaceWordUnderCaret(text);
	}
}

function createSuggestionsDiv() {
	if ($(suggestionDiv).length <= 0) {
		var div = document.createElement('div');
		div.setAttribute('id', suggestionDivId);
		div.setAttribute('style', 'display: none;');

		var span = document.createElement('span');
		span.setAttribute('id', closeButtonId);
		span.setAttribute('class', 'closebtn');
		var xMark = document.createTextNode('X');
		span.appendChild(xMark);
		div.appendChild(span);
		div.appendChild(document.createElement('ul'));

		var bodies = document.getElementsByTagName('body');
		for (var i = 0; i < bodies.length; i++) {
			bodies[i].appendChild(div);
		}
		$(closeButton).on('click', hidePopup);
	}
}

function replaceWordUnderCaret(text) {
	var editor = document.activeElement;
	var w = getWordUnderCaret(document.activeElement);
	$(editor).setSelection(w.start, w.end);
	$(editor).replaceSelectedText(text);
	hidePopup();
	learnWord(text);
}

function learnWord(text) {
	var lang = getCurrentLanguage();
	self.port.emit("learnWord", {
		lang: lang,
		word: text
	});
}

function handleSelectionOnSuggestionList(event) {
	if (event.keyCode == KEYS.UP_ARROW) {
		var selected = $(selectedItem);
		selected.removeAttr('id');
		selected.removeAttr('class');
		var nextSelection = null;
		if (selected.prev().length == 0) {
			nextSelection = selected.siblings().last();
		} else {
			nextSelection = selected.prev();
		}
		nextSelection.attr("id", selectedItemId);
		nextSelection.addClass('selected');
		event.preventDefault();
		return false;
	}

	if (event.keyCode == KEYS.DOWN_ARROW) {
		var selected = $(selectedItem);
		selected.removeAttr('id');
		selected.removeAttr('class');
		var nextSelection = null;
		if (selected.next().length == 0) {
			nextSelection = selected.siblings().first();
		} else {
			nextSelection = selected.next();
		}
		nextSelection.attr("id", selectedItemId);
		nextSelection.addClass('selected');
		event.preventDefault();
		return false;
	}
}

function hasTextChanged() {
	var active = document.activeElement;
	var oldValue = active.getAttribute('data-varnam-input-value');
	var newValue = $(active).val();
	if (oldValue != newValue) {
		active.setAttribute('data-varnam-input-value', active.value);
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
	var exists = $.inArray(keyCode, WORD_BREAK_CHARS) == - 1 ? false: true;
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

