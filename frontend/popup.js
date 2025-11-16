// Wallet address validation (Ethereum address format)
function isValidWalletAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Get stored wallets from localStorage
function getStoredWallets() {
  const stored = localStorage.getItem('polymates_wallets');
  return stored ? JSON.parse(stored) : [];
}

// Save wallets to localStorage
function saveWallets(wallets) {
  localStorage.setItem('polymates_wallets', JSON.stringify(wallets));
}

// Add wallet to storage
function addWallet(address) {
  const wallets = getStoredWallets();
  if (!wallets.includes(address)) {
    wallets.push(address);
    saveWallets(wallets);
    return true;
  }
  return false;
}

// Remove wallet from storage
function removeWallet(address) {
  const wallets = getStoredWallets();
  const filtered = wallets.filter(w => w !== address);
  saveWallets(filtered);
}

// Display error message
function showError(message) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 3000);
  }
}

// Show error UI - called by backend (alias for compatibility)
function showErrorUI(message) {
  showError(message);
}

// Render wallets list (reads from storage)
function renderWalletsList() {
  const wallets = getStoredWallets();
  const walletsListEl = document.getElementById('wallet-list');
  if (!walletsListEl) return;
  
  const hideWallet = settings.hideWallet || false;
  
  if (wallets.length === 0) {
    walletsListEl.innerHTML = '<p class="empty-state">No wallets tracked yet</p>';
    return;
  }

  walletsListEl.innerHTML = wallets.map(wallet => {
    const displayAddress = hideWallet 
      ? '••• ••• •••' 
      : `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
    
    return `
      <div class="wallet-item">
        <span class="wallet-address">${displayAddress}</span>
        <button class="btn btn-remove" data-wallet="${wallet}">Remove</button>
      </div>
    `;
  }).join('');

  // Add event listeners for remove buttons
  walletsListEl.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const wallet = btn.getAttribute('data-wallet');
      removeWallet(wallet);
      renderWalletsList();
      loadTradeFeed();
    });
  });
}

// Render wallet list - called by backend (takes wallets as parameter)
function renderWalletList(wallets) {
  const walletListEl = document.getElementById('wallet-list');
  if (!walletListEl) return;
  
  const hideWallet = settings.hideWallet || false;
  
  if (wallets.length === 0) {
    walletListEl.innerHTML = '<p class="empty-state">No wallets tracked yet</p>';
    return;
  }

  walletListEl.innerHTML = wallets.map(wallet => {
    const displayAddress = hideWallet 
      ? '••• ••• •••' 
      : `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
    
    return `
      <div class="wallet-item">
        <span class="wallet-address">${displayAddress}</span>
        <button class="btn btn-remove remove-wallet-btn" data-wallet="${wallet}">Remove</button>
      </div>
    `;
  }).join('');
}

