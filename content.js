(() => {
  'use strict';

  const CONFIG_DEFAULTS = Object.freeze({
    skipIntro: true,
    skipRecap: true,
    autoNextEpisode: true,
    bingeLimit: 3,
    active: true
  });

  const STATS_DEFAULTS = Object.freeze({
    introsSkipped: 0,
    recapsSkipped: 0,
    episodesAutoPlayed: 0,
    estimatedTimeSaved: 0
  });

  const SELECTORS = Object.freeze({
    skipIntroButton: 'button[data-automation-id="Web-players-skip-intro-button"], .atvwebplayersdk-skipelement-button',
    skipRecapButton: 'button[data-automation-id="Web-players-skip-recap-button"], .atvwebplayersdk-recapelement-button',
    nextEpisodeButton: '.atvwebplayersdk-nextupcard-button, [data-automation-id="Web-players-nextup-button"]',
    player: '.webPlayerContainer, .webPlayer'
  });

  const TIME_SAVED = Object.freeze({
    intro: 60,
    recap: 90
  });

  const CONSTANTS = Object.freeze({
    CHECK_INTERVAL: 1000,
    MOUSE_TIMEOUT: 2000,
    NOTIFICATION_TIMEOUT: 60000,
    NOTIFICATION_ID: 'prime-autoclicker-notification'
  });

  let config = { ...CONFIG_DEFAULTS };
  let stats = { ...STATS_DEFAULTS };
  let currentBingeCount = 0;
  let checkInterval = null;
  let mouseMovedRecently = false;
  let mouseTimer = null;
  let lastUrl = location.href;

  const safeQuerySelector = (selector) => {
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  };

  const isElementVisible = (element) => {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    try {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             parseFloat(style.opacity) > 0;
    } catch (e) {
      return false;
    }
  };

  const clickElement = (element) => {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    try {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(clickEvent);
      return true;
    } catch (e) {
      return false;
    }
  };

  const saveStats = () => {
    chrome.storage.sync.set({ stats }).catch(err => {
      console.error('Failed to save stats:', err);
    });
  };

  const handleMouseMove = () => {
    mouseMovedRecently = true;
    
    if (mouseTimer) {
      clearTimeout(mouseTimer);
    }
    
    mouseTimer = setTimeout(() => {
      mouseMovedRecently = false;
    }, CONSTANTS.MOUSE_TIMEOUT);
  };

  const removeNotification = () => {
    const notification = document.getElementById(CONSTANTS.NOTIFICATION_ID);
    if (notification && notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
    currentBingeCount = 0;
  };

  const showBingeLimitNotification = () => {
    if (document.getElementById(CONSTANTS.NOTIFICATION_ID)) {
      return;
    }

    const notification = document.createElement('div');
    notification.id = CONSTANTS.NOTIFICATION_ID;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '4px',
      zIndex: '9999',
      fontFamily: 'Amazon Ember, Arial, sans-serif',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      maxWidth: '90%',
      textAlign: 'center'
    });

    const bingeLimit = parseInt(config.bingeLimit, 10) || CONFIG_DEFAULTS.bingeLimit;
    notification.textContent = `Binge limit reached (${bingeLimit} episodes). Click Next Episode to continue watching.`;

    try {
      document.body.appendChild(notification);

      const clickHandler = () => {
        removeNotification();
        document.removeEventListener('click', clickHandler);
      };

      document.addEventListener('click', clickHandler, { once: true });

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, CONSTANTS.NOTIFICATION_TIMEOUT);
    } catch (e) {
      console.error('Failed to show notification:', e);
    }
  };

  const checkForButtons = () => {
    if (!safeQuerySelector(SELECTORS.player)) {
      return;
    }

    if (config.skipIntro) {
      const skipIntroBtn = safeQuerySelector(SELECTORS.skipIntroButton);
      if (skipIntroBtn && isElementVisible(skipIntroBtn)) {
        if (clickElement(skipIntroBtn)) {
          stats.introsSkipped = (parseInt(stats.introsSkipped, 10) || 0) + 1;
          stats.estimatedTimeSaved = (parseInt(stats.estimatedTimeSaved, 10) || 0) + TIME_SAVED.intro;
          saveStats();
        }
      }
    }

    if (config.skipRecap) {
      const skipRecapBtn = safeQuerySelector(SELECTORS.skipRecapButton);
      if (skipRecapBtn && isElementVisible(skipRecapBtn)) {
        if (clickElement(skipRecapBtn)) {
          stats.recapsSkipped = (parseInt(stats.recapsSkipped, 10) || 0) + 1;
          stats.estimatedTimeSaved = (parseInt(stats.estimatedTimeSaved, 10) || 0) + TIME_SAVED.recap;
          saveStats();
        }
      }
    }

    if (config.autoNextEpisode && !mouseMovedRecently) {
      const nextEpisodeBtn = safeQuerySelector(SELECTORS.nextEpisodeButton);
      if (nextEpisodeBtn && isElementVisible(nextEpisodeBtn)) {
        const bingeLimit = parseInt(config.bingeLimit, 10) || CONFIG_DEFAULTS.bingeLimit;
        if (currentBingeCount >= bingeLimit) {
          showBingeLimitNotification();
          return;
        }

        if (clickElement(nextEpisodeBtn)) {
          stats.episodesAutoPlayed = (parseInt(stats.episodesAutoPlayed, 10) || 0) + 1;
          currentBingeCount++;
          saveStats();
        }
      }
    }
  };

  const startWatching = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    checkInterval = setInterval(checkForButtons, CONSTANTS.CHECK_INTERVAL);
  };

  const stopWatching = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  };

  const loadConfig = () => {
    chrome.storage.sync.get(['config', 'stats'], (data) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to load config:', chrome.runtime.lastError);
        return;
      }

      if (data.config && typeof data.config === 'object') {
        config = { ...CONFIG_DEFAULTS, ...data.config };
      }

      if (data.stats && typeof data.stats === 'object') {
        stats = { ...STATS_DEFAULTS, ...data.stats };
      }

      if (config.active) {
        startWatching();
      }
    });
  };

  const setupStorageListener = () => {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.config && changes.config.newValue) {
        config = { ...CONFIG_DEFAULTS, ...changes.config.newValue };

        if (config.active) {
          startWatching();
        } else {
          stopWatching();
        }
      }
    });
  };

  const setupUrlMonitor = () => {
    const observer = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        currentBingeCount = 0;
      }
    });

    observer.observe(document, { 
      subtree: true, 
      childList: true 
    });
  };

  const initialize = () => {
    try {
      loadConfig();
      setupStorageListener();
      setupUrlMonitor();
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
    } catch (e) {
      console.error('Failed to initialize:', e);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
