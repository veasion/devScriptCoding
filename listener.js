let socket = null;
let menuTips = [];
let locationURL = null;
let currentTarget = null;
let elementAttr = ["id", "className", "innerText", "innerHTML"];
let textareaIds = ['scriptCommandTextarea', 'debugTextarea', 'sourceTextarea'];
let currentTextareaId = textareaIds[0];
let socketUrl = 'ws://127.0.0.1:11630/js';

console.log('Hello！自动化测试脚本插件 --luozhuowei');

document.addEventListener('DOMContentLoaded', function () {
    // 注入自定义JS
    injectCustomJs();
    // 初始化html
    initScriptTextarea();
    if (locationURL) {
        appendScriptCode("open(\"" + window.location.href + "\");");
        appendScriptCode("waitForPageLoaded();");
    }
    locationURL = window.location.href;
});

window.addEventListener("click", function () {
    byId("jsApplyMenu").style.display = 'none';
    byId('codeTipsMenu').style.display = 'none';
});

window.addEventListener("message", function (e) {
    if (e.data && e.data.cmd == 'invoke') {
        eval('(' + e.data.code + ')');
        console.log("invoke: " + e.data.code);
    } else if (e.data && e.data.cmd == 'message') {
        console.log(e.data.data);
    }
}, false);

// 监听点击事件
document.addEventListener('mousedown', function (e) {
    try {
        currentTarget = null;
        let srcElement = e.srcElement;
        if (srcElement.gitignore || srcElement.getAttribute('gitignore')) return;
        let selectors = getElementSelector(srcElement);
        let code = selectors.jsCode;
        if (!code) {
            console.log(selectors);
            code = "click(" + selectors.target + ");"
            console.log(code);
        }
        if (e.button !== 2) {
            appendScriptCode(code);
        }
        locationURL = window.location.href;
        currentTarget = selectors.target;
    } catch (e) {
        console.log(e);
    }
});

document.addEventListener('mouseup', function (e) {
    if (locationURL && locationURL != window.location.href) {
        appendScriptCode("waitForPageLoaded();");
        locationURL = window.location.href;
    }
});

// 监听输入事件
document.addEventListener('keydown', function (e) {
    try {
        let srcElement = e.srcElement;
        if (byId('codeTipsMenu').style.display !== 'none' && (e.keyCode === 9 || e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13)) {
            if (e.keyCode === 13) {
                let obj = $('#codeTipsMenu .select');
                if (obj && obj.length > 0) {
                    e.preventDefault();
                    byId(currentTextareaId).blur();
                    setTimeout(function () {
                        obj.trigger('click');
                    }, 20);
                }
                return;
            }
            e.preventDefault();
            let index = 0;
            byId(currentTextareaId).blur();
            let arrays = $('#codeTipsMenu .code_tips');
            for (let idx = 0;idx < arrays.length;idx++) {
                if (arrays[idx].className.indexOf("select") > -1) {
                    index = idx;
                    index = e.keyCode === 38 ? index - 1 : index + 1;
                    if (index < 0 || index >= arrays.length) index = 0;
                    arrays[idx].className = 'code_tips';
                }
            }
            arrays[index].className = 'code_tips select';
            arrays[index].focus();
            return;
        }
        if (srcElement.getAttribute('addCode')) {
            return;
        }
        if (srcElement.gitignore || srcElement.getAttribute('gitignore')) return;
        if (srcElement.tagName === 'BODY') return;
        let selectors = getElementSelector(srcElement);
        let code = selectors.jsCode;
        if (!code) {
            console.log(selectors);
            console.log(selectors.target);
            if (srcElement.name && srcElement.name.indexOf('mobile') != -1) {
                code = "type(" + selectors.target + ", ody.randMobile());"
            } else {
                code = "type(" + selectors.target + ", randCode(8));"
            }
            console.log(code);
        }
        appendScriptCode(code);
        srcElement.setAttribute('addCode', 'true');
        setTimeout(function () {
            e.srcElement.removeAttribute('addCode');
        }, 10000);
    } catch (ex) {
        debugger
    }
});

if (!socket) {
    socket = openSocket(socketUrl);
}

