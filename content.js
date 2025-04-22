
let config = {
  skipIntro: true,
  skipRecap: true,
  autoNextEpisode: true,
  bingeLimit: 3,
  active: true
};

let stats = {
  introsSkipped: 0,
  recapsSkipped: 0,
  episodesAutoPlayed: 0,
  estimatedTimeSaved: 0 
};


const SELECTORS = {
  skipIntroButton: 'button[data-automation-id="Web-players-skip-intro-button"], .atvwebplayersdk-skipelement-button',
  skipRecapButton: 'button[data-automation-id="Web-players-skip-recap-button"], .atvwebplayersdk-recapelement-button',
  nextEpisodeButton: '.atvwebplayersdk-nextupcard-button, [data-automation-id="Web-players-nextup-button"]',
  player: '.webPlayerContainer, .webPlayer'
};

const TIME_SAVED = {
  intro: 60, 
  recap: 90  
};

let currentBingeCount = 0;
let checkInterval = null;
let mouseMovedRecently = false;
let mouseTimer = null;

function initialize() {
  chrome.storage.sync.get(['config', 'stats'], (data) => {
    if (data.config) {
      config = {...config, ...data.config};
    }
    
    if (data.stats) {
      stats = data.stats;
    }
    
    if (config.active) {
      startWatching();
    }
  });
  
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.config) {
      config = changes.config.newValue;
      
      if (config.active) {
        startWatching();
      } else {
        stopWatching();
      }
    }
  });
  
  document.addEventListener('mousemove', handleMouseMove);
}

function handleMouseMove() {
  mouseMovedRecently = true;
  
  clearTimeout(mouseTimer);
  
  mouseTimer = setTimeout(() => {
    mouseMovedRecently = false;
  }, 2000);
}

function startWatching() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  checkInterval = setInterval(checkForButtons, 1000);
}

function stopWatching() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

function checkForButtons() {
  if (!document.querySelector(SELECTORS.player)) {
    return;
  }
  
  if (config.skipIntro) {
    const skipIntroBtn = document.querySelector(SELECTORS.skipIntroButton);
    if (skipIntroBtn && isElementVisible(skipIntroBtn)) {
      clickElement(skipIntroBtn);
      
      stats.introsSkipped++;
      stats.estimatedTimeSaved += TIME_SAVED.intro;
      saveStats();
    }
  }
  
  if (config.skipRecap) {
    const skipRecapBtn = document.querySelector(SELECTORS.skipRecapButton);
    if (skipRecapBtn && isElementVisible(skipRecapBtn)) {
      clickElement(skipRecapBtn);
      
      stats.recapsSkipped++;
      stats.estimatedTimeSaved += TIME_SAVED.recap;
      saveStats();
    }
  }
  
  if (config.autoNextEpisode && mouseMovedRecently) {
    const nextEpisodeBtn = document.querySelector(SELECTORS.nextEpisodeButton);
    if (nextEpisodeBtn && isElementVisible(nextEpisodeBtn)) {
      if (currentBingeCount >= config.bingeLimit) {
        console.log('Binge limit reached. Pausing auto-play.');
        
        showBingeLimitNotification();
        return;
      }
      
      clickElement(nextEpisodeBtn);
      
      stats.episodesAutoPlayed++;
      currentBingeCount++;
      saveStats();
    }
  }
}

function showBingeLimitNotification() {
  if (document.getElementById('prime-autoclicker-notification')) {
    return;
  }
  
  const notification = document.createElement('div');
  notification.id = 'prime-autoclicker-notification';
  notification.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 9999;
    font-family: Amazon Ember, Arial, sans-serif;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  `;
  
  notification.textContent = `Binge limit reached (${config.bingeLimit} episodes). Click Next Episode to continue watching.`;
  
  document.body.appendChild(notification);
  
  document.addEventListener('click', () => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
      currentBingeCount = 0;
    }
  }, { once: true });
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 60000);
}

function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0';
}

function clickElement(element) {
  if (!element) return;
  
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  element.dispatchEvent(clickEvent);
}

function saveStats() {
  chrome.storage.sync.set({ stats });
}

let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    currentBingeCount = 0;
  }
}).observe(document, { subtree: true, childList: true });

initialize();