const DEFAULT_CONFIG = Object.freeze({
  skipIntro: true,
  skipRecap: true,
  autoNextEpisode: true,
  bingeLimit: 3,
  active: true
});

const DEFAULT_STATS = Object.freeze({
  introsSkipped: 0,
  recapsSkipped: 0,
  episodesAutoPlayed: 0,
  estimatedTimeSaved: 0
});

const CONFIG_LIMITS = Object.freeze({
  bingeLimit: { min: 1, max: 20 }
});

const validateConfig = (config) => {
  if (!config || typeof config !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  const validated = {};
  
  validated.skipIntro = typeof config.skipIntro === 'boolean' ? config.skipIntro : DEFAULT_CONFIG.skipIntro;
  validated.skipRecap = typeof config.skipRecap === 'boolean' ? config.skipRecap : DEFAULT_CONFIG.skipRecap;
  validated.autoNextEpisode = typeof config.autoNextEpisode === 'boolean' ? config.autoNextEpisode : DEFAULT_CONFIG.autoNextEpisode;
  validated.active = typeof config.active === 'boolean' ? config.active : DEFAULT_CONFIG.active;
  
  const bingeLimit = parseInt(config.bingeLimit, 10);
  validated.bingeLimit = !isNaN(bingeLimit) && bingeLimit >= CONFIG_LIMITS.bingeLimit.min && bingeLimit <= CONFIG_LIMITS.bingeLimit.max
    ? bingeLimit
    : DEFAULT_CONFIG.bingeLimit;
  
  return validated;
};

const validateStats = (stats) => {
  if (!stats || typeof stats !== 'object') {
    return { ...DEFAULT_STATS };
  }

  const validated = {};
  
  const introsSkipped = parseInt(stats.introsSkipped, 10);
  validated.introsSkipped = !isNaN(introsSkipped) && introsSkipped >= 0 ? introsSkipped : 0;
  
  const recapsSkipped = parseInt(stats.recapsSkipped, 10);
  validated.recapsSkipped = !isNaN(recapsSkipped) && recapsSkipped >= 0 ? recapsSkipped : 0;
  
  const episodesAutoPlayed = parseInt(stats.episodesAutoPlayed, 10);
  validated.episodesAutoPlayed = !isNaN(episodesAutoPlayed) && episodesAutoPlayed >= 0 ? episodesAutoPlayed : 0;
  
  const estimatedTimeSaved = parseInt(stats.estimatedTimeSaved, 10);
  validated.estimatedTimeSaved = !isNaN(estimatedTimeSaved) && estimatedTimeSaved >= 0 ? estimatedTimeSaved : 0;
  
  return validated;
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      config: { ...DEFAULT_CONFIG },
      stats: { ...DEFAULT_STATS }
    }).catch(err => {
      console.error('Failed to initialize storage:', err);
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') {
    sendResponse({ error: 'Invalid message format' });
    return false;
  }

  if (!sender.id || sender.id !== chrome.runtime.id) {
    sendResponse({ error: 'Unauthorized sender' });
    return false;
  }

  switch (message.type) {
    case 'getConfig':
      chrome.storage.sync.get(['config'], (data) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        const validatedConfig = validateConfig(data.config);
        sendResponse({ config: validatedConfig });
      });
      return true;

    case 'updateConfig':
      if (!message.config) {
        sendResponse({ error: 'Config data required' });
        return false;
      }
      
      const validatedConfig = validateConfig(message.config);
      chrome.storage.sync.set({ config: validatedConfig }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true });
      });
      return true;

    case 'getStats':
      chrome.storage.sync.get(['stats'], (data) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        const validatedStats = validateStats(data.stats);
        sendResponse({ stats: validatedStats });
      });
      return true;

    case 'resetStats':
      const resetStats = { ...DEFAULT_STATS };
      chrome.storage.sync.set({ stats: resetStats }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true, stats: resetStats });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});
