// ColorView Extension - Background Service Worker (Manifest V3)
'use strict';

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  // Set default CVD type
  chrome.storage.local.set({ cvdType: 'deuteranopia', pageSimEnabled: false });

  // Create context menus for image right-click
  chrome.contextMenus.create({
    id: 'analyze-image',
    title: '使用 ColorView 分析此图片',
    contexts: ['image']
  });
  chrome.contextMenus.create({
    id: 'toggle-simulation',
    title: '在此页面上开启色盲模拟',
    contexts: ['page']
  });

  console.log('ColorView Extension installed successfully.');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyze-image' && info.srcUrl) {
    // Open popup with the image URL
    chrome.storage.local.set({ analyzeImageUrl: info.srcUrl });
    chrome.action.openPopup();
  }

  if (info.menuItemId === 'toggle-simulation') {
    chrome.storage.local.get('pageSimEnabled', (data) => {
      const newState = !data.pageSimEnabled;
      chrome.storage.local.set({ pageSimEnabled: newState });
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSimulation', enabled: newState });
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getState') {
    chrome.storage.local.get(['cvdType', 'pageSimEnabled'], sendResponse);
    return true;
  }
  if (msg.action === 'setCvdType') {
    chrome.storage.local.set({ cvdType: msg.cvdType });
    // Forward to active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSimType',
          cvdType: msg.cvdType
        });
      }
    });
  }
  if (msg.action === 'startPageSimulation') {
    chrome.storage.local.set({ pageSimEnabled: true });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleSimulation',
          enabled: true,
          cvdType: msg.cvdType
        });
      }
    });
  }
  if (msg.action === 'stopPageSimulation') {
    chrome.storage.local.set({ pageSimEnabled: false });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleSimulation',
          enabled: false
        });
      }
    });
  }
  // Handle screenshot capture requests from content script or popup
  if (msg.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse(null);
      } else {
        sendResponse(dataUrl);
      }
    });
    return true; // async response
  }
});
