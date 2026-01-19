/**
 * Tab Audio Booster - Service Worker
 *
 * Background script that automatically applies saved volume settings
 * when navigating to domains with remembered preferences.
 */

/**
 * Listens for tab navigation completion events.
 * When a tab finishes loading, checks if there are saved volume settings
 * for that domain and applies them automatically.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only act when page load is complete and we have a URL
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  // Extract hostname from the tab's URL
  let domain;
  try {
    domain = new URL(tab.url).hostname;
  } catch {
    return;
  }

  // Check for saved settings for this domain
  const result = await chrome.storage.local.get(['domainSettings']);
  const domainSettings = result.domainSettings || {};

  if (domainSettings[domain]) {
    const saved = domainSettings[domain];
    // Convert percentage to gain multiplier (100% = 1.0)
    const gainValue = saved.volume / 100;

    // Delay to allow content script to initialize
    // Content scripts run at document_start but may need time to set up
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'SET_GAIN',
          value: gainValue
        });
      } catch {
        // Content script may not be ready yet or page doesn't support it
        // (e.g., chrome:// pages, PDF viewer)
      }
    }, 500);
  }
});
