const volumeSlider = document.getElementById('volumeSlider');
const volumeDisplay = document.getElementById('volumeDisplay');
const rememberDomain = document.getElementById('rememberDomain');
const status = document.getElementById('status');

let currentDomain = '';

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

async function loadSavedSettings() {
  const tab = await getCurrentTab();
  currentDomain = getDomain(tab.url);

  const result = await chrome.storage.local.get(['domainSettings']);
  const domainSettings = result.domainSettings || {};

  if (domainSettings[currentDomain]) {
    const saved = domainSettings[currentDomain];
    volumeSlider.value = saved.volume;
    volumeDisplay.textContent = `${saved.volume}%`;
    rememberDomain.checked = true;
  }
}

async function getStatus() {
  const tab = await getCurrentTab();

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
    updateStatus(response.mediaCount);
  } catch {
    status.textContent = 'Content script not loaded';
    status.classList.remove('found');
  }
}

function updateStatus(mediaCount) {
  if (mediaCount > 0) {
    status.textContent = `Found ${mediaCount} media element${mediaCount > 1 ? 's' : ''}`;
    status.classList.add('found');
  } else {
    status.textContent = 'No media elements found';
    status.classList.remove('found');
  }
}

async function setGain(value) {
  const tab = await getCurrentTab();
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

async function saveSettings() {
  const result = await chrome.storage.local.get(['domainSettings']);
  const domainSettings = result.domainSettings || {};

  if (rememberDomain.checked) {
    domainSettings[currentDomain] = {
      volume: parseInt(volumeSlider.value)
    };
  } else {
    delete domainSettings[currentDomain];
  }

  await chrome.storage.local.set({ domainSettings });
}

volumeSlider.addEventListener('input', () => {
  const value = volumeSlider.value;
  volumeDisplay.textContent = `${value}%`;
  setGain(value);

  if (rememberDomain.checked) {
    saveSettings();
  }
});

rememberDomain.addEventListener('change', () => {
  saveSettings();
});

loadSavedSettings().then(() => {
  setGain(volumeSlider.value);
  getStatus();
});