let getElementSelector = function (sourceElement) {
    let tagName = sourceElement.tagName;
    let parent = sourceElement.parentNode;
    if (tagName == 'SPAN' && parent.childElementCount == 1) {
        let parentTagName = parent.tagName;
        if (parentTagName == 'BUTTON') {
            // button > span => button
            sourceElement = parent;
        } else if (parentTagName == 'LI' && parent.className.indexOf("el-select-dropdown") != -1) {
            // select > span
            console.log(getSelector(sourceElement));
            return {
                target: "xpath=/html/body/div[contains(@class,'el-select-dropdown') and not(contains(@style,'display: none;'))]",
                jsCode: "ody.select(null, \"" + sourceElement.innerText + "\");"
            };
        }
    } else if (tagName == 'LI' && sourceElement.className.indexOf("el-select-dropdown") != -1 && sourceElement.childElementCount == 1) {
        if (sourceElement.firstChild.tagName == 'SPAN') {
            console.log(getSelector(sourceElement));
            return {
                target: "xpath=/html/body/div[contains(@class,'el-select-dropdown') and not(contains(@style,'display: none;'))]",
                jsCode: "ody.select(null, \"" + sourceElement.innerText + "\");"
            };
        }
    }
    return getSelector(sourceElement);
}

function getSelector(sourceElement) {
    let selectors = {};
    if (sourceElement.id) {
        setIDSelector(sourceElement, selectors);
    } else {
        setXPATHSelector(sourceElement, selectors);
    }
    if (sourceElement.name) {
        setNameSelector(sourceElement, selectors);
    }
    if (sourceElement.className && sourceElement.className.split(" ").length === 1) {
        setClassNameSelector(sourceElement, selectors);
    }
    setCssSelector(sourceElement, selectors);
    targetSelector(selectors);
    return selectors;
}

let setIDSelector = function (sourceElement, collector) {
    collector.id = {
        selector: sourceElement.id,
        target: '"id=' + sourceElement.id + '"',
        element: document.getElementById(sourceElement.id)
    };
    collector.id.selected = collector.id.element === sourceElement;
}

let setNameSelector = function (sourceElement, collector) {
    collector.name = {
        selector: sourceElement.name,
        target: '"name=' + sourceElement.name + '"',
        element: document.getElementsByName(sourceElement.name)[0]
    };
    collector.name.selected = collector.name.element === sourceElement;
}

let setXPATHSelector = function (sourceElement, collector) {
    let parent;
    let element = sourceElement;
    let xpath = "";
    while (element.id === '' && element.tagName !== 'HTML') {
        parent = element.parentNode;
        let index;
        let counter = 0;
        for (let i = 0; i < parent.children.length; i++) {
            if (parent.children[i].tagName === element.tagName) {
                counter += 1;
                if (parent.children[i] === element) {
                    index = counter;
                }
            }
        }
        if (xpath === "") {
            if (counter === 1) {
                xpath = element.tagName;
            } else {
                xpath = element.tagName + "[" + index + "]";
            }
        } else {
            if (counter === 1) {
                xpath = element.tagName + "/" + xpath;
            } else {
                xpath = element.tagName + "[" + index + "]" + "/" + xpath;
            }
        }
        element = element.parentNode;
    }
    if (element.tagName === 'HTML') {
        xpath = "html/" + xpath.toLowerCase();
    } else {
        xpath = "//" + element.tagName + "[@id='" + element.id + "']/" + xpath.toLowerCase();
    }
    collector.xpath = {};
    collector.xpath.selector = xpath;
    collector.xpath.target = '"xpath=' + xpath + '"';
    collector.xpath.element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    collector.xpath.selected = collector.xpath.element === sourceElement;
}

let setClassNameSelector = function (sourceElement, collector) {
    collector.className = {
        selector: sourceElement.className,
        target: '"className=' + sourceElement.className + '"',
        element: document.getElementsByClassName(sourceElement.className)[0]
    };
    collector.className.selected = collector.className.element === sourceElement
}

