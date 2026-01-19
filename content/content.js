class AudioBooster {
  constructor() {
    this.audioContext = null;
    this.mediaElements = new Map();
    this.gainValue = 1.0;
    this.init();
  }

  init() {
    this.processExistingMedia();
    this.observeNewMedia();
    this.setupMessageListener();
  }

  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  processExistingMedia() {
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach(element => this.processMediaElement(element));
  }

  processMediaElement(element) {
    if (this.mediaElements.has(element)) {
      return;
    }

    const context = this.getAudioContext();

    try {
      const source = context.createMediaElementSource(element);
      const gainNode = context.createGain();
      const compressor = context.createDynamicsCompressor();

      compressor.threshold.value = -6;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      gainNode.gain.value = this.gainValue;

      source.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(context.destination);

      this.mediaElements.set(element, { source, gainNode, compressor });
    } catch (error) {
      // Element may already be connected to an AudioContext
      console.debug('AudioBooster: Could not process element', error.message);
    }
  }

  observeNewMedia() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
            this.processMediaElement(node);
          }
          if (node.querySelectorAll) {
            const mediaElements = node.querySelectorAll('audio, video');
            mediaElements.forEach(element => this.processMediaElement(element));
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  setGain(value) {
    this.gainValue = value;

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.mediaElements.forEach(({ gainNode }) => {
      gainNode.gain.value = value;
    });
  }

  getMediaCount() {
    return this.mediaElements.size;
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SET_GAIN') {
        this.setGain(message.value);
        sendResponse({ success: true, mediaCount: this.getMediaCount() });
      } else if (message.type === 'GET_STATUS') {
        sendResponse({
          gain: this.gainValue,
          mediaCount: this.getMediaCount()
        });
      }
      return true;
    });
  }
}

const audioBooster = new AudioBooster();
