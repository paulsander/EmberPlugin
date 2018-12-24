var eton = (function(eton, $) {
    var version = '1.0.8'
      , compareVersion = function(verA, verB) {
        var v1 = verA.split(/\./)
          , v2 = verB.split(/\./)
          , verA_isNewer = !1;
        $.each(v1, function(i, e) {
            if (parseFloat((i == 0 ? "" : "0.") + v1[i]) > parseFloat((i == 0 ? "" : "0.") + v2[i])) {
                verA_isNewer = !0;
                return !1;
            }
        })
        return verA_isNewer ? verA : verB
    }
      , stat_providers = {}
      , alone = function() {
        if ($('span[id="wordcount-plugin"]').length > 1) {
            if (eton['eton_word_count']) {
                if (!eton['eton_word_count'].version) {
                    eton['eton_word_count'].version = '1.0.4'
                }
                if (version == eton['eton_word_count'].version) {
                    console.log('Closing word count plugin version ' + version + ' (same version already running)');
                } else if (compareVersion(version, eton['eton_word_count'].version) != version) {
                    console.log('Closing older word count plugin version ' + version + ' (newer version (' + eton['eton_word_count'].version + ') was detected)');
                } else {
                    console.log('Closing newer word count plugin version ' + version + ' (older version (' + eton['eton_word_count'].version + ') was detected )');
                    console.log('Please consider disabling that older word count plugin and using the newer version. If the newest version does not meet your needs then please file a report at "http://support.proboards.com/thread/453132/" so it can be fixed');
                }
            } else {
                console.log('Closing word count plugin version ' + version + ' since an older but unknown version was detected');
                console.log('Please consider disabling that older word count plugin and using the newer version. If the newest version does not meet your needs then please file a report at "http://support.proboards.com/thread/453132/" so it can be fixed');
            }
            return !1;
        }
        return !0
    }
    if (!$.fn.reverse) {
        $.fn.reverse = [].reverse;
    }
    document.write('<span id="wordcount-plugin" ></span>');
    if (!alone()) {
        return eton;
    }
    var wordcount_plugin = $('#wordcount-plugin')
      , wordcount_data = {
        version: version,
        ui_form_create: $.ui.form.prototype._create,
        last_length_count: 0,
        last_word_count: 0,
        limits: {},
        effective_limit: null,
        settings: pb.plugin.get('eton_word_count').settings,
        compareVersions: function() {
            return compareVersion.apply(this, arguments);
        }
    }
    eton["eton_word_count"] = wordcount_data;
    $.ui.form.prototype._create = function() {
        wordcount_data.ui_form_create.apply(this, arguments);
        if (!alone()) {
            return;
        }
        if (/form_(post|thread|message|conversatio)_/.test(this.element.attr('class')))
            $('.editor .ui-wysiwyg, .container.quick-reply').each(function(_index, _container) {
                var wordcount_regex = /\b[\w'-]+\b/g, quick_reply = $('.form_post_quick_reply').data("form"), WYSIWYG = $('.wysiwyg-textarea').data('wysiwyg') || (function() {
                    var wysiwyg = $.extend({}, $.ui.wysiwyg.prototype)
                    wysiwyg.editors = {
                        bbcode: {}
                    }
                    $.extend(wysiwyg.editors.bbcode, wysiwyg._bbcodeEditor);
                    wysiwyg.currentEditorName = "bbcode";
                    wysiwyg.formId = quick_reply.element.attr("id");
                    wysiwyg.editors.bbcode.textarea = wysiwyg.editors.bbcode.bindable = wysiwyg.editors.bbcode.editable = quick_reply.element[0].elements.message;
                    wysiwyg.editors.bbcode.parent = wysiwyg;
                    wysiwyg.element = $(wysiwyg.editors.bbcode.textarea);
                    wysiwyg.editorContainer = wysiwyg.editorContainer && wysiwyg.editorContainer.length ? wysiwyg.editorContainer : $(_container)
                    return wysiwyg;
                }
                )(), plugid = 'eton_word_count',
                        plugin = proboards.plugin.get(plugid),
                        targetID = (plugin.settings.alternative_target_id || "word-count"),
                        wordtotal = $("#" + targetID),
                        wmode = plugin.settings.default_mode.length ? plugin.settings.default_mode : "words",
                        user = proboards.data("user"),
                        user_mode = wmode,
                        limitmode = wmode,
                        wordcount, lengthcount, nslengthcount, paragraphcount, sentencecount, syllablecount,
                        uniquewords, complexwords, average_word_length, reading_level,
                        apm = null,
                        validation = {},
                        logger = {
                            parse: $.inArray("debug", plugin.settings.enable_debugging) != -1,
                            limit: $.inArray("debug_limits", plugin.settings.enable_debugging) != -1,
                            compat: $.inArray("debug_plugins", plugin.settings.enable_debugging) != -1
                        },
                        pluglog = "[" + plugid + "]:",
                        formb4submit,
                        temp;
                $.extend(wordcount_data, {
                    wysiwyg: WYSIWYG,
                    validation: validation,
                    settings: $.extend({}, plugin.settings),
                    mode: wmode
                })
                function log(logmsg, logcategory) {
                    if ("string" == typeof logcategory) {
                        logcategory = logger[logcategory]
                    }
                    if (logcategory && window.console) {
                        (console["info"] || console["log"])(pluglog + logmsg)
                    }
                }
                $(function() {
                })
                if (plugin.settings.word_regex) {
                    temp = $.trim(plugin.settings.word_regex).split("/");
                    if (temp.length == 3)
                        wordcount_regex = new RegExp(temp[1],temp[2]);
                    else if (temp.length == 1 && temp[0].length)
                        wordcount_regex = new RegExp(temp[0]);
                }
                if (plugin.settings.post_pattern) {
                    temp = $.trim(plugin.settings.post_pattern).split("/");
                    if (temp.length == 3)
                        plugin.settings.post_pattern = new RegExp(temp[1],temp[2]);
                    else if (temp.length == 1 && temp[0].length)
                        plugin.settings.post_pattern = new RegExp(temp[0]);
                }
                log('You are staff and staff exemption is ' + (plugin.settings.limit_staff ? "OFF (you ARE affected by limits)" : "ON (you ARE NOT affected by limits)"), user.is_staff && logger.limit)
                WYSIWYG._getTags = function(str, openChar, closeChar) {
                    var lastPos = str.length - 1;
                    var curPos = 0;
                    var tags = [];
                    var noloop = 0;
                    while (curPos <= lastPos && noloop < (arguments[3] || 100)) {
                        var openPos = str.indexOf(openChar, curPos);
                        if (openPos == -1) {
                            var text = str.substr(curPos, lastPos - curPos + 1);
                            tags.push({
                                text: text
                            });
                            curPos = lastPos + 1
                        } else {
                            var closePos = str.indexOf(closeChar, openPos);
                            if (closePos == -1) {
                                var text = str.substr(curPos, lastPos - curPos + 1);
                                tags.push({
                                    text: text
                                });
                                curPos = lastPos
                            } else {
                                var openPos2 = str.indexOf(openChar, openPos);
                                if (openPos2 < closePos) {
                                    openPos = openPos2
                                }
                                if (openPos > curPos) {
                                    var text = str.substr(curPos, openPos - curPos);
                                    tags.push({
                                        text: text
                                    })
                                }
                                var text = str.substr(openPos + 1, closePos - openPos - 1);
                                var tag = this._getTag(text);
                                if (tag) {
                                    tags.push(tag)
                                } else {
                                    tags.push({
                                        text: openChar + text + closeChar
                                    })
                                }
                                curPos = closePos + 1
                            }
                        }
                        noloop++
                    }
                    return tags
                }
                function getEditorText(editor) {
                    var txt, ignores = getEditorText.ignores = getEditorText.ignores || (function() {
                        var a = {
                            bbcode: ["img"],
                            html: 'img '
                        }
                          , b = 0
                          , c = plugin.settings.ignores;
                        for (; b < c.length; b++) {
                            a.bbcode.push(c[b].bbcode);
                            if (c[b].html.length)
                                a.html += ", " + c[b].html;
                        }
                        ;return a;
                    }
                    )()
                    if (!getEditorText.cache) {
                        getEditorText.cache = {};
                    }
                    if (editor.name == "BBCode" && editor.textarea) {
                        var txt = editor.textarea.value.replace(/&{1}#91;/g, "[").replace(/\[(hr|br)\]/gi, '').replace(/\[img .*src=[^\]]*\]/gi, "").replace(/\[(style|url|link|color|font|email|size|bg|cs|rs|atrb)=([\w\W]+?)\]/gi, '[$1 $1="$2"]'), ignoresStack = [], tagsStack = [], w = WYSIWYG, tags, a
                        if (txt in getEditorText.cache) {
                            return getEditorText.cache[txt];
                        } else {
                            var originaltxt = txt
                        }
                        tags = txt.indexOf("[") > -1 && txt.indexOf("]") > 1 ? editor.parent._getTags(txt, "[", "]", plugin.settings.bbcode_max || 300) : [{
                            text: txt
                        }]
                        for (a = 0,
                        txt = ''; a < tags.length; a++) {
                            tags[a]._name = tags[a]._name || tags[a].name || "";
                            tags[a]._name = tags[a]._name.split(/[:=]/)[0]
                            if (tags[a].name) {
                                if (tags[a].open) {
                                    if ($.inArrayLoose(tags[a]._name, ignores.bbcode) != -1) {
                                        ignoresStack.push(tags[a]);
                                        continue;
                                    } else {
                                        if (ignoresStack.length == 0) {
                                            tagsStack.push(tags[a]);
                                        }
                                    }
                                }
                            }
                            if (ignoresStack.length) {
                                if (tags[a].name && tags[a]._name == ignoresStack[ignoresStack.length - 1]._name && tags[a].open === false) {
                                    ignoresStack.pop();
                                }
                                if (ignoresStack.length) {
                                    continue;
                                }
                            } else if (tagsStack.length && tags[a].open === false && tags[a]._name == tagsStack[tagsStack.length - 1]._name) {
                                tagsStack.pop();
                            }
                            if (tags[a].text) {
                                txt += tags[a].text;
                            }
                        }
                        if (tagsStack.length)
                            var unknowntags = [];
                        txt += $.map(tagsStack, function(el, i) {
                            if (!/^([a-z][a-z,0-9]+)[:=]/.test(el.name) && (/\W/.test(el.name) || /^\d+$/.test(el.name) || (el.close && $.inArray(el.name, unknowntags) == -1))) {
                                var tag = "[" + (el.close ? "/" : "") + el.name, a;
                                for (a in el.attrs) {
                                    tag += " " + a + '="' + el.attrs[a] + '"';
                                }
                                return tag + "]";
                            } else if (el.open) {
                                unknowntags.push(el._name)
                            }
                            return null;
                        }).join("");
                        txt = txt.replace(/&{1}nbsp;/g, '\xa0').replace(/&{1}amp;/g, '&').replace(/&{1}lt;/g, '<').replace(/&{1}gt;/g, '>');
                        getEditorText.cache[originaltxt] = txt;
                    } else if (editor.name == "Visual" && editor.editable) {
                        var $txt = $('<div></div>').html($(editor.editable).html()).find('img[text]').each(function() {
                            $(this).replaceWith('<span class="smiles">' + this.getAttribute('text') + '</span>');
                        }).end().contents().remove(ignores.html).parent();
                        if ($txt[0]) {
                            $txt.html($txt.html().replace(/<br\s*\/?>/gi, '\x0a'));
                            txt = $txt.text().replace(/\[([a-z]\w+)[^\]]*\](?:([^\[]+)(\[\/\1\]))?/gi, function(m, p1, p2, p3) {
                                return p2 && $.inArray(p1, ignores.bbcode) == -1 ? p2 : ""
                            })
                        } else {
                            txt = "";
                        }
                    }
                    return txt;
                }
                wordcount_data.cache = getEditorText.cache;
                wordcount_data.getEditorText = function() {
                    return getEditorText(WYSIWYG.editor[WYSIWYG.currentEditorName])
                }
                if (wordtotal.length == 0 || wordtotal.hasClass('has-menu')) {
                    var wordmenu = $('<div class="button"></div>').addClass("mode-" + user_mode.substr(0, 4) + " word-count word-count-" + proboards.data("route").name).append('<span style="float:right;" id="word-count-limit"></span>')
                    if (wordtotal.hasClass('has-menu')) {
                        wordmenu.appendTo(wordtotal.html(""));
                        wordtotal = $();
                        targetID = 'word-menu';
                    } else {
                        wordmenu.css({
                            "float": "right",
                            marginTop: "4px"
                        }).insertAfter($(quick_reply ? '.ui-resizable-s' : '.wysiwyg-tabs', $(this).parent()))
                    }
                    var menu = $('<ul class="options_menu hide ui-menu ui-helper-clearfix ui-selectMenu" />').append('<li class="word-count-words count-mode" style="display:none;"><a><span clas="icon"></span>Words</a></li>').append('<li class="word-count-characters count-mode"><a><span clas="icon"></span>Characters</a></li>')
                    if (plugin.settings.include_in_menu.indexOf("sentences")) {
                        menu.append('<li class="word-count-sentences count-mode"><a><span class="icon"></span>Sentences</a></li>');
                    }
                    if (plugin.settings.include_in_menu.indexOf("paragraphs") != -1) {
                        menu.append('<li class="word-count-paragraphs count-mode"><a><span class="icon"></span>Paragraphs</a></li>');
                    }
                    if (plugin.settings.include_in_menu.indexOf("unique") != -1) {
                        menu.append('<li class="word-count-unique count-mode"><a><span class="icon"></span>Unique Words</a></li>');
                    }
                    if (plugin.settings.include_in_menu.indexOf("syllables") != -1) {
                        menu.append('<li class="word-count-syllables count-mode"><a><span class="icon"></span>Syllables</a></li>');
                    }
                    if (plugin.settings.include_in_menu.indexOf("complex") != -1) {
                        menu.append('<li class="word-count-complex count-mode"><a><span class="icon"></span>Complex Words</a></li>');
                    }
                    if (plugin.settings.include_in_menu.indexOf("average_word_length") != -1) {
                        menu.append('<li class="word-count-average_word_length count-mode"><a><span class="icon"></span>Average word length</a></li>');
                    }
                    var reading_formulas = $.map(plugin.settings.reading_formulas, function(e, i) {
                        return e.enable && e.formula ? e : null;
                    })
                    if (reading_formulas.length) {
                        menu.append('<li class="word-count-reading_submenu count-mode"><a><span class="icon"></span>Reading Score</a><ul></ul></li>');
                        $.each(reading_formulas, function(i, e) {
                            menu.find('.word-count-reading_submenu ul').append('<li class="word-count-reading_level count-mode formula-' + i + '" data-formula="' + e.formula + '" data-reading-information="' + e.information + '" ><a><span class="icon"></span>' + e.name + '</a>' + (e.information ? '<ul><li class="word-count-formula_info count-mode" data-formula-info="' + e.information + '"><a><span class="icon"></span>About</a></li></ul>' : '') + '</li>');
                        })
                    }
                    menu.insertBefore(quick_reply ? document.body.lastChild : wordmenu).selectMenu({
                        container: wordmenu[0],
                        status: '<span id="word-count"></span>',
                        staticStatus: true,
                        beforeShow: function() {
                            menu.addClass('open-menu');
                            $(this).menu('showAllOptions')
                            if ("reading_level" != user_mode) {
                                $(this).menu('hideOption', 'word-count-' + user_mode);
                            }
                            return true;
                        },
                        onClose: function() {
                            menu.removeClass('open-menu')
                        },
                        select0: function() {
                            $(this).menu('collapseAll');
                            wordmenu.focus();
                        },
                        menuOptions: {
                            click: function(e, ui) {
                                var mode = user_mode;
                                if (/word-count-(words|characters|sentences|paragraphs|nscharacters|unique|complex|syllables|average_word_length|reading_level|formula_info)/.test($(ui.item).attr("class"))) {
                                    if (proboards.is_valid_url($(ui.item).attr('data-formula-info'))) {
                                        window.open($(ui.item).attr('data-formula-info'), "_blank");
                                        return
                                    }
                                    user_mode = wordcount_data.mode = RegExp.$1;
                                    if (mode !== user_mode || "reading_level" == user_mode) {
                                        if ("reading_level" == user_mode) {
                                            wordcount_data.last_reading_formula = plugin.settings.reading_formulas[$(ui.item).idFromClass('formula')];
                                        }
                                        wordmenu.removeClass('mode-word mode-char mode-sent mode-para mode-nsch mode-comp mode-aver mode-uniq mode-syll mode-read').addClass('mode-' + user_mode.substr(0, 4))
                                        $(WYSIWYG.editors[WYSIWYG.currentEditorName].editable).trigger('keyup.wordcount');
                                    }
                                }
                                $(ui.item).trigger('mouseleave');
                            }
                        }
                    });
                }
                $.each(WYSIWYG.editors, function() {
                    var editor = this, count, txt, frm;
                    if (plugin.settings.put_count_in_post && plugin.settings.post_pattern && !formb4submit) {
                        frm = $(editor.parent.element.get(0).form).data('form');
                        formb4submit = frm.options.beforeSubmit;
                        frm.options.beforeSubmit = function() {
                            var wcount = wordcount, capt, modifier = "", type = "w";
                            if (editor.parent.editors.bbcode.editable.value.match(plugin.settings.post_pattern)) {
                                editor.parent.editors.bbcode.editable.value = editor.parent.editors.bbcode.editable.value.replace(plugin.settings.post_pattern, function(m) {
                                    var captures = Array.prototype.slice.call(arguments, 1, arguments.length - 2)
                                    if (captures.length) {
                                        capt = captures[captures.length - 1];
                                        if (/%cc#/.test(capt)) {
                                            type = 'c';
                                            wcount = lengthcount;
                                        }
                                        if (/([+-]\d+)/.test(capt)) {
                                            modifier = RegExp.$1;
                                            wcount = wcount + parseInt(modifier);
                                        }
                                        if (modifier || type) {
                                            modifier = ' (' + modifier + (type ? ' ' + type : '') + ')'
                                        }
                                        m = m.replace(capt, (proboards.commify(wcount)))
                                    } else
                                        m += proboards.commify(wcount)
                                    return m;
                                })
                            }
                            formb4submit.apply(this, arguments);
                        }
                    }
                    $(this.bindable).on('input.wordcount change.wordcount keyup.wordcount', function(event) {
                        wordtotal = $("#" + targetID);
                        if (editor.name.toLowerCase() == WYSIWYG.currentEditorName) {
                            txt = getEditorText(editor);
                            lengthcount = wordcount_data.last_length_count = txt.replace(/[\n\r]/g, '').length;
                            var wct = txt.match(wordcount_regex);
                            wordcount = wordcount_data.last_word_count = (wct ? wct.length : 0);
                            switch (user_mode) {
                            case "paragraphs":
                                paragraphcount = wordcount_data.last_paragraph_count = txt.split(/\n+/).length;
                                break;
                            case "nscharacters":
                            case "reading_level":
                                nslengthcount = wordcount_data.last_length_count_nospace = txt.replace(/[\n\r]/g, '').split(/\s+/).join("").length;
                                if (user_mode == "nscharacters") {
                                    break;
                                }
                            case "sentences":
                                sentencecount = wordcount_data.last_sentence_count = txt.replace(/"/gi, "").split(/[.?!:\n]+/).length;
                                if (user_mode == "sentences") {
                                    break;
                                }
                            case "syllables":
                                syllablecount = wordcount_data.last_syllable_count = count_syllables(txt);
                                if (user_mode == "syllables") {
                                    break;
                                }
                            case "unique":
                            case "average_word_length":
                            case "complex":
                                complexwords = [];
                                uniquewords = wordcount_data.last_unique_words_count = (function(wordlist) {
                                    for (var a = 0, b = wordlist.length, c = []; a < b; a++) {
                                        c[wordlist[a]] = 1;
                                        if (user_mode === "complex") {
                                            if (wordlist[a].length > 2 && count_syllables(wordlist[a]) > plugin.settings.complex_words) {
                                                wordcount_data.last_complex_count = complexwords.push(wordlist[a]);
                                            }
                                        }
                                    }
                                    a = Object.keys(c);
                                    b = a.length
                                    return average_word_length = Number(a.join("").length / b).toFixed(2),
                                    b;
                                }
                                )(wct);
                                wordcount_data.avg_word_length = average_word_length || 0;
                                if (user_mode == "unique" || user_mode == "average_word_length" || user_mode == "complex") {
                                    break;
                                }
                            case "reading_level":
                                reading_level = wordcount_data.last_reading_level = (Function('wordCount', 'sentenceCount', 'syllableCount', 'complexCount', 'letterNumberCount', 'return ' + (wordcount_data.last_reading_formula ? wordcount_data.last_reading_formula.formula : '-1')))(wordcount, sentencecount, syllablecount, wordcount_data.last_complex_count || 0, nslengthcount);
                                wordtotal.attr('data-reading-score', (wordcount_data.last_reading_formula ? wordcount_data.last_reading_formula.name : 'Unknown Plugin Formula'));
                                if (!isNaN(reading_level))
                                    reading_level = Number(reading_level).toFixed(2)
                            }
                            count = ({
                                words: wordcount,
                                characters: lengthcount,
                                sentences: sentencecount,
                                paragraphs: paragraphcount,
                                unique: uniquewords,
                                nscharacters: nslengthcount,
                                average_word_length: average_word_length,
                                reading_level: reading_level,
                                syllables: syllablecount,
                                complex: wordcount_data.last_complex_count || 0
                            })[user_mode]
                            wordtotal.html($.isNumeric(count) && count >= 1000 ? pb.number.commify(count) : count);
                            function count_syllables(word) {
                                word = word.toLowerCase();
                                if (word.length <= 2) {
                                    return 1;
                                }
                                word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
                                word = word.replace(/^y/, '');
                                return /[aeiouy]/.test(word) ? word.match(/[aeiouy]{1,2}/g).length : 1;
                            }
                        }
                    })
                    if (plugin.settings.paste_html == "paste" && editor.name == "Visual")
                        $(editor.editable).off('paste.wyswiwyg')
                    if ($.inArray("enhance", plugin.settings.enable_enhanced) != -1 || $.inArray("enhancepreview", plugin.settings.enable_enhanced) != -1) {
                        if (editor.name == "Visual") {
                            if (!editor.__getContent) {
                                editor.__getContent = editor.getContent;
                                editor.getContent = function() {
                                    try {
                                        $('[data-enhanced-atrb]', this.document).reverse().each(function(i, e) {
                                            var index = $(this).attr("data-enhanced-index")
                                            if (index) {
                                                index = index.split(".")
                                                var atrbs = parseEnhancedTags.pseudo_tags[index[0]][index[1]], g, h;
                                                if ($(atrbs.target).data("enhanced-old-atrb") && (g = $(atrbs.target).data("enhanced-old-atrb"))) {
                                                    for (h in g) {
                                                        if (h == "style")
                                                            atrbs.target.style.cssText = g[h];
                                                        else
                                                            $(atrbs.target).attr(h, g[h])
                                                    }
                                                    $(atrbs.target).removeData("enhanced-old-atrb");
                                                }
                                            }
                                        }).replaceWith(function() {
                                            if (this.nodeName.toLowerCase() != "span") {
                                                if ($(this).contents().length) {
                                                    $(this).after($(this).contents(), "[/style]");
                                                } else
                                                    $(this).after("[/style]");
                                            }
                                            return "[" + $(this).data("enhanced-atrb") + "]";
                                        });
                                    } catch (parseError) {
                                        proboards.log(parseError)
                                    }
                                    return this.__getContent.apply(this, arguments);
                                }
                            }
                        }
                        if (!editor.__setContent) {
                            editor.__setContent = editor.setContent;
                            editor.setContent = function() {
                                editor.__setContent.apply(this, arguments)
                                parseEnhancedTags(editor.bindable, logger.parse);
                                if (/\[(atrb|style)\W/i.test($(editor.editable).html())) {
                                    parseEnhancedTags(editor.editable, logger.parse, true)
                                }
                                $(editor.bindable).trigger('keyup.wordcount');
                            }
                        }
                        parseEnhancedTags(WYSIWYG.editors[WYSIWYG.currentEditorName].bindable, logger.parse);
                        if (/\[(atrb|style)\W/i.test($(WYSIWYG.editors[WYSIWYG.currentEditorName].editable).html())) {
                            parseEnhancedTags(WYSIWYG.editors[WYSIWYG.currentEditorName].editable, logger.parse, true)
                        }
                        $(WYSIWYG.editors[WYSIWYG.currentEditorName].bindable).trigger('keyup.wordcount');
                    }
                    wordtotal.show();
                    if (wordtotal.has('.word-number'))
                        wordtotal = $('.word-number', wordtotal);
                    if ($(editor.editable).is(':visible'))
                        $(editor.bindable).trigger('keyup.wordcount')
                })
                $.extend(validation, {
                    name: "message_word_length",
                    field: "message",
                    opts: {
                        area_of_effect: quick_reply ? ".form_post_quick_reply" : ".ui-wysiwyg .editors"
                    }
                })
                var limit = null
                  , gabf = wordcount_data.getAutoformByField = function(autoformArray, field, value, multiple) {
                    var entries = []
                    for (a = 0; a < autoformArray.length; a++) {
                        if (field in autoformArray[a]) {
                            if (("undefined" == typeof value) || ("undefined" != typeof autoformArray[a][field] && ($.isArray(autoformArray[a][field]) ? ($.inArrayLoose(value, autoformArray[a][field]) != -1) : (value == autoformArray[a][field]))))
                                entries.push(autoformArray[a]);
                        }
                    }
                    return (multiple ? (entries.length ? entries : undefined) : entries[0]);
                }
                function isExempt(limitLevel, limitObj) {
                    if (limitObj) {
                        if (logger.limit && limitObj.limit_type) {
                            console.log(pluglog + 'Inspecting the ' + limitLevel + ' limit for exemptions');
                        }
                        if (limitObj.limit_type == "none") {
                            if (logger.limit) {
                                console.log(pluglog + 'This limit is set to "none"')
                            }
                            return true;
                        }
                        wordcount_data.limits[limitLevel] = $.extend({
                            limit: plugin.settings.limit_threshold,
                            limit_type: plugin.settings.limit_type
                        }, limitObj);
                        if ($.inArrayLoose(user.id, limitObj.exclude_members) > -1) {
                            if (logger.limit) {
                                console.log(pluglog + 'This limit has an exemption set specifically for you')
                            }
                            return true;
                        }
                        for (group in user.groups) {
                            if ($.inArrayLoose(group, limitObj.exclude_groups) > -1) {
                                if (logger.limit) {
                                    console.log(pluglog + 'This limit has an exemption set for any member in the following group: ' + group + ' (' + user.groups[group] + ')')
                                }
                                return true;
                            }
                        }
                    }
                    var levels = ["thread", "board", "category"], start = $.inArrayLoose(limitLevel.toLowerCase(), levels), exemptions, group, page = proboards.data("page");
                    for (; start > -1 && start < levels.length; start++) {
                        if ((levels[start]in page) && (exemptions = plugin.settings["limit_" + levels[start].replace(/y$/, "ie") + "s"])) {
                            for (group = 0; group < exemptions.length; group++) {
                                if (page[levels[start]].id == exemptions[group][levels[start]] && isExempt("forum", exemptions[group]))
                                    return true;
                            }
                        }
                    }
                    if (limitObj && limitObj.limit_type && !(user.is_staff && !plugin.settings.limit_staff)) {
                        if (logger.limit) {
                            console.log(pluglog + 'You are subject to a posting limit of ' + (limitLevel == "forum" ? plugin.settings.limit_threshold : limitObj.limit) + ' ' + ((limitLevel == "forum" ? plugin.settings : limitObj).limit_type.indexOf("_char_") == -1 ? "words" : "characters") + ' ' + (/^min/.test((limitLevel == "forum" ? plugin.settings : limitObj).limit_type) ? "minimum" : "maximum") + ' set on this ' + limitLevel);
                        }
                    }
                    return false;
                }
                if (!/(conversation|message)s?$/.test(proboards.data("route").name) && $.inArrayLoose(user.id, plugin.settings.exempt_members) == -1 && !isExempt("forum", {
                    exclude_members: plugin.settings.exempt_members,
                    exclude_groups: plugin.settings.exempt_groups
                }) && (!user.is_staff || plugin.settings.limit_staff)) {
                    (function newPageOrder() {
                        var x = 0
                          , v = {}
                          , y = ["thread", "board", "category"]
                        for (; x < y.length; x++) {
                            if (y[x]in proboards.data("page"))
                                v[y[x]] = proboards.data("page")[y[x]]
                        }
                        proboards.data("page", v);
                        return proboards.data("page")
                    }
                    )()
                    $.each(proboards.data("page"), function(key, value) {
                        if (key == "thread" && plugin.settings.limit_threads.length && (limit = gabf(plugin.settings.limit_threads, "thread", value.id))) {
                            if (isExempt(key, limit)) {
                                return false;
                            }
                            limitmode = /_char_/.test(limit.limit_type) ? "characters" : "words";
                            wordcount_data.effective_limit = {
                                name: this.subject,
                                source: key,
                                id: this.id,
                                limit: limit.limit,
                                mode: limitmode,
                                type: limit.limit_type
                            }
                            if (logger.limit) {
                                console.log(pluglog + 'Limit mode for ' + key + ' "' + this.subject + '"(id:' + this.id + ') set to ' + limit.limit + ' ' + limitmode + ' ' + (/^min_/.test(limit.limit_type) ? "minimum " : "maximum "))
                            }
                            $(WYSIWYG.element[0].form).data("form").options.validations.push(validation);
                            validation.message = 'Your ' + limitmode + ' count ' + (/^min_/.test(limit.limit_type) ? "is below" : "exceeds") + ' the limit of ' + limit.limit + ' ' + limitmode + ' set for this thread';
                            validation.opts[limit.limit_type] = limit.limit;
                            $('#word-count-limit').html((/^min_/.test(limit.limit_type) ? "minimum " : "maximum ") + limit.limit + " " + limitmode);
                            return false;
                        } else if (key == "board" && plugin.settings.limit_boards.length && (limit = gabf(plugin.settings.limit_boards, "board", value.id))) {
                            if (isExempt(key, limit))
                                return false;
                            limitmode = /_char_/.test(limit.limit_type) ? "characters" : "words";
                            wordcount_data.effective_limit = {
                                name: this.name,
                                source: key,
                                id: this.id,
                                limit: limit.limit,
                                mode: limitmode,
                                type: limit.limit_type
                            }
                            if (logger.limit) {
                                console.log(pluglog + 'Limit mode for ' + key + ' "' + this.name + '"(id:' + this.id + ') set to ' + limit.limit + ' ' + limitmode + ' ' + (/^min_/.test(limit.limit_type) ? "minimum " : "maximum "))
                            }
                            $(WYSIWYG.element[0].form).data("form").options.validations.push(validation);
                            validation.message = 'Your ' + limitmode + ' count ' + (/^min_/.test(limit.limit_type) ? "is below" : "exceeds") + ' the limit of ' + limit.limit + ' ' + limitmode + ' set for the "' + value.name + '" board';
                            validation.opts[limit.limit_type] = limit.limit;
                            $('#word-count-limit').html((/^min_/.test(limit.limit_type) ? "minimum " : "maximum ") + limit.limit + " " + limitmode);
                            return false;
                        } else if (key == "category" && plugin.settings.limit_categories.length && (limit = gabf(plugin.settings.limit_categories, "category", value.id))) {
                            if (isExempt(key, limit))
                                return false;
                            limitmode = /_char_/.test(limit.limit_type) ? "characters" : "words";
                            wordcount_data.effective_limit = {
                                name: this.name,
                                source: key,
                                id: this.id,
                                limit: limit.limit,
                                mode: limitmode,
                                type: limit.limit_type
                            }
                            if (logger.limit) {
                                console.log(pluglog + 'Limit mode for ' + key + ' "' + this.name + '"(id:' + this.id + ') set to ' + limit.limit + ' ' + limitmode + ' ' + (/^min_/.test(limit.limit_type) ? "minimum " : "maximum "))
                            }
                            $(WYSIWYG.element[0].form).data("form").options.validations.push(validation);
                            validation.message = 'Your ' + limitmode + ' count ' + (/^min_/.test(limit.limit_type) ? "is below" : "exceeds") + ' the limit of ' + limit.limit + ' ' + limitmode + ' set for the "' + value.name + '" category';
                            validation.opts[limit.limit_type] = limit.limit;
                            $('#word-count-limit').html((/^min_/.test(limit.limit_type) ? "minimum " : "maximum ") + limit.limit + " " + limitmode);
                            return false;
                        }
                    });
                    if (!limit && plugin.settings.limit_threshold) {
                        limit = $(WYSIWYG.element[0].form).data("form").options.validations.push(validation);
                        limitmode = /_char_/.test(plugin.settings.limit_type) ? "characters" : "words";
                        wordcount_data.effective_limit = {
                            name: document.title.split(/\|\s*/)[1] || "Forum",
                            source: 'forum',
                            id: proboards.data('forum_id') || 0,
                            limit: plugin.settings.limit_threshold,
                            mode: limitmode,
                            type: plugin.settings.limit_type
                        }
                        if (logger.limit) {
                            console.log(pluglog + 'Limit mode for forum set to ' + plugin.settings.limit_threshold + ' ' + limitmode + ' ' + (/^min_/.test(plugin.settings.limit_type) ? "minimum " : "maximum "))
                        }
                        validation.message = 'Your ' + limitmode + ' count ' + (/^min_/.test(plugin.settings.limit_type) ? "is below" : "exceeds") + ' the limit of ' + plugin.settings.limit_threshold + ' ' + limitmode + ' set for this forum';
                        validation.opts[plugin.settings.limit_type] = plugin.settings.limit_threshold;
                        $('#word-count-limit').html((/^min_/.test(plugin.settings.limit_type) ? "minimum " : "maximum ") + plugin.settings.limit_threshold + " " + limitmode);
                    }
                    if (limit && !$.check_message_word_length) {
                        $.check_message_word_length = function(value, opts) {
                            if (opts.min_length && wordcount < opts.min_length)
                                return false;
                            if (opts.max_length && wordcount > opts.max_length)
                                return false;
                            if (opts.min_char_length && lengthcount < opts.min_char_length)
                                return false;
                            if (opts.max_char_length && lengthcount > opts.max_char_length)
                                return false;
                            return true;
                        }
                        ;
                    }
                }
                
                function wordcountallowed(currentboard, allowedboards)
                {
                    return $.inArray(currentboard.toString(), allowedboards) != -1;
                }

                if (plugin.settings.no_limit_no_show == "noshow"
                    && (!limit || limit.limit_type == "none"))
                 {
                    
                    if (logger.limit) {
                        console.log(pluglog + 'The "Show counter only when there\'s a limit" option is enabled and no limit exists. Hiding counter')
                    }
                    if ("undefined" != typeof wordmenu && wordmenu.hide)
                        wordmenu.hide();
                    else
                        $("#" + targetID).hide();
                }
            })
    }
    function prettyQuirks(css) {
        return css.replace(/color\:\s*([a-f,0-9]{3}|[a-f,0-9]{6})\b/gi, "color: #$1").replace(/((?:width|height|left|right|bottom|top)\s*:\s*)(\d+($|;))/gi, "$1$2px$3").replace(/(?:border|background)\s*:([^;]+)/gi, function(m, p2) {
            p2 = String(p2 || "");
            var a, p2a = p2.split(/\s+/)
            for (var a = 0; a < p2a.length; a++) {
                if (/^([a-f,0-9]{3}|[a-f,0-9]{6})$/i.test(p2a[a])) {
                    p2a[a] = "#" + p2a[a];
                } else if (/^[\d\.]+$/.test(p2a[a])) {
                    p2a[a] = p2a[a] + "px";
                }
            }
            p2a = p2a.join(" ")
            if (p2a !== p2.replace(/\s{2,}/g, " "))
                m = m.replace(p2, p2a);
            return m;
        })
    }
    function parseEnhancedTags(message_body, debug, parseNaked) {
        var phase = "Apply Quirks CSS";
        if ("undefined" == typeof window.console || !debug) {
            var console = {
                log: function() {
                    phase = Array.prototype.slice.call(arguments).join(':');
                },
                dir: function() {}
            }
        } else
            console = window.console;
        try {
            if (!parseNaked) {
                if ((message_body.ownerDocument || message_body) !== document && $('body', (message_body.ownerDocument || message_body)).attr('id') != "content") {
                    $('body', (message_body.ownerDocument || message_body)).attr('id', "content").addClass('wysiwyg');
                    var link = $('#wordcount-plugin');
                    while ((link = link.prev()) && link.length) {
                        if (link[0].nodeName.toUpperCase() == "LINK") {
                            $('head', (message_body.ownerDocument || message_body)).append('<link rel="stylesheet" type="text/css" href="' + link.attr("href") + '"></link>');
                            break;
                        }
                    }
                }
            }
            var pseudo_tags = parseEnhancedTags.pseudo_tags = parseEnhancedTags.pseudo_tags || {};
            tags = /\[(atrb|cs|rs|bg|th|style|\/style)(?:\s*=\s*([^\]]+?))?(?:[,\s]+([^,\]]+))?(?:[,\s]+([^,\]]+))?\]/gi,
            phase = "Parsing...";
            (parseNaked ? $(message_body) : $('table', message_body).filter(function() {
                return this.getElementsByTagName('table').length == 0 && this.className.length == 0 && tags.test(this.innerHTML)
            })).each(function(index2, table) {
                console.log('enhancing %o', table);
                pseudo_tags[index2] = {};
                $(table).attr("data-enhanced", index2);
                (parseNaked ? $(table) : $('td', table)).each(function(index, td) {
                    if (/\[(atrb|cs|rs|bg|th|style)/i.test(td.innerHTML)) {
                        var delayed = [];
                        td.innerHTML = td.innerHTML.replace(tags, function(m, p1, p2, p3, p4, i, s) {
                            console.log('processing %o in cell[%o]', m, index);
                            p2 = p2 || "";
                            p3 = p3 || "";
                            p4 = p4 || "";
                            var target = td, parentElement
                            p2a = p2.toLowerCase()
                            p3 = p3 != "" ? p3 : p2;
                            switch (p1.toLowerCase()) {
                            case "style":
                            case "/style":
                                return prettyQuirks(m).replace("[style=", "<div data-enhanced-atrb=\"" + m.replace(/(^\[|\]$)/g, "") + "\" style=\"").replace("[/style]", "</div>").replace(/\]$/, "\">")
                            case "atrb":
                                if (p4 != "") {
                                    if (/(^btable|true|[1-9]+)$/i.test(p4)) {
                                        target = table;
                                    } else if ((parentElement = $(':contains(' + m + ')', td.parentNode).filter(function() {
                                        return $(this).closest(td.nodeName + (td.className ? "." + td.className.replace(/\s/g, ".") : ''))[0] === td
                                    })) && parentElement.length && parentElement.closest(p4.split(/[:@]/)[0])) {
                                        if (p4.indexOf("@") > -1 || /\:[\w-]+$/.test(p4)) {
                                            if (!$(message_body).attr('id') && $(table).closest('tr.item[id]').length == 0) {
                                                $(message_body).attr('id', $.unique_id())
                                            }
                                            var multiTargets = p4.split("@")
                                              , clampTarget = message_body.id ? $(message_body) : $(table).closest('tr.item[id],body')
                                              , messagerule = clampTarget.attr('id') ? "#" + clampTarget.attr('id') : clampTarget.get(0).nodeName
                                              , selectorCSS = "";
                                            target = parentElement.closest(multiTargets.shift().split(/\:/)[0]).reverse().get(0);
                                            $.each(multiTargets, function(i, e) {
                                                selectorCSS += messagerule + " " + this;
                                            })
                                            $.each(document.styleSheets, function(isheet, sheet) {
                                                if (sheet.mediatext == "all" && !sheet.disabled) {
                                                    if (sheet.insertRule) {} else if (sheet.addRule) {}
                                                    return false;
                                                }
                                            })
                                            p3 = "";
                                        } else {
                                            target = parentElement.closest(p4).reverse().get(0);
                                        }
                                    }
                                }
                                if (/^(width)$/i.test(p2)) {
                                    if (/^\d+$/.test(p3))
                                        p3 += "px";
                                    switch (p2a) {
                                    case "width":
                                        p3 = "width: " + p3;
                                        break;
                                    }
                                    p2 = p2a = "style";
                                }
                                if (/^on(\w+)$/i.test(p2)) {
                                    p2a = RegExp.$1;
                                    if ($.inArray("allowevents", proboards.plugin.get('eton_word_count').settings.enable_enhanced) == -1)
                                        p2 = "no" + p2a;
                                }
                                if (/href=['"]http/i.test(p3)) {
                                    p3 = p3.split(/href=['"]/)[1];
                                }
                                break;
                            case "cs":
                                p2 = "colSpan";
                                break;
                            case "rs":
                                p2 = "rowSpan";
                                break;
                            case "bg":
                                p2 = "bgColor";
                                break;
                            case "th":
                                p2 = "colSpan";
                                p3 = 0;
                                var cells = 0;
                                $("tr", table).each(function(i, e) {
                                    $.each($.makeArray(this.cells), function() {
                                        cells = cells + (this.colSpan || 1);
                                    })
                                    if (cells > p3)
                                        p3 = cells;
                                });
                                break;
                            default:
                                return m;
                            }
                            var noGood = null, cssPropDOM;
                            if (p2a == "style") {
                                function cssValueMismatch(a1, a2) {
                                    console.log('calling cssValueMismatch(%o)', arguments)
                                    var a = a1.length > a2.length ? a1 : a2
                                      , b = a == a1 ? a2 : a1
                                      , diff = [];
                                    $.grep(a, function(ea, ia) {
                                        diff = $.grep(b, function(eb, ib) {
                                            if (ea == eb)
                                                return false;
                                            if (/(rgb|hsl)a?\(/.test(eb) && /#?\b([0-9,a-f,A-F]{6}|[0-9,a-f,A-F]{3})\b/.test(ea))
                                                return !new RegExp("(rgb|hsl)a?(" + proboards.shared.hexToRgb(RegExp.$1).join(",\\s*") + ")").test(eb)
                                            if (/(rgb|hsl)a?\(/.test(ea) && /#?\b([0-9,a-f,A-F]{3}|[0-9,a-f,A-F]{6})\b/.test(eb))
                                                return !new RegExp("(rgb|hsl)a?(" + proboards.shared.hexToRgb(RegExp.$1).join(",\\s*") + ")").test(ea)
                                            console.log('possible mismatch: %o!=%o', ea, eb)
                                            return true;
                                        })
                                    })
                                    cssValueMismatch.diff = diff;
                                    return diff.length != 0
                                }
                                p3 = prettyQuirks(p3);
                                cssPropDOM = $.trim(p3.split(":")[0]).replace(/-./g, function(m) {
                                    return m.substr(1).toUpperCase()
                                }),
                                cssProps = p3.replace(/[\s;]+$/, "").split(";");
                                var css = {
                                    tag: m
                                }, cssRaw, csstemp = "";
                                if (!$(target).data('enhanced-old-atrb'))
                                    $(target).data('enhanced-old-atrb', {
                                        exists: true
                                    });
                                if ("undefined" == typeof $(target).data('enhanced-old-atrb').style)
                                    $(target).data('enhanced-old-atrb').style = target.style.cssText;
                                target.style.cssText += (/;$/.test(target.style.cssText) ? p3 : ";" + p3);
                                for (var x = 0; x < cssProps.length; x++) {
                                    csstemp = "";
                                    if (cssProps[x].split(/:(?!\/\/)/)[1] && (cssRaw = $.trim(cssProps[x].split(/:(?!\/\/)/)[0]))) {
                                        css[cssRaw] = {
                                            camel: $.trim(cssProps[x].split(/:(?!\/\/)/)[0]).replace(/-./g, function(m) {
                                                return m.substr(1).toUpperCase()
                                            }),
                                            value: $.trim(cssProps[x].split(/:(?!\/\/)/)[1])
                                        }
                                        if (/^-([^-]+)/.test(cssRaw))
                                            css[cssRaw].vendor = {
                                                prefix: RegExp.$1,
                                                noprefix: cssRaw.substr(RegExp.$1.length + 2),
                                                noprefixcamel: cssRaw.substr(RegExp.$1.length + 2).replace(/-./g, function(m) {
                                                    return m.substr(1).toUpperCase()
                                                })
                                            }
                                        var cssprefix = css[cssRaw].camel
                                          , cssnoprefix = css[cssRaw].vendor ? css[cssRaw].vendor.noprefixcamel : cssprefix;
                                        console.log("testing %o", cssprefix, (cssnoprefix != cssprefix ? " (" + cssnoprefix + ")" : ""))
                                        if (cssValueMismatch([(target.style[cssprefix] || target.style[cssnoprefix] || "#rgb(")], [css[cssRaw].value])) {
                                            csstemp += ("Expected: " + cssprefix + ": " + css[cssRaw].value + "\n" + " found: " + (target.style[cssprefix] ? cssprefix + ": " + target.style[cssprefix] : (target.style[cssnoprefix] ? cssnoprefix + ": " + target.style[cssnoprefix] : "(no '" + cssRaw + "' style)")));
                                            console.log(csstemp);
                                        }
                                    }
                                }
                                if (csstemp.length) {
                                    noGood = m + "\n Proboards has altered or rejected the following style(s)\n Current styles are " + csstemp;
                                }
                            } else {
                                if (!$(target).data('enhanced-old-atrb'))
                                    $(target).data('enhanced-old-atrb', {
                                        exists: true
                                    });
                                if ("undefined" == typeof $(target).data('enhanced-old-atrb')[p2] && target.getAttribute(p2))
                                    $(target).data('enhanced-old-atrb')[p2] = target.getAttribute(p2)
                                try {
                                    $(target).attr(p2, p3)
                                    if (target.getAttribute(p2) !== p3) {
                                        noGood = m.substring(1, m.length - 1) + "\n Proboards or browser has altered or rejected this attribute\n Currently '" + p2 + "' == '" + target.getAttribute(p2) + "'";
                                    }
                                } catch (y) {
                                    console.log(y);
                                }
                            }
                            pseudo_tags[index2][i] = {
                                target: target,
                                tag: m,
                                attribute: p2,
                                value: p3,
                                siblingIndex: i,
                                result: noGood,
                                html: '<span style="display:none;" data-enhanced-atrb="' + m.replace(/(^\[|\]$)/g, "") + '"></span>',
                                table: {
                                    elem: table,
                                    index: index2,
                                    cell: {
                                        elem: td,
                                        index: index
                                    }
                                }
                            }
                            if ($.contains(td, target)) {
                                delayed.push($.extend({}, pseudo_tags[index2][i], {
                                    closest: p4
                                }))
                            }
                            if (noGood)
                                console.log(noGood)
                            return '<span style="display:none;" data-enhanced-atrb="' + m.replace(/(^\[|\]$)/g, "") + '" data-enhanced-index="' + ("" + index2 + "." + i) + '"></span>';
                        })
                        $.each(delayed, function(i, e) {
                            $('[data-enhanced-index="' + ("" + e.table.index + "." + e.siblingIndex) + '"]', td).closest(e.closest).each(function() {
                                if (e.attribute.toLowerCase() == "style") {
                                    this.style.cssText += ((/;$/.test(e.value) ? ";" : "") + e.value);
                                } else {
                                    $(this).attr(e.attribute, e.value)
                                }
                            })
                        })
                    }
                })
            })
        } catch (err) {
            window.console && window.console.log(phase + ":" + err);
        }
        return pseudo_tags;
    }
    if (proboards.data("proboards.post") || proboards.data("proboards.message") && $.inArray("enhance", proboards.plugin.get('eton_word_count').settings.enable_enhanced) != -1 && $.inArray("enhancepreview", proboards.plugin.get('eton_word_count').settings.enable_enhanced) == -1) {
        $(document).ready(function() {
            $('.ui-autosearch').on('autosearchaftersearch.enhanced', function() {
                $('.item div.message').each(function(index, post) {
                    parseEnhancedTags(this, $.inArray("debug", proboards.plugin.get('eton_word_count').settings.enable_debugging) != -1)
                    if (/\[(atrb|style)\W/i.test($(this).html())) {
                        $('code,textarea', this).each(function(i, e) {
                            var vtype = this.nodeName == 'TEXTAREA' ? 'value' : 'innerHTML'
                              , val = this[vtype]
                              , daTa = $(post).data('enhancedProtected') || {}
                            daTa[i] = val;
                            $(this).addClass('enhanced-protected enhanced_protected-' + i);
                            $(post).data('enhancedProtected', daTa);
                            this[vtype] = vtype;
                        })
                        parseEnhancedTags(this, $.inArray("debug", proboards.plugin.get('eton_word_count').settings.enable_debugging) != -1, true)
                        $('.enhanced-protected', post).each(function(i, e) {
                            this[this.nodeName == 'TEXTAREA' ? 'value' : 'innerHTML'] = $(post).data('enhancedProtected')[$(this).idFromClass('enhanced_protected')]
                        })
                    }
                })
            });
            if (!$('.ui-autosearch').data('autosearch').popped) {
                $('.ui-autosearch').data('autosearch')._trigger('afterSearch.enhanced');
            }
        })
    }
    $.extend(wordcount_data, {
        parser: parseEnhancedTags
    });
    return eton;
}
)((window.eton || {}), window.jQuery)
