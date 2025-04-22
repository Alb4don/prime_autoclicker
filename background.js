
const DEFAULT_CONFIG = {
    skipIntro: true,
    skipRecap: true,
    autoNextEpisode: true,
    bingeLimit: 3,
    active: true
  };
  
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.storage.sync.set({
        config: DEFAULT_CONFIG,
        stats: {
          introsSkipped: 0,
          recapsSkipped: 0,
          episodesAutoPlayed: 0,
          estimatedTimeSaved: 0
        }
      });
    }
  });
  
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getConfig') {
      chrome.storage.sync.get(['config'], (data) => {
        sendResponse({
          config: data.config || DEFAULT_CONFIG
        });
      });
      return true; 
    }
    
    if (message.type === 'updateConfig') {
      chrome.storage.sync.set({ config: message.config }, () => {
        sendResponse({ success: true });
      });
      return true; 
    }
    
    if (message.type === 'getStats') {
      chrome.storage.sync.get(['stats'], (data) => {
        sendResponse({
          stats: data.stats || {
            introsSkipped: 0,
            recapsSkipped: 0,
            episodesAutoPlayed: 0,
            estimatedTimeSaved: 0
          }
        });
      });
      return true; 
    }
    
    if (message.type === 'resetStats') {
      const resetStats = {
        introsSkipped: 0,
        recapsSkipped: 0,
        episodesAutoPlayed: 0,
        estimatedTimeSaved: 0
      };
      
      chrome.storage.sync.set({ stats: resetStats }, () => {
        sendResponse({ success: true, stats: resetStats });
      });
      return true; 
    }
  });