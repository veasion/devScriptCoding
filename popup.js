document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.sync.get({recording: true}, function (items) {
        document.getElementById('recording').checked = items.recording;
    });
});

document.getElementById('recording').addEventListener('click', function () {
    var recording = document.getElementById('recording').checked;
    chrome.storage.sync.set({recording: recording}, function () {
        if (recording) {
            chrome.notifications.create(null, {
                type: 'basic',
                iconUrl: 'icon.png',
                title: '自动化测试脚本插件',
                message: '开始录制脚本...\n--luozhuowei'
            });
        }
    });
});

// 向content-script主动发送消息
function sendMessageToContentScript(message, callback) {
    getCurrentTabId((tabId) => {
        chrome.tabs.sendMessage(tabId, message, function (response) {
            if (callback) callback(response);
        });
    });
}

// 执行脚本
function executeScriptToCurrentTab(jsCode) {
    getCurrentTabId((tabId) => {
        chrome.tabs.executeScript(tabId, {code: jsCode});
    });
}

// 获取当前选项卡ID
function getCurrentTabId(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (callback) callback(tabs.length ? tabs[0].id : null);
    });
}