// Fetch trades for a single wallet
async function fetchTradesForWallet(wallet) {
  try {
    const response = await fetch(
      `https://data-api.polymarket.com/trades?user=${wallet}&limit=20`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching trades for wallet ${wallet}:`, error);
    return [];
  }
}

// Format timestamp to readable date
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

// Format price
function formatPrice(price) {
  return parseFloat(price).toFixed(4);
}

// Format size/volume
function formatSize(size) {
  const num = parseFloat(size);
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}k`;
  }
  return num.toFixed(2);
}

// Chart instances
let activityChart = null;
let timeChart = null;

// Group trades by wallet
function groupTradesByWallet(trades) {
  const grouped = {};
  trades.forEach(trade => {
    const wallet = trade.walletAddress || trade.user || 'Unknown';
    if (!grouped[wallet]) {
      grouped[wallet] = [];
    }
    grouped[wallet].push(trade);
  });
  return grouped;
}

// Calculate network sentiment
function calculateNetworkSentiment(trades) {
  let buyCount = 0;
  let sellCount = 0;
  
  trades.forEach(trade => {
    const side = (trade.side || trade.type || '').toLowerCase();
    if (side === 'buy' || side === 'yes') {
      buyCount++;
    } else if (side === 'sell' || side === 'no') {
      sellCount++;
    }
  });

  const total = buyCount + sellCount;
  if (total === 0) return null;

  const bullishPercent = Math.round((buyCount / total) * 100);
  const bearishPercent = 100 - bullishPercent;
  const netPercent = bullishPercent - bearishPercent;

  return {
    bullish: bullishPercent,
    bearish: bearishPercent,
    net: netPercent
  };
}

// Render activity chart
function renderActivityChart(groupedTrades) {
  const ctx = document.getElementById('activityChart');
  if (!ctx) return;

  // Destroy existing chart if exists
  if (activityChart) {
    activityChart.destroy();
  }

  const wallets = Object.keys(groupedTrades);
  const tradeCounts = Object.values(groupedTrades).map(trades => trades.length);

  if (wallets.length === 0) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bgColor = isDark ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.6)';
  const borderColor = isDark ? '#667eea' : '#4c51bf';
  const textColor = isDark ? '#e0e0e0' : '#1a1a1a';

  // Shorten wallet addresses for labels
  const labels = wallets.map(w => w.substring(0, 6) + '...' + w.substring(w.length - 4));

  activityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trades',
        data: tradeCounts,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(26, 26, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            stepSize: 1
          },
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          ticks: {
            color: textColor,
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Render time-based chart
function renderTimeChart(trades) {
  const ctx = document.getElementById('timeChart');
  if (!ctx) return;

  // Destroy existing chart if exists
  if (timeChart) {
    timeChart.destroy();
  }

  if (trades.length === 0) return;

  // Group trades by hour
  const hourlyData = {};
  trades.forEach(trade => {
    const timestamp = trade.timestamp || trade.createdAt || Date.now();
    const date = new Date(timestamp);
    const hour = date.getHours();
    const hourKey = `${date.getMonth() + 1}/${date.getDate()} ${hour}:00`;
    
    if (!hourlyData[hourKey]) {
      hourlyData[hourKey] = 0;
    }
    hourlyData[hourKey]++;
  });

  const labels = Object.keys(hourlyData).sort();
  const values = labels.map(label => hourlyData[label]);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bgColor = isDark ? 'rgba(118, 75, 162, 0.3)' : 'rgba(118, 75, 162, 0.6)';
  const borderColor = isDark ? '#764ba2' : '#667eea';
  const textColor = isDark ? '#e0e0e0' : '#1a1a1a';

  timeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trades',
        data: values,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(26, 26, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            stepSize: 1
          },
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          ticks: {
            color: textColor,
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }
        }
      }
    }
  });
}

// Add pulse animation to charts
function pulseCharts() {
  const chartsSection = document.getElementById('chartsSection');
  if (chartsSection) {
    chartsSection.classList.add('pulse');
    setTimeout(() => {
      chartsSection.classList.remove('pulse');
    }, 600);
  }
}

