/**
 * Tab Audio Booster - Popup Controller
 *
 * Controls the extension popup UI, allowing users to adjust volume
 * and save per-domain settings.
 */

// DOM element references
const volumeSlider = document.getElementById('volumeSlider');
const volumeDisplay = document.getElementById('volumeDisplay');
const rememberDomain = document.getElementById('rememberDomain');
const status = document.getElementById('status');

/** @type {string} The hostname of the current tab's URL */
let currentDomain = '';

/**
 * Gets the currently active tab in the current window.
 * @returns {Promise<chrome.tabs.Tab>}
 */
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Extracts the hostname from a URL string.
 * @param {string} url - The URL to parse
 * @returns {string} The hostname, or empty string if invalid
 */
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Loads saved volume settings for the current domain from chrome.storage.
 * If settings exist, updates the slider position and checks the "remember" checkbox.
 */
async function loadSavedSettings() {
  const tab = await getCurrentTab();
  currentDomain = getDomain(tab.url);

  // Retrieve domain settings from local storage
  const result = await chrome.storage.local.get(['domainSettings']);
  const domainSettings = result.domainSettings || {};

  // Apply saved settings if they exist for this domain
  if (domainSettings[currentDomain]) {
    const saved = domainSettings[currentDomain];
    volumeSlider.value = saved.volume;
    volumeDisplay.textContent = `${saved.volume}%`;
    rememberDomain.checked = true;
  }
}

/**
 * Queries the content script for the current status (media element count).
 * Updates the status display in the popup.
 */
async function getStatus() {
  const tab = await getCurrentTab();

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
    updateStatus(response.mediaCount);
  } catch {
    // Content script may not be loaded (e.g., on chrome:// pages)
    status.textContent = 'Content script not loaded';
    status.classList.remove('found');
  }
}

/**
 * Updates the status text to show the number of media elements found.
 * @param {number} mediaCount - Number of processed media elements
 */
function updateStatus(mediaCount) {
  if (mediaCount > 0) {
    status.textContent = `Found ${mediaCount} media element${mediaCount > 1 ? 's' : ''}`;
    status.classList.add('found');
  } else {
    status.textContent = 'No media elements found';
    status.classList.remove('found');
  }
}

/**
 * Sends a SET_GAIN message to the content script to update the volume.
 * @param {number|string} value - Volume percentage (100-500)
 */
async function setGain(value) {
  const tab = await getCurrentTab();
  // Convert percentage to gain multiplier (100% = 1.0, 500% = 5.0)
  const gainValue = value / 100;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'SET_GAIN',
      value: gainValue
    });
    updateStatus(response.mediaCount);
  } catch {
    status.textContent = 'Could not connect to page';
    status.classList.remove('found');
  }
}

/**
 * Saves or removes the current domain's volume setting based on checkbox state.
 * Settings are stored in chrome.storage.local for persistence.
 */
async function saveSettings() {
  const result = await chrome.storage.local.get(['domainSettings']);
  const domainSettings = result.domainSettings || {};

  if (rememberDomain.checked) {
    // Save current volume for this domain
    domainSettings[currentDomain] = {
      volume: parseInt(volumeSlider.value)
    };
  } else {
    // Remove saved settings for this domain
    delete domainSettings[currentDomain];
  }

  await chrome.storage.local.set({ domainSettings });
}

// Event: Volume slider changed
volumeSlider.addEventListener('input', () => {
  const value = volumeSlider.value;
  volumeDisplay.textContent = `${value}%`;
  setGain(value);

  // Auto-save if "remember" is checked
  if (rememberDomain.checked) {
    saveSettings();
  }
});

// Event: "Remember for this domain" checkbox toggled
rememberDomain.addEventListener('change', () => {
  saveSettings();
});

// Initialize popup on load
loadSavedSettings().then(() => {
  // Apply the loaded (or default) gain value
  setGain(volumeSlider.value);
  // Query content script for media element count
  getStatus();
});
