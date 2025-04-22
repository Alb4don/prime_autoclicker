
const activeToggle = document.getElementById('active');
const skipIntroToggle = document.getElementById('skipIntro');
const skipRecapToggle = document.getElementById('skipRecap');
const autoNextEpisodeToggle = document.getElementById('autoNextEpisode');
const bingeLimitInput = document.getElementById('bingeLimit');
const resetStatsButton = document.getElementById('resetStats');

const introsSkippedEl = document.getElementById('introsSkipped');
const recapsSkippedEl = document.getElementById('recapsSkipped');
const episodesAutoPlayedEl = document.getElementById('episodesAutoPlayed');
const timeSavedEl = document.getElementById('timeSaved');

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  loadStats();
  
  activeToggle.addEventListener('change', saveConfig);
  skipIntroToggle.addEventListener('change', saveConfig);
  skipRecapToggle.addEventListener('change', saveConfig);
  autoNextEpisodeToggle.addEventListener('change', saveConfig);
  bingeLimitInput.addEventListener('change', saveConfig);
  resetStatsButton.addEventListener('click', resetStats);
});

function loadConfig() {
  chrome.runtime.sendMessage({ type: 'getConfig' }, (response) => {
    if (response && response.config) {
      const config = response.config;
      
      activeToggle.checked = config.active;
      skipIntroToggle.checked = config.skipIntro;
      skipRecapToggle.checked = config.skipRecap;
      autoNextEpisodeToggle.checked = config.autoNextEpisode;
      bingeLimitInput.value = config.bingeLimit;
      
      toggleControlsState(config.active);
    }
  });
}

function saveConfig() {
  const config = {
    active: activeToggle.checked,
    skipIntro: skipIntroToggle.checked,
    skipRecap: skipRecapToggle.checked,
    autoNextEpisode: autoNextEpisodeToggle.checked,
    bingeLimit: parseInt(bingeLimitInput.value) || 3
  };
  
  if (config.bingeLimit < 1) config.bingeLimit = 1;
  if (config.bingeLimit > 20) config.bingeLimit = 20;
  bingeLimitInput.value = config.bingeLimit;
  
  toggleControlsState(config.active);
  
  chrome.runtime.sendMessage({ 
    type: 'updateConfig', 
    config 
  });
}

function toggleControlsState(enabled) {
  const controls = [skipIntroToggle, skipRecapToggle, autoNextEpisodeToggle, bingeLimitInput];
  
  controls.forEach(control => {
    control.disabled = !enabled;
    
    const container = control.closest('.toggle-container');
    if (container) {
      container.style.opacity = enabled ? '1' : '0.6';
    }
  });
}

function loadStats() {
  chrome.runtime.sendMessage({ type: 'getStats' }, (response) => {
    if (response && response.stats) {
      updateStatsDisplay(response.stats);
    }
  });
}

function resetStats() {
  chrome.runtime.sendMessage({ type: 'resetStats' }, (response) => {
    if (response && response.success) {
      updateStatsDisplay(response.stats);
      
      resetStatsButton.textContent = 'Reset ✓';
      setTimeout(() => {
        resetStatsButton.textContent = 'Reset';
      }, 1500);
    }
  });
}

function updateStatsDisplay(stats) {
  introsSkippedEl.textContent = stats.introsSkipped;
  recapsSkippedEl.textContent = stats.recapsSkipped;
  episodesAutoPlayedEl.textContent = stats.episodesAutoPlayed;
  
  const minutes = Math.floor(stats.estimatedTimeSaved / 60);
  const seconds = stats.estimatedTimeSaved % 60;
  
  if (minutes > 0) {
    timeSavedEl.textContent = `${minutes} min ${seconds} sec`;
  } else {
    timeSavedEl.textContent = `${seconds} seconds`;
  }
}