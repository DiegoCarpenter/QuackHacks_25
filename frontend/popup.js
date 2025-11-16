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

// Market Search Rendering Functions
function showMarketSearchLoading() {
  const resultsContainer = document.getElementById('market-search-results');
  if (resultsContainer) {
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<div class="loading-indicator">Searching markets...</div>';
  }
}

function formatLiquidity(liquidity) {
  const num = parseFloat(liquidity);
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}k`;
  }
  return `$${num.toFixed(2)}`;
}

function renderMarketSearchResults(markets) {
  const resultsContainer = document.getElementById('market-search-results');
  if (!resultsContainer) return;

  if (markets.length === 0) {
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<p class="empty-state">No markets found</p>';
    return;
  }

  resultsContainer.style.display = 'block';
  resultsContainer.innerHTML = markets.map(market => {
    const displayTitle = market.title.length > 60 ? market.title.substring(0, 60) + "..." : market.title;
    return `
      <div class="market-result-item" data-market-url="${market.marketUrl}">
        <div class="market-result-content">
          <h3 class="market-result-title" title="${market.title}">${displayTitle}</h3>
          <div class="market-result-meta">
            <span class="market-result-category">${market.category}</span>
            <span class="market-result-liquidity">${formatLiquidity(market.liquidity)} liquidity</span>
          </div>
        </div>
        <div class="market-result-arrow">→</div>
      </div>
    `;
  }).join('');
}

// Onboarding System
const onboardingSteps = [
  {
    title: "Welcome to Polymates! 🎉",
    description: "Track wallet activity and discover markets on Polymarket. Let's get started!",
    target: null,
    position: "center"
  },
  {
    title: "Add Wallet",
    description: "Enter a wallet address to track trades from that wallet. You can add multiple wallets!",
    target: "#wallet-input",
    position: "bottom"
  },
  {
    title: "Nicknames",
    description: "After adding a wallet, click the ✏️ button next to it to give it a friendly nickname for easier identification.",
    target: ".edit-nickname-btn",
    position: "left",
    optional: true
  },
  {
    title: "Favorites",
    description: "Once you have trades, click the ⭐ star on any trade to save markets you're interested in. View them later with the 'Saved' button.",
    target: ".favorite-btn",
    position: "right",
    optional: true
  },
  {
    title: "Filters",
    description: "Use the filter buttons (All/Buys/Sells) to focus on specific types of trades in your feed.",
    target: "#filter-all-btn",
    position: "bottom"
  },
  {
    title: "Copy Trade",
    description: "Click 'Copy Trade' on any trade card to open that market on Polymarket and follow the trade!",
    target: ".copy-trade-btn",
    position: "top",
    optional: true
  }
];

let currentOnboardingStep = 0;

function showOnboardingTooltip(stepIndex) {
  if (stepIndex >= onboardingSteps.length) {
    completeOnboarding();
    return;
  }

  const step = onboardingSteps[stepIndex];
  const tooltip = document.getElementById('onboarding-tooltip');
  const overlay = document.getElementById('onboarding-overlay');
  const titleEl = document.querySelector('.tooltip-title');
  const descriptionEl = document.querySelector('.tooltip-description');

  if (!tooltip || !overlay || !titleEl || !descriptionEl) {
    // Retry after a short delay if elements aren't ready
    if (stepIndex === 0) {
      setTimeout(() => showOnboardingTooltip(stepIndex), 200);
    }
    return;
  }

  // Update content
  titleEl.textContent = step.title;
  descriptionEl.textContent = step.description;

  // Show overlay
  overlay.style.display = 'block';

  // Position tooltip
  if (step.target && step.position !== "center") {
    const targetEl = document.querySelector(step.target);
    // Skip optional steps if target element doesn't exist
    if (!targetEl && step.optional) {
      nextOnboardingStep();
      return;
    }
    if (targetEl) {
      // Wait for tooltip to be visible to get its dimensions
      tooltip.style.display = 'block';
      tooltip.style.visibility = 'hidden';
      
      setTimeout(() => {
        const rect = targetEl.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = 0;
        let left = 0;

        switch (step.position) {
          case "top":
            top = rect.top - tooltipRect.height - 20;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            break;
          case "bottom":
            top = rect.bottom + 20;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            break;
          case "left":
            top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
            left = rect.left - tooltipRect.width - 20;
            break;
          case "right":
            top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
            left = rect.right + 20;
            break;
        }

        // Keep tooltip within viewport
        const containerRect = document.body.getBoundingClientRect();
        if (left < 10) left = 10;
        if (left + tooltipRect.width > containerRect.width - 10) {
          left = containerRect.width - tooltipRect.width - 10;
        }
        if (top < 10) top = 10;
        if (top + tooltipRect.height > containerRect.height - 10) {
          top = containerRect.height - tooltipRect.height - 10;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.position = 'fixed';
        tooltip.style.visibility = 'visible';
      }, 10);
    } else {
      // Fallback to center if target not found
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      tooltip.style.position = 'fixed';
      tooltip.style.display = 'block';
      tooltip.style.visibility = 'visible';
    }
  } else {
    // Center position
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    tooltip.style.position = 'fixed';
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'visible';
  }

  // Highlight target element
  if (step.target) {
    const targetEl = document.querySelector(step.target);
    if (targetEl) {
      targetEl.classList.add('onboarding-highlight');
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  currentOnboardingStep = stepIndex;
}

function hideOnboardingTooltip() {
  const tooltip = document.getElementById('onboarding-tooltip');
  const overlay = document.getElementById('onboarding-overlay');
  
  if (tooltip) tooltip.style.display = 'none';
  if (overlay) overlay.style.display = 'none';

  // Remove highlights
  document.querySelectorAll('.onboarding-highlight').forEach(el => {
    el.classList.remove('onboarding-highlight');
  });
}

function nextOnboardingStep() {
  hideOnboardingTooltip();
  setTimeout(() => {
    showOnboardingTooltip(currentOnboardingStep + 1);
  }, 300);
}

function completeOnboarding() {
  hideOnboardingTooltip();
  if (typeof markOnboardingComplete === "function") {
    markOnboardingComplete();
  }
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

  // Onboarding tooltip buttons
  const tooltipNext = document.getElementById('tooltip-next');
  const tooltipSkip = document.getElementById('tooltip-skip');

  if (tooltipNext) {
    tooltipNext.addEventListener('click', nextOnboardingStep);
  }

  if (tooltipSkip) {
    tooltipSkip.addEventListener('click', completeOnboarding);
  }

  // Close onboarding on overlay click
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    overlay.addEventListener('click', completeOnboarding);
  }

  // Filter buttons are updated by backend's updateFilterButtons function
});