// Render trade feed
async function loadTradeFeed() {
  const wallets = getStoredWallets();
  const feedContainer = document.getElementById('feed-container');
  const loadingIndicator = document.getElementById('loading-indicator');
  const chartsSection = document.getElementById('chartsSection');

  if (wallets.length === 0) {
    if (feedContainer) {
      feedContainer.innerHTML = '<p class="empty-state">Add a wallet to start tracking trades</p>';
    }
    if (chartsSection) chartsSection.style.display = 'none';
    return;
  }

  try {
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    // Fetch trades for all wallets in parallel
    const allTradesPromises = wallets.map(wallet => fetchTradesForWallet(wallet));
    const allTradesArrays = await Promise.all(allTradesPromises);
    const allTrades = allTradesArrays.flat().map(trade => ({
      ...trade,
      walletAddress: trade.user || trade.walletAddress
    }));

    // Sort by timestamp (newest first)
    allTrades.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    if (allTrades.length === 0) {
      if (feedContainer) {
        feedContainer.innerHTML = '<p class="empty-state">No trades found for tracked wallets</p>';
      }
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      if (chartsSection) chartsSection.style.display = 'none';
      return;
    }

    // Show charts section and render charts
    if (chartsSection) {
      chartsSection.style.display = 'block';
      
      // Group trades for activity chart
      const groupedTrades = groupTradesByWallet(allTrades);
      renderActivityChart(groupedTrades);
      
      // Render time chart
      renderTimeChart(allTrades);
      
      // Calculate and display network sentiment
      const sentiment = calculateNetworkSentiment(allTrades);
      const sentimentEl = document.getElementById('networkSentiment');
      if (sentimentEl && sentiment) {
        const emoji = sentiment.net > 0 ? '📈' : sentiment.net < 0 ? '📉' : '➡️';
        sentimentEl.textContent = `${emoji} Network ${sentiment.net > 0 ? 'bullish' : sentiment.net < 0 ? 'bearish' : 'neutral'} (${sentiment.net > 0 ? '+' : ''}${sentiment.net}%)`;
        sentimentEl.style.display = 'inline-block';
      }
      
      // Add pulse animation
      pulseCharts();
    }

    // Render trade cards
    if (feedContainer) {
      feedContainer.innerHTML = allTrades.map(trade => {
        const timestamp = trade.timestamp || trade.createdAt || Date.now();
        const marketTitle = trade.market?.title || trade.marketTitle || trade.question || 'Unknown Market';
        const outcome = trade.outcome || trade.asset?.outcome || 'N/A';
        const side = trade.side || (trade.type === 'buy' ? 'Yes' : 'No');
        const price = trade.price || trade.asset?.price || '0';
        const size = trade.size || trade.amount || '0';
        const eventSlug = trade.eventSlug || trade.market?.slug || trade.event?.slug || '';
        const marketUrl = trade.marketUrl || (eventSlug ? `https://polymarket.com/event/${eventSlug}` : '');
        const walletShort = trade.walletAddress || trade.user
          ? `${(trade.walletAddress || trade.user).substring(0, 6)}...${(trade.walletAddress || trade.user).substring((trade.walletAddress || trade.user).length - 4)}`
          : 'Unknown';

        return `
          <div class="trade-card">
            <div class="trade-header">
              <span class="wallet-badge">${walletShort}</span>
              <span class="trade-time">${formatTimestamp(timestamp)}</span>
            </div>
            <div class="trade-content">
              <h3 class="market-title">${marketTitle}</h3>
              <div class="trade-details">
                <div class="detail-item">
                  <span class="detail-label">Outcome:</span>
                  <span class="detail-value">${outcome}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Side:</span>
                  <span class="detail-value ${side.toLowerCase()}">${side}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Price:</span>
                  <span class="detail-value">$${formatPrice(price)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Size:</span>
                  <span class="detail-value">${formatSize(size)}</span>
                </div>
              </div>
            </div>
            ${marketUrl ? `
              <a href="${marketUrl}" target="_blank" class="btn btn-copy-trade copy-trade-btn" data-market-url="${marketUrl}">
                Copy Trade
              </a>
            ` : ''}
          </div>
        `;
      }).join('');
    }

  } catch (error) {
    console.error('Error loading trade feed:', error);
    if (feedContainer) {
      feedContainer.innerHTML = '<p class="error-state">Error loading trades. Please try again.</p>';
    }
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}

// Loading indicator helpers
function showLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
}

function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

// Render feed - called by backend
function renderFeed(trades) {
  const feedContainer = document.getElementById('feed-container');
  
  // Hide loading indicator when rendering
  hideLoadingIndicator();
  
  if (!feedContainer) return;

  if (trades.length === 0) {
    feedContainer.innerHTML = '<p class="empty-state">No trades found for tracked wallets</p>';
    return;
  }

  feedContainer.innerHTML = trades.map(trade => {
    const walletShort = trade.user 
      ? `${trade.user.substring(0, 6)}...${trade.user.substring(trade.user.length - 4)}`
      : 'Unknown';

    return `
      <div class="trade-card">
        <div class="trade-header">
          <span class="wallet-badge">${walletShort}</span>
          <span class="trade-time">${formatTimestamp(trade.timestamp)}</span>
        </div>
        <div class="trade-content">
          <h3 class="market-title">${trade.marketTitle}</h3>
          <div class="trade-details">
            <div class="detail-item">
              <span class="detail-label">Outcome:</span>
              <span class="detail-value">${trade.outcome}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Side:</span>
              <span class="detail-value ${trade.side.toLowerCase()}">${trade.side}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Price:</span>
              <span class="detail-value">$${formatPrice(trade.price)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Size:</span>
              <span class="detail-value">${formatSize(trade.size)}</span>
            </div>
          </div>
        </div>
        ${trade.marketUrl ? `
          <a href="${trade.marketUrl}" target="_blank" class="btn btn-copy-trade copy-trade-btn" data-market-url="${trade.marketUrl}">
            Copy Trade
          </a>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Show error UI - called by backend
function showErrorUI(message) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 3000);
  }
}

// Theme Management (frontend-only feature)
function getStoredTheme() {
  return localStorage.getItem('polymates_theme') || 'light';
}

