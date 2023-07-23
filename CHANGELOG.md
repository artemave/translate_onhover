# CHANGELOG

1.68
  * Upgrade Google Analytics from UA to GA4
1.67
  * Fix "only show when key pressed" having no effect in some cases
1.66
  * Fix not working on youtube.com
1.65
  * Fix typo in the api fallback
1.64
  * Switch to manifest v3 on Chrome
  * Prevent Chrome page translation tool from translating popup (thanks https://github.com/dotdioscorea)
1.63
  * Fix remember language in "type and trasnlate" popup being scoped to a particular site
1.62
  * Fix translation popup sometimes not appearing
1.61
  * Remember language options in "type and trasnlate" popup
  * Fix double translation popup showing in certain scenarious
1.60
  * Remove unnecessary required "tabs" permission.
1.59
  * Re-enable clients5 API (it magically started working again). But keep the fallback to rate limited API in case it breaks again.
1.58
  * Fix "not working on youtube"
1.57
  * Fix usage tracking
  * Show error in the popup when google translate API rate limit is hit
1.56
  * Better usage tracking
  * Fix chrome build (production webpack generates invalid UTF-8 build) - this time for real
1.55
  * Fix chrome build (production webpack generates invalid UTF-8 build)
1.54
  * Fix API url
1.52
  * Works on Firefox (involved numerous cleanups)
1.48
  * Fix hover menus closing unintentionally (thanks https://github.com/WofWca)
1.47
  * Add ability to configure font size
1.46
  * remove youtube fix - it seems to be no longer required
1.45
  * fix not working on youtube
1.44
  * make "translate into" field look more like a required field
  * fix occasional exception showing up in dev tools
1.43
  * Add "disable on this page" checkbox to type-and-translate popup.
  * Changing options no longer requires to reload pages.
  * Fix web components deprecation warnings.
1.42
  * Change google translate API url. The old one seems to be getting blocked more and more.
1.41
  * Fix regression. T&T popup wasn't showing translation.
1.40
  * Optionally show "translated from" language in a popup. Because source langage autodetect often makes funny choices and then people blame TransOver for incorrect/missing translations. This will hopefully act as a hint to go and change "translate from" option from autodetect to a set language.
1.39
  * Add "copy translation" feature
1.38
  * Fix errors in developer console
1.37
  * Add option to translate on whitelisted sites only (credit https://github.com/yamanq/translate_onhover)
1.36
  * Fix "reverse translate to" dropdown not being fully populated
1.35
  * Fix TTS looping when key is pressed and held
1.34
  * Smaller and crispier font
1.33
  * if site is added to "don't translate on these sites", don't inject template elements. So that they don't show up in OWA new email form
1.32
  * attempt to fix template content being appended to contenteditable body (OWA new email form)
1.31
  * fix certain sites (e.g. facebook, youtube) being subtly broken for _some_ users. By not using html imports, since Chrome appears to be buggy in that respect.
1.30
  * fix selection translation appearing in the corner
  * fix "letter-spacing" parent style leaking into the popup
  * dismiss popup on scroll
1.29
  * new icon
  * slower tts
  * inner refactoring: iframes -> web components
1.28
  * use Speech Synthesis API for text-to-speech
1.27
  * add "from" to type-and-translate popup
  * don't use chrome.tts. Like ever again
1.26
  * use chrome.tts api
1.25
  * get back "Translate from" option
1.24
  * fix exception showing up in js console
1.23
  * fix showing only first sentence of selection translation
1.22
  * fix hotkey setup
  * less ugly "type and translate" popup
  * better way to figure out unsuccessful translation
1.21
  * support new google api
1.20
  * configurable tts key
1.19
  * rollback z-index increase - previous value was the correct maximum
1.18
  * max z-index so that popup always stays on top
1.17
  * revert "cache regexp" optimization
1.16
  * don't use chrome.tts
1.15
  * count apostrophes as word characters. So that d'abord, don't, etc. get proper translation.
  * fix tts
1.14
  * skip editable divs (fixes google+, youtube, etc. comments)
1.13
  * redirect to options after install
1.12
  * fix tts for "type and translate"
1.11
  * fix occasional exception in chrome js console
1.10
  * fix xss security issue
1.9
  * allow disabling reverse translate if "translate from" is chosen
1.8
  * add option to choose show popup trigger (previously, 'alt' was the only option)
1.7
  * fix large selection translation not getting proper height
1.6
  * fix broken single word translation
1.5
  * only show type-and-translate popup in top frame (so that bits of it do not show up in facebook, g+ buttons)
  * upgrade jquery to get rid of source map exception in dev console
1.4
  * fix broken tts for multiword translation
  * better "don't translate clicking links"
1.3
  * don't translate when clicking on links
1.2
  * track source langage properly
1.1
  * add google analytics
1.0
  * better popup implementation (possibly fixes wrong popup size)
  * smaller dependencies
0.44
  * fix "choose target lang" broken link
0.43
  * fix missing icons
0.42
  * improve popup layout in g+
  * smaller package (so it installs faster)
0.41
  * fix tts
0.40
  * fix broken popup layout on latest chrome and chromium
0.39
  * fixed major brokenness caused by google api changes
  * add option to only translate selection when alt pressed
  * add reverse translate when 'autodetect from word' is chosen
0.38
  * translate all frames
0.37
  * make 'Oops.. no translation' optional
0.36
  * better ignore editable divs
0.35
  * fix tts not working for type and translate mode
0.34
  * ignore gmail and g+ editable divs
0.33
  * button for 'type and translate' popup
  * popup more resilient to current page style (been moved to iframe)
0.32
  * set text direction right-to-left for Arabic, Hebrew, Persian, Urdu and Yiddish
  * save options on Enter
0.31
  * only offer to choose language once (per page load)
0.30
  * change default autodetect method from locale to word
0.29
  * add Esperanto
0.28
  * translate in a popup
0.27
  * fix broken translation for text that contains regex special characters: ), $, etc.
0.26
  * bring back 'translate from' option
0.25
  * reverse translate
  * reliable source language autodetect; as a result, getting rid of manual source language option
  * 'do not translate on sites' option is less confusing
0.24
  * change 'translated only if X pressed' from 'shift' to 'alt'
0.23
  * make Text-To-Speech optional and disabled by default
0.22
  * expose 'translate from' option
  * redesign options page to hide advanced options behind separate link
0.21
  * text to speech on ctrl press
0.20
  * jquery updated to 1.7.1
0.19
  * fix adjustment for parent font-size going not quite as planned
0.18
  * fix translating wrong word (not the one behind cursor) in rare cases (that was due to * style font-size being different from element font-size)
  * hit between the lines confuses javascript getElementFromPosisition, resulting in visibly broken html after translation. Fixed.
0.17
  * ignore mouse 'noise' movements (so popup does not flicker)
  * enable 'delay' option only when 'translate by point at word' and not 'shift only'
  * fixed unescaped html. again.
0.16
  * 'translate by click' option added
  * fixed performance issue on pages with large text nodes
0.12
  * selection translation popup no longer shows up anywhere on the page (#17)
0.11
  * updated available languages
0.10
  * gotten rid of calls to Google Translate API (since it is deprecated)
0.9
  * proper cased (as opposed to always lower case) translation (#16)
  * make sure translation popup doesn't get out of the window (#14)
0.8
  * more prominent translation popup (#13)
  * no longer attempts to translate selection in text inputs (#12)
0.7
  * translation no longer changes styles of underlying text (#11). Thanks to Dmitriy Kostikov for pointing in the right direction
0.6
  * no more explicit 'translate from' option - autodetect is good enough. Also fixes #8
  * fixed: erases closing tag on html/xml listing (#6)
  * fixed: part of speech is now bold on every page (#9)
0.5
  * text selection translate (#4)
  * fixed: drops text selection (#7)
0.4
  * report translation fail. As opposed to simply not showing anything to user
  * hide translation on page scroll
  * prompt user to choose target language, in case it isn't set. Useful for new installs
  * source language is now a configurable option (defaults to 'autodetect')
  * translation delay is now configurable option
  * remove "don't translate from these languages" option
  * gotten rid of explicit api call to detect language. Turns out dictionary api can do it itself.
  * popup fadeIn/fadeOut. As opposed to hide/show
0.3
  * reduced delay before translation start
