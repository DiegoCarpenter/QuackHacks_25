// Constants
const POLYMARKET_TRADES_ENDPOINT = "https://data-api.polymarket.com/trades";
const POLYMARKET_MARKETS_ENDPOINT = "https://data-api.polymarket.com/markets";
const POLYMARKET_API_KEY = "YOUR_API_KEY_HERE"; // Replace with your Polymarket API key
const STORAGE_KEY_WALLETS = "polymates_tracked_wallets";
const STORAGE_KEY_ONBOARDING = "polymates_onboarding_completed";
const MAX_TRADES_PER_WALLET = 20;
const CACHE_TTL_MS = 30000;

// Cache for trades
let tradeCache = {
  lastFetched: 0,
  trades: []
};

// Wallet Storage System
function loadWallets() {
  try { 
    const stored = localStorage.getItem(STORAGE_KEY_WALLETS);
    if (!stored) return [];
    const wallets = JSON.parse(stored);
    return Array.isArray(wallets) ? wallets : [];
  } catch (error) {
    showError("Failed to load wallets: " + error.message);
    return [];
  }
}

function saveWallets(wallets) {
  try {
    localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(wallets));
  } catch (error) {
    showError("Failed to save wallets: " + error.message);
  }
}

function isValidAddress(address) {
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;
  return evmRegex.test(address);
}

function addWallet(address) {
  try {
    const trimmed = address.trim().toLowerCase();
    
    if (!isValidAddress(trimmed)) {
      showError("Invalid wallet address format");
      return false;
    }

    const wallets = loadWallets();
    
    if (wallets.includes(trimmed)) {
      showError("Wallet already tracked");
      return false;
    }

    wallets.push(trimmed);
    saveWallets(wallets);
    return true;
  } catch (error) {
    showError("Failed to add wallet: " + error.message);
    return false;
  }
}

function removeWallet(address) {
  try {
    const normalized = address.trim().toLowerCase();
    const wallets = loadWallets();
    const filtered = wallets.filter(w => w !== normalized);
    
    if (filtered.length === wallets.length) {
      return false;
    }

    saveWallets(filtered);
    return true;
  } catch (error) {
    showError("Failed to remove wallet: " + error.message);
    return false;
  }
}

// API Integration
async function fetchTradesForWallet(address) {
  try {
    const url = `${POLYMARKET_TRADES_ENDPOINT}?user=${encodeURIComponent(address)}&limit=${MAX_TRADES_PER_WALLET}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${POLYMARKET_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    showError(`Failed to fetch trades for ${address}: ${error.message}`);
    return [];
  }
}

function normalizeTrade(raw, walletAddress) {
  try {
    const timestamp = raw.created_at ? new Date(raw.created_at).getTime() : Date.now();
    
    let side = raw.side;
    if (!side && raw.amount !== undefined) {
      side = raw.amount > 0 ? "buy" : "sell";
    }
    if (!side) {
      side = "unknown";
    }

    const marketId = raw.event_id || raw.market_id || raw.condition_id || "";
    const marketUrl = marketId ? `https://polymarket.com/event/${marketId}` : "";

    return {
      id: raw.id || raw.tx_hash || `${walletAddress}-${timestamp}-${Math.random()}`,
      user: walletAddress,
      marketId: marketId,
      marketTitle: raw.market_title || raw.event_title || raw.question || "Unknown Market",
      outcome: raw.outcome || raw.outcome_title || "Unknown",
      side: side,
      price: parseFloat(raw.price) || parseFloat(raw.outcome_price) || 0,
      size: Math.abs(parseFloat(raw.amount) || parseFloat(raw.size) || 0),
      timestamp: timestamp,
      marketUrl: marketUrl
    };
  } catch (error) {
    showError("Failed to normalize trade: " + error.message);
    return null;
  }
}

async function fetchAllTrades(wallets) {
  try {
    const promises = wallets.map(wallet => fetchTradesForWallet(wallet));
    const results = await Promise.allSettled(promises);
    
    const allTrades = [];
    
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        const walletAddress = wallets[index];
        result.value.forEach(rawTrade => {
          const normalized = normalizeTrade(rawTrade, walletAddress);
          if (normalized) {
            allTrades.push(normalized);
          }
        });
      } else if (result.status === "rejected") {
        showError(`Failed to fetch trades for wallet ${wallets[index]}: ${result.reason}`);
      }
    });
    
    return allTrades;
  } catch (error) {
    showError("Failed to fetch all trades: " + error.message);
    return [];
  }
}

function sortTradesByTime(trades) {
  return [...trades].sort((a, b) => b.timestamp - a.timestamp);
}

// Feed Logic
async function refreshFeed() {
  try {
    const now = Date.now();
    
    if (tradeCache.lastFetched > 0 && (now - tradeCache.lastFetched) < CACHE_TTL_MS) {
      if (typeof renderFeed === "function") {
        renderFeed(tradeCache.trades);
      }
      return tradeCache.trades;
    }

    const wallets = loadWallets();
    
    if (wallets.length === 0) {
      tradeCache.trades = [];
      tradeCache.lastFetched = now;
      if (typeof renderFeed === "function") {
        renderFeed([]);
      }
      return [];
    }

    const allTrades = await fetchAllTrades(wallets);
    const sortedTrades = sortTradesByTime(allTrades);
    
    tradeCache.trades = sortedTrades;
    tradeCache.lastFetched = now;
    
    if (typeof renderFeed === "function") {
      renderFeed(sortedTrades);
    }
    
    return sortedTrades;
  } catch (error) {
    showError("Failed to refresh feed: " + error.message);
    return [];
  }
}

