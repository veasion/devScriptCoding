// 执行js
function invokeContentScript(jsCode) {
    window.postMessage({cmd: 'invoke', code: jsCode}, '*');
}

// 发送消息
function sendMessageToConsole(data) {
    window.postMessage({cmd: 'message', data: data}, '*');
}

// 获取命令
function getScriptCommnd() {
    let e = document.getElementById('scriptCommandTextarea');
    return e ? e.value : null;
}

// 设置命令
function setScriptCommnd(text) {
    let e = document.getElementById('scriptCommandTextarea');
    if (e) {
        e.value = text;
    }
}

// 执行
function excuteScript(text) {
    let e = document.getElementById('oneScriptCommandInput');
    if (e) {
        e.value = text;
    }
}

// 获取执行脚本
function getExcuteScript() {
    let e = document.getElementById('oneScriptCommandInput');
    if (e) {
        var code = e.value;
        e.value = "";
        return code;
    }
}
