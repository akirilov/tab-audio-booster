# Tab Audio Booster

A Chrome extension that boosts tab audio above 100% using the Web Audio API.

> **AI Use Disclaimer**: This project was generated using [Claude Code](https://claude.ai/claude-code) as a proof-of-concept. It is provided as-is for demonstration and educational purposes.

## Features

- Amplify audio from 100% to 500% on any tab
- Works with `<audio>` and `<video>` elements
- Per-domain volume settings that persist across sessions
- Built-in dynamics compressor to prevent distortion at high volumes
- Automatically detects dynamically loaded media (SPAs, lazy-loaded content)

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `tab-audio` folder

## Usage

1. Navigate to a page with audio or video content
2. Click the extension icon in the toolbar
3. Adjust the volume slider (100% - 500%)
4. Optionally check **Remember for this domain** to save the setting

The extension automatically applies saved settings when you revisit a domain.

## File Structure

```
tab-audio/
├── manifest.json           # Extension manifest (V3)
├── content/
│   └── content.js          # Audio processing injected into pages
├── popup/
│   ├── popup.html          # Extension popup UI
│   └── popup.js            # Popup controller
├── background/
│   └── service-worker.js   # Applies saved settings on navigation
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

The extension uses the Web Audio API to intercept and amplify audio:

```
MediaElement → MediaElementSource → GainNode → DynamicsCompressor → Destination
```

1. **MediaElementSource**: Captures audio from `<audio>` or `<video>` elements
2. **GainNode**: Multiplies the audio signal (gain of 3.0 = 300% volume)
3. **DynamicsCompressor**: Prevents clipping and distortion at high gain levels

A `MutationObserver` watches for dynamically added media elements, ensuring the extension works on single-page applications.

## Permissions

- `storage`: Save per-domain volume preferences
- `activeTab`: Access the current tab to inject audio processing
- `scripting`: Required for Manifest V3 content script functionality
- `<all_urls>`: Content script runs on all pages to detect media elements

## Limitations

- Cannot boost audio on `chrome://` pages or other extension pages
- Some sites using Web Audio API directly may conflict with the extension
- Audio that doesn't use standard `<audio>`/`<video>` elements (e.g., Web Audio synthesis) won't be boosted

## License

MIT