let setCssSelector = function (sourceElement, collector) {
    let tagName = sourceElement.tagName;
    let id = sourceElement.id;
    let classNames = sourceElement.className;
    let cssSelector = "";
    if (tagName) {
        if (sourceElement.getAttribute("name")) {
            cssSelector += tagName.toLowerCase() + "[name='" + sourceElement.getAttribute("name") + "']";
        } else {
            cssSelector += tagName.toLowerCase();
        }
    }
    if (id) {
        cssSelector += "#" + id;
    }
    if (classNames) {
        let classes = classNames.split(" ");
        for (let ci in classes) {
            cssSelector += "." + classes[ci];
        }
    }
    if (cssSelector !== "" && cssSelector !== tagName.toLowerCase()) {
        collector.css = {
            selector: cssSelector,
            target: '"css=' + cssSelector + '"',
            element: document.querySelector(cssSelector)
        };
        collector.css.selected = collector.css.element === sourceElement;
    }
}

let targetSelector = function (collector) {
    if (collector["id"] && collector["id"].selected) {
        collector.target = collector.id.target;
    } else if (collector["name"] && collector["name"].selected) {
        collector.target = collector.name.target;
    } else if (collector["className"] && collector["className"].selected) {
        collector.target = collector.className.target;
    } else if (collector["css"] && collector["css"].selected) {
        collector.target = collector.css.target;
    } else if (collector["xpath"] && collector["xpath"].selected) {
        collector.target = collector.xpath.target;
    }
}

