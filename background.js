chrome.notifications.create(null, {
    type: 'basic',
    iconUrl: 'icon.png',
    title: '自动化测试脚本插件',
    message: '自动化测试脚本插件启动成功，Debug Coding...\n--luozhuowei'
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'createMenus') {
        let tips = request.data.tips;
        delete request.data.tips;
        request.data.onclick = function () {
            getCurrentTabId(tabId => {
                chrome.tabs.sendMessage(tabId, { type: 'menusClick', data: tips }, function(r){ });
            })
            // chrome.notifications.create(null, {
            //     type: 'basic',
            //     iconUrl: 'icon.png',
            //     title: tips.desc,
            //     message: tips.code
            // });
        }
        chrome.contextMenus.create(request.data);
    }
    if (sendResponse) {
        sendResponse();
    }
});

function getCurrentTabId(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (callback) callback(tabs.length ? tabs[0].id : null);
    });
}