function setStoredTheme(theme) {
  localStorage.setItem('polymates_theme', theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const currentTheme = getStoredTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setStoredTheme(newTheme);
  applyTheme(newTheme);
  
  // Refresh charts to update colors
  const wallets = getStoredWallets();
  if (wallets.length > 0) {
    loadTradeFeed();
  }
}

// Settings Management
let settings = JSON.parse(localStorage.getItem('polymates_settings') || '{}');
let autoRefreshInterval = null;

function saveSettings() {
  localStorage.setItem('polymates_settings', JSON.stringify(settings));
}

function loadSettingsUI() {
  const toggleDarkMode = document.getElementById('toggleDarkMode');
  const refreshSelect = document.getElementById('refreshSelect');
  const toggleDemo = document.getElementById('toggleDemo');
  const togglePrivacy = document.getElementById('togglePrivacy');

  if (toggleDarkMode) {
    const currentTheme = getStoredTheme();
    toggleDarkMode.checked = currentTheme === 'dark';
  }
  if (refreshSelect) {
    refreshSelect.value = settings.refreshInterval || '15000';
  }
  if (toggleDemo) {
    toggleDemo.checked = settings.demoMode || false;
  }
  if (togglePrivacy) {
    togglePrivacy.checked = settings.hideWallet || false;
  }
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  const interval = Number(settings.refreshInterval || 15000);
  autoRefreshInterval = setInterval(() => {
    const wallets = getStoredWallets();
    if (wallets.length > 0) {
      loadTradeFeed();
    }
  }, interval);
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme
  const savedTheme = getStoredTheme();
  applyTheme(savedTheme);

  // Settings Modal Elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  const toggleDarkMode = document.getElementById('toggleDarkMode');
  const refreshSelect = document.getElementById('refreshSelect');
  const toggleDemo = document.getElementById('toggleDemo');
  const togglePrivacy = document.getElementById('togglePrivacy');
  const clearDataBtn = document.getElementById('clearDataBtn');

  // Load settings into UI
  loadSettingsUI();

  // Show/Hide Modal
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
      loadSettingsUI(); // Refresh UI when opening
    });
  }

  if (closeSettings && settingsModal) {
    closeSettings.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  }

  // Close modal when clicking outside
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });
  }

  // Dark Mode Toggle (integrated with existing theme system)
  if (toggleDarkMode) {
    toggleDarkMode.addEventListener('change', () => {
      const newTheme = toggleDarkMode.checked ? 'dark' : 'light';
      setStoredTheme(newTheme);
      applyTheme(newTheme);
      settings.darkMode = toggleDarkMode.checked;
      saveSettings();
      
      // Refresh charts to update colors
      const wallets = getStoredWallets();
      if (wallets.length > 0) {
        loadTradeFeed();
      }
    });
  }

  // Refresh Interval
  if (refreshSelect) {
    refreshSelect.addEventListener('change', () => {
      settings.refreshInterval = refreshSelect.value;
      saveSettings();
      startAutoRefresh();
    });
  }

  // Demo Mode
  if (toggleDemo) {
    toggleDemo.addEventListener('change', () => {
      settings.demoMode = toggleDemo.checked;
      saveSettings();
      // Could add demo mode logic here
      loadTradeFeed();
    });
  }

  // Hide My Wallet (Privacy)
  if (togglePrivacy) {
    togglePrivacy.addEventListener('change', () => {
      settings.hideWallet = togglePrivacy.checked;
      saveSettings();
      renderWalletsList();
      loadTradeFeed();
    });
  }

  // Clear All Data
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  // Theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      toggleTheme();
      // Sync with settings modal
      if (toggleDarkMode) {
        const currentTheme = getStoredTheme();
        toggleDarkMode.checked = currentTheme === 'dark';
      }
    });
  }

  // Show loading indicator when refresh button is clicked
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showLoadingIndicator();
      loadTradeFeed();
    });
  }

  // Add wallet button handler
  const addWalletBtn = document.getElementById('add-wallet-btn');
  const walletInput = document.getElementById('wallet-input');
  
  if (addWalletBtn && walletInput) {
    addWalletBtn.addEventListener('click', () => {
      const address = walletInput.value.trim();
      
      if (!address) {
        showError('Please enter a wallet address');
        return;
      }

      if (!isValidWalletAddress(address)) {
        showError('Invalid wallet address format. Must be a valid Ethereum address (0x...)');
        return;
      }

      if (addWallet(address)) {
        walletInput.value = '';
        renderWalletsList();
        loadTradeFeed();
      } else {
        showError('Wallet already tracked');
      }
    });

    // Enter key support for wallet input
    walletInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addWalletBtn.click();
      }
    });
  }

  // Start auto-refresh with saved interval
  startAutoRefresh();

  // Initial render
  renderWalletsList();
  
  // Show loading indicator on initial load if there are wallets
  const wallets = getStoredWallets();
  if (wallets.length > 0) {
    showLoadingIndicator();
    loadTradeFeed();
  }
});
