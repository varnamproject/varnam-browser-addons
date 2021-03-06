(function() {
	var isHovering=false;
	chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
		if (request.action == "LanguageSelect") {
			initVarnam(request.language, request.server);
		} else if (request.action == "trans") {
			displaySugg(request.data);
		}
		else if (request.action == 'VarnamEnable') {
			if(!request.enable){
				disableVarnam();
			}else{
				if(!request.language || request.Language == ''){
					alert("Error while enabling varnam. Default language is not set. Click on the language name or set a default language from the preferences screen (Menu -> Settings -> Extensions -> Varnam -> Options) before enabling varnam");
					return;
				}
				initVarnam(request.language, request.server);
			}
		}
	});

	function listenDocumentEvents() {
		window.document.addEventListener('mouseover', function(e) {
			var event = $.event.fix(e);
			var active = event.target;
			var lang = $(active).data('varnam-lang');
			if (!lang || lang == 'en' || lang == '') {
				chrome.extension.sendMessage({
					action: "contextMenu",
					text: "false"});
			}else{
				chrome.extension.sendMessage({
					action: "contextMenu",
					text: "true"});
			}
		});
	}

	function initVarnam(data, server) {
		var active = window.document.activeElement;
		if (active) {
			$(active).data('varnam-lang', data);
			$(active).data('varnam-server', server);
			$(active).data('varnam-input-value', active.value);

			$(active).off('keydown', hookVarnamIME);
			$(active).on('keydown', hookVarnamIME);
			$(active).off('keyup', showSuggestions);
			$(active).on('keyup', showSuggestions);
		}
	}

	function disableVarnam() {
		var active = window.document.activeElement;
		if (active) {
			$(active).removeData('varnam-lang');
			$(active).removeData('varnam-server');
			$(active).removeData('varnam-input-value');
			$(active).off('keydown', hookVarnamIME);
			$(active).off('keyup', showSuggestions);
		}
	}

	var suggestionDivId = "varnam_ime_suggestions",
	suggestionDiv = "#" + suggestionDivId,
	suggestionList = suggestionDiv + ' ul',
	suggestedItem = suggestionDiv + suggestionList + ' option',
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

	function displaySugg(data) {
		var active = document.activeElement;
		if (active && getWordUnderCaret(active).word == data.input) {
			populateSuggestions(data);
			positionPopup(active);
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
		var html = "";
		if (data.result.length <= 0) {
			hidePopup();
			return;
		}
		$.each(data.result, function(index, value) {
			if (index === 0) {
				html += '<li class="varnam_selected">' + value + '</li>';
			} else {
				html += '<li>' + value + '</li>';
			}
		});
		html += "<li>" + data.input + "</li>";
		$(suggestionList).html(html);

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
			var divHtml = '<div id="' + suggestionDivId + '" style="display: none;"><span id="' + closeButtonId + '"">X</span><ul></ul></div>';

			$("body").append(divHtml);
			$(closeButton).on('click', hidePopup);
		}
	}
	function handleSelectionOnSuggestionList(event) {
		$(suggestionList).focus();
		var selectedItem = $("li.varnam_selected").first();
		$(selectedItem).removeClass('varnam_selected');
		var nextSelection = null;

		if (event.keyCode == KEYS.UP_ARROW) {
			if (selectedItem.prev().length === 0) {
				nextSelection = selectedItem.siblings().last();
			} else {
				nextSelection = selectedItem.prev();
			}
		}
		if (event.keyCode == KEYS.DOWN_ARROW) {
			if (selectedItem.next().length === 0) {
				nextSelection = selectedItem.siblings().first();
			} else {
				nextSelection = selectedItem.next();
			}
		}
		$(nextSelection).addClass("varnam_selected");
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
			event.preventDefault();
			event.stopPropagation();
		}
		if (isSuggestionsVisible()) {
			if (isWordBreakKey(event.keyCode)) {
				var word = $("li.varnam_selected").first().text();
				if (word !== undefined && $.trim(word) !== '') {
					replaceWordUnderCaret(word);
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

	function isSuggestionsVisible() {
		return $(suggestionDiv).is(':visible');
	}

	function replaceWordUnderCaret(text) {
		var editor = window.document.activeElement;
		var w = getWordUnderCaret(document.activeElement);
		$(editor).setSelection(w.start, w.end);
		$(editor).replaceSelectedText(text);
		hidePopup();
		learnWord(text);
	}

	function learnWord(text) {
		var params = {
			'lang': $(document.activeElement).data('varnam-lang'),
			'text': text
		};
		chrome.extension.sendMessage({
			action: "learnWord",
			text: params.text,
			lang: params.lang,
			params: $.param(params)
		});
	}

    function suggestionUrlFor(server, lang, text) {
        return server.concat("tl/").concat(lang).concat("/").concat(text);
    }

	function showSuggestions() {
		var lang = $(document.activeElement).data('varnam-lang');
		if (lang == 'en') {
			return;
		}
		var wordUnderCaret = getWordUnderCaret(document.activeElement);
		if ($.trim(wordUnderCaret.word) !== '') {
			if (hasTextChanged() && ! skipTextChange) {
				showProgress();
				var text = wordUnderCaret.word;
                var lang = $(document.activeElement).data('varnam-lang');
                var server = $(document.activeElement).data('varnam-server');
				var vurl = suggestionUrlFor(server, lang, text);
				chrome.extension.sendMessage({
					action: "fetch",
					"vurl": vurl
				});
			}
		} else {
			hidePopup();
		}
	}

	function showProgress() {
		createSuggestionsDiv();
		var imgURL = chrome.extension.getURL("progress.gif");
		var html = '<li><img src="' + imgURL + '" /></li>';
		$(suggestionList).html(html);
		positionPopup(document.activeElement);
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
		var exists = $.inArray(keyCode, WORD_BREAK_CHARS) == - 1 ? false: true;
		if (exists) {
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
	listenDocumentEvents();
})();

