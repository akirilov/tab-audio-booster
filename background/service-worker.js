chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  let domain;
  try {
    domain = new URL(tab.url).hostname;
  } catch {
    return;
  }

  const result = await chrome.storage.local.get(['domainSettings']);
  const domainSettings = result.domainSettings || {};

  if (domainSettings[domain]) {
    const saved = domainSettings[domain];
    const gainValue = saved.volume / 100;

    // Wait a bit for content script to initialize
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'SET_GAIN',
          value: gainValue
        });
      } catch {
        // Content script may not be ready, ignore
      }
    }, 500);
  }
});