// 向页面注入JS
function injectCustomJs(jsPath) {
    jsPath = jsPath || 'inject.js';
    let temp = document.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    temp.src = chrome.extension.getURL(jsPath);
    temp.onload = function () {
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(temp);
}

function initScriptTextarea() {
    buildElement(document.body, [
        {
            tag: 'div',
            id: 'scriptCodingRight',
            className: 'side-bar',
            child: [
                {
                    tag: 'span',
                    id: 'scriptCodingRightSpan',
                    innerText: '录制'
                }
            ],
            addEventListener: {
                click: function () {
                    let e = byId('scriptContextDiv');
                    if (e.style.display === 'none') {
                        e.style.display = 'block';
                    } else {
                        e.style.display = 'none';
                    }
                }
            }
        },
        {
            tag: 'div',
            id: 'jsApplyMenu',
            child: [
                {
                    tag: 'div',
                    className: 'js_menu',
                    child: [
                        {
                            factory: function () {
                                return buildApplySvg(16, {
                                    'vertical-align': 'middle'
                                })
                            }
                        },
                        {
                            tag: 'span',
                            innerText: ' 执行'
                        }
                    ],
                    addEventListener: {
                        click: function () {
                            let textarea = byId(currentTextareaId);
                            let sIdx = textarea.selectionStart;
                            let eIdx = textarea.selectionEnd;
                            if (sIdx <= 0 || sIdx === eIdx) return;
                            let jsCode = textarea.value.substr(sIdx,eIdx - sIdx);
                            if (jsCode) {
                                applyRemoteJsCode(jsCode);
                            }
                        }
                    }
                }
            ]
        },
        {
            tag: 'div',
            id: 'codeTipsMenu'
        }
    ]);

    buildElement(document.body, [
        {
            tag: 'div',
            id: 'scriptContextDiv',
            style: {display: 'none'},
            child: [
                { // 关闭
                    tag: 'div',
                    id: 'scriptContextDiv_tab',
                    child: [
                        {
                            tag: 'span',
                            id: 'scriptContextDiv_close',
                            innerText: 'X',
                            addEventListener: {
                                click: function () {
                                    byId('scriptContextDiv').style.display = 'none';
                                }
                            }
                        }
                    ]
                },
                {
                    tag: 'div',
                    className: 'tabs_div',
                    child: [
                        {
                            tag: 'span',
                            className: 'tabs_span',
                            for: {
                                count: 3,
                                handle: function (index, element) {
                                    element.forIndex = index;
                                    element.innerText = ['录制', '调试', '源码'][index];
                                    element.style.background = Math.max(0, textareaIds.indexOf(currentTextareaId)) === index ? '#fff' : '#f5f5f5';
                                }
                            },
                            addEventListener: {
                                click: function (e) {
                                    let element = e.srcElement;
                                    for (let child of element.parentElement.children) {
                                        child.style.background = '#f5f5f5';
                                    }
                                    element.style.background = '#fff';
                                    for (let idx in textareaIds) {
                                        byId(textareaIds[idx]).style.display = 'none';
                                    }
                                    byId(currentTextareaId = textareaIds[element.forIndex]).style.display = 'block';
                                    if (currentTextareaId === 'sourceTextarea') {
                                        refreshSource();
                                    }
                                }
                            }
                        },
                        {
                            factory: function () {
                                return buildApplySvg(16, {
                                    'float': 'right',
                                    'cursor': 'pointer',
                                    'margin-right': '30px',
                                    'vertical-align': 'middle'
                                }, function (e) {
                                    applyRemoteJsCode(byId(currentTextareaId).value);
                                })
                            }
                        }
                    ]
                },
                {
                    tag:'div',
                    className: 'editDiv',
                    child: [
                        { // 编辑器
                            tag: 'textarea',
                            className: 'codeTextarea',
                            attr: { spellcheck: false },
                            for: {
                                count: 3,
                                handle: function(index, element) {
                                    element.id = textareaIds[index];
                                    if (element.id === 'sourceTextarea') {
                                        element.setAttribute('readonly', 'readonly');
                                        element.setAttribute('placeholder', '源文件不能编辑');
                                    } else {
                                        element.style['word-wrap'] = 'normal';
                                        element.style['white-space'] = 'nowrap';
                                    }
                                    element.style.display = (currentTextareaId ? element.id === currentTextareaId : index === 0) ? 'block' : 'none';
                                }
                            },
                            addEventListener: {
                                input: function (e) {
                                    byId('codeTipsMenu').style.display = 'none';
                                    if (e.inputType === 'insertLineBreak') return;
                                    let srcElement = e.srcElement;
                                    let sIdx = srcElement.selectionStart;
                                    let eIdx = srcElement.selectionEnd;
                                    if (sIdx !== eIdx) return;
                                    sIdx = srcElement.value.substr(0, eIdx).lastIndexOf('\n');
                                    sIdx = sIdx < 0 ? 0 : sIdx + 1;
                                    let line = srcElement.value.substr(sIdx,eIdx - sIdx);
                                    if (line && !line.endsWith(';')) {
                                        let positionHtml = srcElement.value.substr(0, eIdx).replace(/ /g, '&nbsp;').replace(/\n/g, '<br>') + '<span id="position_span">#</span>';
                                        byId('position_textarea').innerHTML = positionHtml;
                                        let spanTop = $('#position_span').position().top;
                                        let spanLeft = $('#position_span').position().left;
                                        let top = $(srcElement).offset().top + spanTop - srcElement.scrollTop + 18;
                                        let left = $(srcElement).offset().left + spanLeft- srcElement.scrollLeft + 10;
                                        sendSocketMsg('codeTips', line, { left: left + 'px', top: top + 'px' });
                                    }
                                },
                                contextmenu: function (e) {
                                    e.preventDefault();
                                    let textarea = byId(currentTextareaId);
                                    let sIdx = textarea.selectionStart;
                                    let eIdx = textarea.selectionEnd;
                                    if (sIdx <= 0 || sIdx === eIdx) return;
                                    let jsCode = textarea.value.substr(sIdx,eIdx - sIdx);
                                    if (jsCode) {
                                        let menu = byId("jsApplyMenu");
                                        menu.style.left = e.clientX + 'px';
                                        menu.style.top = e.clientY + 'px';
                                        menu.style.display = 'block';
                                    }
                                }
                            }
                        },
                        {
                            tag: 'div',
                            id: 'position_textarea',
                            style: {
                                visibility: 'hidden',
                                position: 'relative',
                                'text-align': 'left'
                            }
                        }
                    ]
                },
                {
                    tag: 'input',
                    id: 'oneScriptCommandInput',
                    style: {display: 'none'}
                }
            ]
        }
    ]);
    bindMove(byId('scriptContextDiv'), byId('scriptContextDiv_tab'));
}

function buildApplySvg(size, style, clickFun) {
    return {
        tag: 'svg',
        attr: {
            width: size,
            height: size,
            class: 'icon',
            version: '1.1',
            viewBox: '0 0 1024 1024',
        },
        style: style,
        createElementNS: 'http://www.w3.org/2000/svg',
        addEventListener: {
            click: clickFun
        },
        child: [
            {
                tag: 'path',
                attr: {
                    fill: '#499c54',
                    d: 'M886.784 512a25.6 25.6 0 0 1-11.4944 21.3504l-698.368 460.8a25.6512 25.6512 0 0 1-26.24 1.2032A25.6256 25.6256 0 0 1 137.216 972.8V51.2a25.5744 25.5744 0 0 1 39.7056-21.3504l698.368 460.8a25.6 25.6 0 0 1 11.4944 21.3504z'
                },
                createElementNS: 'http://www.w3.org/2000/svg'
            }
        ]
    }
}

function applyRemoteJsCode(jsCode) {
    console.log(jsCode);
    if (socket == null) {
        console.error("执行失败，socket未连接");
        return;
    }
    sendSocketMsg('execute', jsCode);
}

function refreshSource() {
    sendSocketMsg('source', null);
}

function sendSocketMsg(type, data, attr) {
    try {
        socket.send(JSON.stringify({type: type, data: data, ...attr}));
    } catch (e) {
        console.error("执行异常", e);
    }
}

function byId(id) {
    return document.getElementById(id)
}

function buildElement(parent, treeData) {
    for (let index in treeData) {
        let data = treeData[index];
        if (data.factory) {
            data = data.factory();
        }
        if (data.for == null) {
            data.for = {count: 1}
        }
        for (let forIndex = 0; forIndex < data.for.count; forIndex++) {
            let element = data.createElementNS ? document.createElementNS(data.createElementNS, data.tag) : document.createElement(data.tag);
            for (let dataKey in data) {
                if (elementAttr.indexOf(dataKey) > -1) {
                    element[dataKey] = data[dataKey];
                }
            }
            if (data.style) {
                for (let styleKey in data.style) {
                    element.style[styleKey] = data.style[styleKey];
                }
            }
            if (data.attr) {
                for (let attrKey in data.attr) {
                    element.setAttribute(attrKey, data.attr[attrKey]);
                }
            }
            if (data.addEventListener) {
                for (let addEventListenerKey in data.addEventListener) {
                    element.addEventListener(addEventListenerKey, data.addEventListener[addEventListenerKey])
                }
            }
            element.gitignore = true;
            if (data.child && data.child.length > 0) {
                buildElement(element, data.child);
            }
            if (data.for.handle) {
                data.for.handle(forIndex, element);
            }
            parent.appendChild(element);
        }
    }
}

function appendScriptCode(code) {
    try {
        chrome.storage.sync.get({recording: true}, function (items) {
            if (items.recording) {
                let scriptTextarea = byId('scriptCommandTextarea');
                if (scriptTextarea) {
                    scriptTextarea.value = scriptTextarea.value + "\r\n" + code;
                    scriptTextarea.scrollTop = scriptTextarea.scrollHeight;
                }
            }
        });
    } catch (e) {
        let scriptTextarea = byId('scriptCommandTextarea');
        if (scriptTextarea) {
            scriptTextarea.value = scriptTextarea.value + "\r\n" + code;
            scriptTextarea.scrollTop = scriptTextarea.scrollHeight;
        }
    }
}

// js div 拖动
$(function () {
    $(document).mousemove(function (e) {
        if (!!this.move) {
            let posix = !document.move_target ? {'x': 0, 'y': 0} : document.move_target.posix,
                callback = document.call_down || function () {
                    $(this.move_target).css({
                        'top': e.pageY - posix.y,
                        'left': e.pageX - posix.x
                    });
                };

            callback.call(this, e, posix);
        }
    }).mouseup(function (e) {
        if (!!this.move) {
            let callback = document.call_up || function () {
            };
            callback.call(this, e);
            $.extend(this, {
                'move': false,
                'move_target': null,
                'call_down': false,
                'call_up': false
            });
        }
    });
});

function bindMove(element, element_move) {
    $(element_move).mousedown(function (e) {
        let $p = $(this).parent();
        let $pp = $p[0];
        let offset = $p.offset();
        $pp.posix = {'x': e.pageX - offset.left, 'y': e.pageY - offset.top};
        $.extend(document, {'move': true, 'move_target': $pp});
    });
}

function openSocket(url) {
    try {
        let socket;
        if ('WebSocket' in window) {
            socket = new ReconnectingWebSocket(url, null, {debug: true, maxReconnectAttempts: 4});
        } else if ('MozWebSocket' in window) {
            socket = new MozWebSocket(url);
        } else {
            socket = new WebSocket(url);
        }
        socket.onopen = function () {
            console.log("socket open.");
            setTimeout(function() {
                refreshSource();
                sendSocketMsg('menu', null);
            }, 200);
        };
        socket.onmessage = function (event) {
            let msg = JSON.parse(event.data);
            if (msg.type === 'codeTips') {
                if (msg.data && msg.data.length > 0) {
                    showCodeTips(msg.data, msg.left, msg.top);
                }
            } else if (msg.type === 'source') {
                let textarea = byId('sourceTextarea');
                if (textarea) {
                    textarea.value = msg.data;
                }
            } else if (msg.type === 'execute') {
                console.log("执行结果：\r\n" + msg.data);
            } else if (msg.type === 'executeError') {
                console.log("执行异常：\r\n" + msg.data);
            } else if (msg.type === 'menu') {
                menuTips = msg.data;
                createTipsMenu(menuTips);
            } else {
                console.log("消息：\r\n" + event.data);
            }
        };
        socket.onerror = function () {
            console.log("socket error !");
        };
        socket.onclose = function () {
            console.log("socket close..");
        }
        return socket;
    } catch (e) {
        console.error('socket connection error', e);
    }
}

function showCodeTips(list, left, top) {
    let codeTip = byId('codeTipsMenu');
    let codes = '';
    for (let i in list) {
        try {
            let desc = (list[i].desc || "").replace(/'/g, '`');
            let autoCode = list[i].autoCode.replace(/'/g, '"');
            codes += ('<div class="code_tips" gitignore="true" line="' + list[i].line + '" title=\'' + desc + '\' autoCode = \'' + autoCode + '\'>' + list[i].codeTips + '</div>')
        } catch (e) {
            console.error("tips error: " + list[i], e)
        }
    }
    codeTip.innerHTML = codes;
    codeTip.style.left = left;
    codeTip.style.top = top;
    codeTip.style.display = 'block';
    $('#codeTipsMenu .code_tips').click(function () {
        let srcElement = byId(currentTextareaId);
        let line = $(this)[0].getAttribute('line');
        let code = $(this)[0].getAttribute('autoCode');
        let selectionEnd = srcElement.selectionEnd;
        let startCode = srcElement.value.substr(0, selectionEnd);
        let endCode = srcElement.value.substr(selectionEnd);
        if (line && line === 'true') {
            let lineStartIndex = startCode.lastIndexOf('\n');
            if (lineStartIndex > -1) {
                startCode = startCode.substring(0, lineStartIndex + 1);
            } else {
                startCode = '';
            }
        }
        srcElement.value = startCode + code + endCode;
        srcElement.selectionStart = srcElement.selectionEnd = selectionEnd + code.length;
        srcElement.setSelectionRange(srcElement.selectionStart, srcElement.selectionEnd);
        srcElement.focus();
    });
}

function createTipsMenu(menuTips) {
    createMenu({
        id: 'elementsOper',
        // type: "normal",
        title: "自动化测试-元素操作",
        contexts: ['all'],
        visible: true
    }, menuTips);
}

function createMenu(menuTips, children) {
    sendMessageToBackground('createMenus', menuTips);
    if (children && children.length > 0) {
        for (let i in children) {
            children[i].parent = menuTips;
            let children2 = children[i].children;
            delete children[i].children;
            createMenu({
                id: menuTips.id + '_' + i,
                parentId: menuTips.id,
                // type: "normal",
                contexts: ['all'],
                title: children[i].tips,
                visible: true,
                tips: children[i]
            }, children2);
        }
    }
}

function sendMessageToBackground(type, data, callback) {
    chrome.runtime.sendMessage({type: type, data: data}, function (response) {
        if (callback) callback(response);
    });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request);
    if (request.type === 'menusClick') {
        let parentCode = '';
        let whileData = request.data;
        while (whileData.parent) {
            if (whileData.parent.tips) {
                parentCode += whileData.parent.tips.code + ".";
            }
            whileData = whileData.parent;
        }
        let code = (parentCode + request.data.code).replace(/\$/g, currentTarget);
        console.log(request.data.desc + ": \n" + code);
        let textarea = byId(currentTextareaId);
        textarea.value = textarea.value + '\n' + code;
    }
})
