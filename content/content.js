/**
 * Tab Audio Booster - Content Script
 *
 * Injects into web pages to intercept and boost audio from media elements.
 * Uses the Web Audio API to route audio through a gain node for amplification.
 */

/**
 * Manages audio boosting for all media elements on a page.
 *
 * Creates an audio processing chain for each <audio> and <video> element:
 * MediaElementSource -> GainNode -> DynamicsCompressor -> AudioDestination
 *
 * The GainNode amplifies the signal (1.0 = 100%, 5.0 = 500%).
 * The DynamicsCompressor prevents clipping and distortion at high volumes.
 */
class AudioBooster {
  constructor() {
    /** @type {AudioContext|null} Shared audio context for all media elements */
    this.audioContext = null;

    /**
     * @type {Map<HTMLMediaElement, {source: MediaElementAudioSourceNode, gainNode: GainNode, compressor: DynamicsCompressorNode}>}
     * Maps media elements to their audio processing nodes
     */
    this.mediaElements = new Map();

    /** @type {number} Current gain multiplier (1.0 = 100%) */
    this.gainValue = 1.0;

    this.init();
  }

  /**
   * Initializes the audio booster by processing existing media,
   * setting up observation for new media, and listening for messages.
   */
  init() {
    this.processExistingMedia();
    this.observeNewMedia();
    this.setupMessageListener();
  }

  /**
   * Returns the shared AudioContext, creating it if necessary.
   * Uses lazy initialization to avoid creating unused contexts.
   * @returns {AudioContext}
   */
  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  /**
   * Finds and processes all existing <audio> and <video> elements on the page.
   */
  processExistingMedia() {
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach(element => this.processMediaElement(element));
  }

  /**
   * Creates an audio processing chain for a media element.
   *
   * Audio chain: Element -> MediaElementSource -> GainNode -> Compressor -> Speakers
   *
   * @param {HTMLMediaElement} element - The audio or video element to process
   */
  processMediaElement(element) {
    // Skip if already processed
    if (this.mediaElements.has(element)) {
      return;
    }

    const context = this.getAudioContext();

    try {
      // Create the audio source from the media element
      const source = context.createMediaElementSource(element);

      // GainNode for volume amplification
      const gainNode = context.createGain();

      // DynamicsCompressor to prevent distortion at high gain levels
      const compressor = context.createDynamicsCompressor();

      // Compressor settings tuned for music/voice content
      compressor.threshold.value = -6;   // Start compressing at -6dB
      compressor.knee.value = 30;        // Smooth transition into compression
      compressor.ratio.value = 12;       // Strong compression ratio
      compressor.attack.value = 0.003;   // Fast attack (3ms)
      compressor.release.value = 0.25;   // Moderate release (250ms)

      // Set initial gain value
      gainNode.gain.value = this.gainValue;

      // Connect the audio processing chain
      source.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(context.destination);

      // Store references for later gain adjustments
      this.mediaElements.set(element, { source, gainNode, compressor });
    } catch (error) {
      // This can happen if the element is already connected to another AudioContext
      // (e.g., the page itself uses Web Audio API)
      console.debug('AudioBooster: Could not process element', error.message);
    }
  }

  /**
   * Sets up a MutationObserver to detect dynamically added media elements.
   * This handles SPAs and pages that load media after initial page load.
   */
  observeNewMedia() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          // Check if the added node itself is a media element
          if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
            this.processMediaElement(node);
          }

          // Check for media elements nested within the added node
          if (node.querySelectorAll) {
            const mediaElements = node.querySelectorAll('audio, video');
            mediaElements.forEach(element => this.processMediaElement(element));
          }
        });
      });
    });

    // Observe the entire document for added nodes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Updates the gain value for all processed media elements.
   * Also resumes the AudioContext if it was suspended (autoplay policy).
   *
   * @param {number} value - Gain multiplier (1.0 = 100%, 3.0 = 300%)
   */
  setGain(value) {
    this.gainValue = value;

    // Resume AudioContext if suspended (browsers suspend until user interaction)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Update gain for all tracked media elements
    this.mediaElements.forEach(({ gainNode }) => {
      gainNode.gain.value = value;
    });
  }

  /**
   * Returns the count of media elements being processed.
   * @returns {number}
   */
  getMediaCount() {
    return this.mediaElements.size;
  }

  /**
   * Sets up a listener for messages from the popup and service worker.
   *
   * Supported message types:
   * - SET_GAIN: Updates the gain value
   * - GET_STATUS: Returns current gain and media count
   */
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
      // Return true to indicate async response
      return true;
    });
  }
}

// Initialize the audio booster when the content script loads
const audioBooster = new AudioBooster();
