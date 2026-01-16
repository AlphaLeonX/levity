/// <reference types="chrome-types" />

// Open side panel when extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Levity] Error setting panel behavior:', error));
