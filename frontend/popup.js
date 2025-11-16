// Frontend rendering functions that backend expects
// Backend handles all logic, API calls, and event handlers

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

// Helper functions to access backend storage
function loadNicknames() {
  try {
    const stored = localStorage.getItem('polymates_wallet_nicknames');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

function loadFavorites() {
  try {
    const stored = localStorage.getItem('polymates_favorite_markets');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

// Get wallet nickname or shortened address
function getWalletDisplay(address) {
  const nicknames = loadNicknames();
  if (nicknames[address]) {
    return { display: nicknames[address], isNickname: true };
  }
  return {
    display: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
    isNickname: false
  };
}

// Render wallet list - called by backend
function renderWalletList(wallets) {
  const walletListEl = document.getElementById('wallet-list');
  if (!walletListEl) return;
  
  if (wallets.length === 0) {
    walletListEl.innerHTML = '<p class="empty-state">No wallets tracked yet</p>';
    return;
  }

  const nicknames = loadNicknames();

  walletListEl.innerHTML = wallets.map(wallet => {
    const nickname = nicknames[wallet];
    const display = nickname || `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
    
    return `
      <div class="wallet-item">
        <div class="wallet-info">
          <span class="wallet-address">${display}</span>
          ${nickname ? '<span class="nickname-badge">Nickname</span>' : ''}
        </div>
        <div class="wallet-actions">
          <button class="btn btn-small edit-nickname-btn" data-wallet="${wallet}" title="Edit nickname">✏️</button>
          <button class="btn btn-small btn-remove remove-wallet-btn" data-wallet="${wallet}">Remove</button>
        </div>
      </div>
    `;
  }).join('');
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
  
  if (!feedContainer) return;

  if (trades.length === 0) {
    feedContainer.innerHTML = '<p class="empty-state">No trades found for tracked wallets</p>';
    return;
  }

  const favorites = typeof loadFavorites === "function" ? loadFavorites() : [];

  feedContainer.innerHTML = trades.map(trade => {
    const walletDisplay = getWalletDisplay(trade.user);
    const isFavorite = favorites.includes(trade.marketId);
    const marketTitle = trade.marketTitle || "Unknown Market";
    const displayTitle = marketTitle.length > 60 ? marketTitle.substring(0, 60) + "..." : marketTitle;

    return `
      <div class="trade-card">
        <div class="trade-header">
          <div class="trade-header-left">
            <span class="wallet-badge ${walletDisplay.isNickname ? 'nickname' : ''}">${walletDisplay.display}</span>
            <span class="trade-time">${formatTimestamp(trade.timestamp)}</span>
          </div>
          <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-market-id="${trade.marketId}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            ${isFavorite ? '⭐' : '☆'}
          </button>
        </div>
        <div class="trade-content">
          <h3 class="market-title" title="${marketTitle}">${displayTitle}</h3>
          ${trade.question && trade.question !== marketTitle ? `<p class="market-question">${trade.question}</p>` : ''}
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

// Show saved markets
function showSavedMarkets() {
  const favorites = loadFavorites();
  const feedContainer = document.getElementById('feed-container');
  
  if (!feedContainer) return;

  if (favorites.length === 0) {
    feedContainer.innerHTML = '<p class="empty-state">No saved markets yet. Click the star icon on any trade to save it.</p>';
    return;
  }

  // Access tradeCache from backend (exposed via window.tradeCache)
  const allTrades = (typeof window !== "undefined" && window.tradeCache && window.tradeCache.trades) ? window.tradeCache.trades : [];
  const favoriteTrades = allTrades.filter(trade => favorites.includes(trade.marketId));
  
  if (favoriteTrades.length === 0) {
    feedContainer.innerHTML = '<p class="empty-state">No trades found for saved markets. Add wallets with activity in these markets.</p>';
    return;
  }

  renderFeed(favoriteTrades);
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
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme
  const savedTheme = getStoredTheme();
  applyTheme(savedTheme);

  // Theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Filter buttons are updated by backend's updateFilterButtons function
});
