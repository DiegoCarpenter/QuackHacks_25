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

// Render wallet list - called by backend
function renderWalletList(wallets) {
  const walletListEl = document.getElementById('wallet-list');
  if (!walletListEl) return;
  
  if (wallets.length === 0) {
    walletListEl.innerHTML = '<p class="empty-state">No wallets tracked yet</p>';
    return;
  }

  walletListEl.innerHTML = wallets.map(wallet => `
    <div class="wallet-item">
      <span class="wallet-address">${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}</span>
      <button class="btn btn-remove remove-wallet-btn" data-wallet="${wallet}">Remove</button>
    </div>
  `).join('');
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

  // Show loading indicator when refresh button is clicked
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showLoadingIndicator();
    });
  }

  // Show loading indicator on initial load if there are wallets
  const wallets = typeof loadWallets === 'function' ? loadWallets() : [];
  if (wallets.length > 0) {
    showLoadingIndicator();
  }
});
