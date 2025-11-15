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
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 3000);
}

// Render wallets list
function renderWalletsList() {
  const wallets = getStoredWallets();
  const walletsListEl = document.getElementById('walletsList');
  
  if (wallets.length === 0) {
    walletsListEl.innerHTML = '<p class="empty-state">No wallets tracked yet</p>';
    return;
  }

  walletsListEl.innerHTML = wallets.map(wallet => `
    <div class="wallet-item">
      <span class="wallet-address">${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}</span>
      <button class="btn btn-remove" data-wallet="${wallet}">Remove</button>
    </div>
  `).join('');

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

// Render trade feed
async function loadTradeFeed() {
  const wallets = getStoredWallets();
  const feedContainer = document.getElementById('feedContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');

  if (wallets.length === 0) {
    feedContainer.innerHTML = '<p class="empty-state">Add a wallet to start tracking trades</p>';
    return;
  }

  loadingIndicator.style.display = 'block';
  feedContainer.innerHTML = '';

  try {
    // Fetch trades for all wallets
    const allTrades = [];
    for (const wallet of wallets) {
      const trades = await fetchTradesForWallet(wallet);
      // Add wallet address to each trade for display
      trades.forEach(trade => {
        trade.walletAddress = wallet;
        allTrades.push(trade);
      });
    }

    // Sort by timestamp (newest first)
    allTrades.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    if (allTrades.length === 0) {
      feedContainer.innerHTML = '<p class="empty-state">No trades found for tracked wallets</p>';
      loadingIndicator.style.display = 'none';
      return;
    }

    // Render trade cards
    feedContainer.innerHTML = allTrades.map(trade => {
      const timestamp = trade.timestamp || trade.createdAt || Date.now();
      const marketTitle = trade.market?.title || trade.question || 'Unknown Market';
      const outcome = trade.outcome || trade.asset?.outcome || 'N/A';
      const side = trade.side || (trade.type === 'buy' ? 'Yes' : 'No');
      const price = trade.price || trade.asset?.price || '0';
      const size = trade.size || trade.amount || '0';
      const eventSlug = trade.eventSlug || trade.market?.slug || trade.event?.slug || '';
      const walletShort = trade.walletAddress 
        ? `${trade.walletAddress.substring(0, 6)}...${trade.walletAddress.substring(trade.walletAddress.length - 4)}`
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
          ${eventSlug ? `
            <a href="https://polymarket.com/event/${eventSlug}" target="_blank" class="btn btn-copy-trade">
              Copy Trade
            </a>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading trade feed:', error);
    feedContainer.innerHTML = '<p class="error-state">Error loading trades. Please try again.</p>';
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

// Initialize extension
document.addEventListener('DOMContentLoaded', () => {
  // Add wallet button
  document.getElementById('addWalletBtn').addEventListener('click', () => {
    const input = document.getElementById('walletInput');
    const address = input.value.trim();

    if (!address) {
      showError('Please enter a wallet address');
      return;
    }

    if (!isValidWalletAddress(address)) {
      showError('Invalid wallet address format. Must be a valid Ethereum address (0x...)');
      return;
    }

    if (addWallet(address)) {
      input.value = '';
      renderWalletsList();
      loadTradeFeed();
    } else {
      showError('Wallet already tracked');
    }
  });

  // Enter key support for wallet input
  document.getElementById('walletInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('addWalletBtn').click();
    }
  });

  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadTradeFeed();
  });

  // Initial render
  renderWalletsList();
  loadTradeFeed();
});