// Error Handling
function showError(message) {
  console.error("[Polymates Lite]", message);
  if (typeof showErrorUI === "function") {
    showErrorUI(message);
  }
}

// Market Search API Integration
async function searchMarkets(query) {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const url = `${POLYMARKET_MARKETS_ENDPOINT}?q=${encodeURIComponent(query.trim())}&limit=20`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${POLYMARKET_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    showError(`Failed to search markets: ${error.message}`);
    return [];
  }
}

function normalizeMarket(raw) {
  try {
    const marketId = raw.slug || raw.id || raw.condition_id || "";
    const marketUrl = marketId ? `https://polymarket.com/event/${marketId}` : "";

    return {
      id: marketId,
      title: raw.question || raw.title || raw.name || "Unknown Market",
      liquidity: parseFloat(raw.liquidity) || parseFloat(raw.volume) || 0,
      category: raw.category || raw.group || "Uncategorized",
      marketUrl: marketUrl,
      slug: raw.slug || ""
    };
  } catch (error) {
    showError("Failed to normalize market: " + error.message);
    return null;
  }
}

// Copy-Trade Button Handler
function openMarket(url) {
  try {
    if (url) {
      window.open(url, "_blank");
    }
  } catch (error) {
    showError("Failed to open market: " + error.message);
  }
}

// Onboarding System
function hasCompletedOnboarding() {
  try {
    const completed = localStorage.getItem(STORAGE_KEY_ONBOARDING);
    return completed === "true";
  } catch (error) {
    return false;
  }
}

function markOnboardingComplete() {
  try {
    localStorage.setItem(STORAGE_KEY_ONBOARDING, "true");
  } catch (error) {
    console.error("Failed to save onboarding status:", error);
  }
}

function startOnboarding() {
  if (hasCompletedOnboarding()) {
    return;
  }

  if (typeof showOnboardingTooltip === "function") {
    showOnboardingTooltip(0);
  }
}

// Expose tradeCache to window for frontend access
if (typeof window !== "undefined") {
  window.tradeCache = tradeCache;
}

// UI Hooks and Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  try {
    const wallets = loadWallets();
    
    if (typeof renderWalletList === "function") {
      renderWalletList(wallets);
    }
    
    refreshFeed();
    
    // Market Search Handlers
    const marketSearchBtn = document.getElementById("market-search-btn");
    const marketSearchInput = document.getElementById("market-search-input");
    
    if (marketSearchBtn && marketSearchInput) {
      const performSearch = async () => {
        const query = marketSearchInput.value.trim();
        if (query.length === 0) {
          const resultsContainer = document.getElementById("market-search-results");
          if (resultsContainer) {
            resultsContainer.style.display = "none";
          }
          return;
        }

        if (typeof showMarketSearchLoading === "function") {
          showMarketSearchLoading();
        }

        const markets = await searchMarkets(query);
        const normalized = markets.map(m => normalizeMarket(m)).filter(m => m !== null);
        
        if (typeof renderMarketSearchResults === "function") {
          renderMarketSearchResults(normalized);
        }
      };

      marketSearchBtn.addEventListener("click", performSearch);
      
      marketSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          performSearch();
        }
      });
    }

    // Market search results click handler
    const marketSearchResults = document.getElementById("market-search-results");
    if (marketSearchResults) {
      marketSearchResults.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("market-result-item")) {
          const marketUrl = e.target.getAttribute("data-market-url");
          if (marketUrl) {
            openMarket(marketUrl);
          }
        }
      });
    }
    
    const addWalletBtn = document.getElementById("add-wallet-btn");
    if (addWalletBtn) {
      addWalletBtn.addEventListener("click", () => {
        const input = document.getElementById("wallet-input");
        if (input && input.value) {
          const success = addWallet(input.value);
          if (success) {
            input.value = "";
            const updatedWallets = loadWallets();
            if (typeof renderWalletList === "function") {
              renderWalletList(updatedWallets);
            }
            tradeCache.lastFetched = 0;
            refreshFeed();
          }
        }
      });
    }

    const walletList = document.getElementById("wallet-list");
    if (walletList) {
      walletList.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("remove-wallet-btn")) {
          const walletAddress = e.target.getAttribute("data-wallet");
          if (walletAddress) {
            const success = removeWallet(walletAddress);
            if (success) {
              const updatedWallets = loadWallets();
              if (typeof renderWalletList === "function") {
                renderWalletList(updatedWallets);
              }
              tradeCache.lastFetched = 0;
              refreshFeed();
            }
          }
        }
      });
    }

    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        tradeCache.lastFetched = 0;
        refreshFeed();
      });
    }

    const feedContainer = document.getElementById("feed-container");
    if (feedContainer) {
      feedContainer.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("copy-trade-btn")) {
          const marketUrl = e.target.getAttribute("data-market-url");
          if (marketUrl) {
            openMarket(marketUrl);
          }
        }
      });
    }

    const walletInput = document.getElementById("wallet-input");
    if (walletInput) {
      walletInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const addWalletBtn = document.getElementById("add-wallet-btn");
          if (addWalletBtn) {
            addWalletBtn.click();
          }
        }
      });
    }

    // Start onboarding if first run
    setTimeout(() => {
      startOnboarding();
    }, 500);
  } catch (error) {
    showError("Failed to initialize UI: " + error.message);
  }
});

