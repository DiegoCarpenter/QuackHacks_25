// Constants
const POLYMARKET_TRADES_ENDPOINT = "https://data-api.polymarket.com/trades";
const POLYMARKET_MARKETS_ENDPOINT = "https://data-api.polymarket.com/markets";
const ENS_RESOLVER_ENDPOINT = "https://api.ensideas.com/ens/resolve";
const STORAGE_KEY_WALLETS = "polymates_tracked_wallets";
const STORAGE_KEY_NICKNAMES = "polymates_wallet_nicknames";
const STORAGE_KEY_FAVORITES = "polymates_favorite_markets";
const STORAGE_KEY_ONBOARDING = "polymates_onboarding_completed";
const MAX_TRADES_PER_WALLET = 20;
const CACHE_TTL_MS = 30000;

// Cache for trades and market metadata
let tradeCache = {
  lastFetched: 0,
  trades: []
};
// Expose to frontend (safe assignment)
if (typeof window !== 'undefined') {
  window.tradeCache = tradeCache;
}

let marketMetadataCache = {};

// Wallet Storage System
// Wallets are stored as objects: {address: string, blockchain: 'ethereum'|'solana'}
// For backward compatibility, we also support simple string arrays
function loadWallets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WALLETS);
    if (!stored) return [];
    const wallets = JSON.parse(stored);
    
    if (!Array.isArray(wallets)) return [];
    
    // Migrate old format (string array) to new format (object array)
    if (wallets.length > 0 && typeof wallets[0] === 'string') {
      const migrated = wallets.map(addr => ({
        address: addr.toLowerCase(),
        blockchain: detectBlockchain(addr) || 'ethereum' // Default to ethereum for old entries
      }));
      saveWallets(migrated);
      return migrated;
    }
    
    return wallets;
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

// Helper to get wallet address string (for backward compatibility)
function getWalletAddress(wallet) {
  return typeof wallet === 'string' ? wallet : wallet.address;
}

// Helper to get wallet blockchain
function getWalletBlockchain(wallet) {
  if (typeof wallet === 'string') {
    return detectBlockchain(wallet) || 'ethereum';
  }
  return wallet.blockchain || 'ethereum';
}

function loadNicknames() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NICKNAMES);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    return {};
  }
}

function saveNicknames(nicknames) {
  try {
    localStorage.setItem(STORAGE_KEY_NICKNAMES, JSON.stringify(nicknames));
  } catch (error) {
    showError("Failed to save nicknames: " + error.message);
  }
}

function loadFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
  } catch (error) {
    showError("Failed to save favorites: " + error.message);
  }
}

function isValidEthereumAddress(address) {
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;
  return evmRegex.test(address);
}

function isValidSolanaAddress(address) {
  // Solana addresses are Base58 encoded, typically 32-44 characters
  // Base58 uses: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

function isValidAddress(address) {
  return isValidEthereumAddress(address) || isValidSolanaAddress(address);
}

function detectBlockchain(address) {
  if (isValidEthereumAddress(address)) {
    return 'ethereum';
  } else if (isValidSolanaAddress(address)) {
    return 'solana';
  }
  return null;
}

function isValidENS(name) {
  const ensRegex = /^[a-z0-9-]+\.eth$/i;
  return ensRegex.test(name);
}

async function resolveENS(ensName) {
  try {
    const response = await fetch(`${ENS_RESOLVER_ENDPOINT}/${ensName}`);
    if (!response.ok) {
      throw new Error(`ENS resolution failed: ${response.status}`);
    }
    const data = await response.json();
    if (data.address && isValidAddress(data.address)) {
      return data.address.toLowerCase();
    }
    throw new Error("Invalid address from ENS resolver");
  } catch (error) {
    throw new Error(`Failed to resolve ENS: ${error.message}`);
  }
}

async function addWallet(addressOrENS) {
  try {
    const trimmed = addressOrENS.trim();
    let address = trimmed;
    
    // Resolve ENS if needed
    if (isValidENS(trimmed)) {
      address = await resolveENS(trimmed);
      address = address.toLowerCase();
    } else if (!isValidAddress(trimmed)) {
      showError("Invalid wallet address or ENS name format. Supports Ethereum (0x...) and Solana addresses.");
      return false;
    }

    // Detect blockchain type
    const blockchain = detectBlockchain(address);
    if (!blockchain) {
      showError("Could not detect blockchain type for address");
      return false;
    }

    // Normalize address based on blockchain
    if (blockchain === 'ethereum') {
      address = address.toLowerCase();
    }
    // Solana addresses are case-sensitive, keep as-is

    const wallets = loadWallets();
    
    // Check for duplicates
    const isDuplicate = wallets.some(w => {
      const wAddr = getWalletAddress(w);
      return wAddr.toLowerCase() === address.toLowerCase() || wAddr === address;
    });
    
    if (isDuplicate) {
      showError("Wallet already tracked");
      return false;
    }

    wallets.push({ address, blockchain });
    saveWallets(wallets);
    return true;
  } catch (error) {
    showError(error.message);
    return false;
  }
}

function removeWallet(addressOrWallet) {
  try {
    // Handle both string addresses and wallet objects
    const targetAddress = typeof addressOrWallet === 'string' 
      ? addressOrWallet.trim() 
      : getWalletAddress(addressOrWallet);
    
    const wallets = loadWallets();
    const filtered = wallets.filter(w => {
      const wAddr = getWalletAddress(w);
      // Compare case-insensitive for Ethereum, case-sensitive for Solana
      return wAddr.toLowerCase() !== targetAddress.toLowerCase() && wAddr !== targetAddress;
    });
    
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

function setWalletNickname(addressOrWallet, nickname) {
  try {
    const address = typeof addressOrWallet === 'string' 
      ? addressOrWallet.trim() 
      : getWalletAddress(addressOrWallet);
    
    // Use lowercase for storage key (works for both chains)
    const normalized = address.toLowerCase();
    const nicknames = loadNicknames();
    if (nickname && nickname.trim()) {
      nicknames[normalized] = nickname.trim();
    } else {
      delete nicknames[normalized];
    }
    saveNicknames(nicknames);
    return true;
  } catch (error) {
    showError("Failed to save nickname: " + error.message);
    return false;
  }
}

function toggleFavoriteMarket(marketId) {
  try {
    const favorites = loadFavorites();
    const index = favorites.indexOf(marketId);
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(marketId);
    }
    saveFavorites(favorites);
    return true;
  } catch (error) {
    showError("Failed to toggle favorite: " + error.message);
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

async function fetchMarketMetadata(marketId) {
  if (!marketId) return null;
  
  // Check cache first
  if (marketMetadataCache[marketId]) {
    return marketMetadataCache[marketId];
  }

  try {
    const url = `${POLYMARKET_MARKETS_ENDPOINT}?ids=${encodeURIComponent(marketId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const market = data[0];
      const metadata = {
        title: market.question || market.title || market.market_title || "Unknown Market",
        question: market.question || market.title || "",
        description: market.description || ""
      };
      marketMetadataCache[marketId] = metadata;
      return metadata;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch market metadata for ${marketId}:`, error);
    return null;
  }
}

function normalizeTrade(raw, walletAddress) {
  try {
    const timestamp = raw.created_at ? new Date(raw.created_at).getTime() : Date.now();
    
    // Determine side
    let side = "unknown";
    if (raw.isBuy !== undefined) {
      side = raw.isBuy ? "buy" : "sell";
    } else if (raw.side) {
      side = raw.side.toLowerCase();
    } else if (raw.amount !== undefined) {
      side = raw.amount > 0 ? "buy" : "sell";
    }

    // Get market ID
    const marketId = raw.event_id || raw.market_id || raw.condition_id || "";

    // Get market title with fallbacks
    let marketTitle = raw.market_title || raw.event_title || raw.question || "Unknown Market";

    // Get outcome
    const outcome = raw.outcome || raw.token || raw.outcome_title || "Unknown";

    // Get price
    const price = parseFloat(raw.price) || parseFloat(raw.outcome_price) || 0;

    // Get size (absolute value)
    const size = Math.abs(parseFloat(raw.amount) || parseFloat(raw.size) || 0);

    // Generate ID
    const id = raw.id || raw.tx_hash || `${walletAddress}-${timestamp}-${Math.random()}`;

    // Market URL
    const marketUrl = marketId ? `https://polymarket.com/event/${marketId}` : "";

    return {
      id: id,
      user: walletAddress,
      marketId: marketId,
      marketTitle: marketTitle,
      outcome: outcome,
      side: side,
      price: price,
      size: size,
      timestamp: timestamp,
      marketUrl: marketUrl,
      needsMetadata: marketTitle === "Unknown Market" && marketId !== ""
    };
  } catch (error) {
    showError("Failed to normalize trade: " + error.message);
    return null;
  }
}

async function enrichTradeWithMetadata(trade) {
  if (!trade.needsMetadata || !trade.marketId) {
    return trade;
  }

  const metadata = await fetchMarketMetadata(trade.marketId);
  if (metadata) {
    trade.marketTitle = metadata.title || trade.marketTitle;
    trade.question = metadata.question || "";
  }

  return trade;
}

async function fetchAllTrades(wallets) {
  try {
    const promises = wallets.map(wallet => {
      const address = getWalletAddress(wallet);
      return fetchTradesForWallet(address);
    });
    const results = await Promise.allSettled(promises);
    
    const allTrades = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        const wallet = wallets[i];
        const walletAddress = getWalletAddress(wallet);
        const blockchain = getWalletBlockchain(wallet);
        
        for (const rawTrade of result.value) {
          const normalized = normalizeTrade(rawTrade, walletAddress);
          if (normalized) {
            // Add blockchain info to trade
            normalized.blockchain = blockchain;
            // Enrich with metadata if needed
            const enriched = await enrichTradeWithMetadata(normalized);
            allTrades.push(enriched);
          }
        }
      } else if (result.status === "rejected") {
        const wallet = wallets[i];
        const walletAddress = getWalletAddress(wallet);
        showError(`Failed to fetch trades for wallet ${walletAddress}: ${result.reason}`);
      }
    }
    
    return allTrades;
  } catch (error) {
    showError("Failed to fetch all trades: " + error.message);
    return [];
  }
}

function sortTradesByTime(trades) {
  return [...trades].sort((a, b) => {
    // Primary sort: timestamp descending
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    // Secondary sort: price descending for identical timestamps
    return b.price - a.price;
  });
}

// Feed Logic
let currentFilter = "all"; // "all", "buy", "sell"
window.currentFilter = "all"; // Expose to frontend

function setTradeFilter(filter) {
  currentFilter = filter;
  window.currentFilter = filter;
  refreshFeed();
  updateFilterButtons();
}

function updateFilterButtons() {
  const filterAllBtn = document.getElementById('filter-all-btn');
  const filterBuyBtn = document.getElementById('filter-buy-btn');
  const filterSellBtn = document.getElementById('filter-sell-btn');
  
  [filterAllBtn, filterBuyBtn, filterSellBtn].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });
  
  if (currentFilter === "all" && filterAllBtn) filterAllBtn.classList.add('active');
  if (currentFilter === "buy" && filterBuyBtn) filterBuyBtn.classList.add('active');
  if (currentFilter === "sell" && filterSellBtn) filterSellBtn.classList.add('active');
}

function filterTrades(trades) {
  if (currentFilter === "all") {
    return trades;
  }
  return trades.filter(trade => trade.side === currentFilter);
}

async function refreshFeed() {
  try {
    const now = Date.now();
    
    // Check cache
    if (tradeCache.lastFetched > 0 && (now - tradeCache.lastFetched) < CACHE_TTL_MS) {
      const filtered = filterTrades(tradeCache.trades);
      if (typeof renderFeed === "function") {
        renderFeed(filtered);
      }
      return filtered;
    }

    const wallets = loadWallets();
    
    if (wallets.length === 0) {
      tradeCache.trades = [];
      tradeCache.lastFetched = now;
      window.tradeCache = tradeCache; // Update exposed cache
      if (typeof renderFeed === "function") {
        renderFeed([]);
      }
      return [];
    }

    // Show loading indicator
    if (typeof showLoadingIndicator === "function") {
      showLoadingIndicator();
    }

    const allTrades = await fetchAllTrades(wallets);
    const sortedTrades = sortTradesByTime(allTrades);
    
    tradeCache.trades = sortedTrades;
    tradeCache.lastFetched = now;
    window.tradeCache = tradeCache; // Update exposed cache
    
    // Hide loading indicator
    if (typeof hideLoadingIndicator === "function") {
      hideLoadingIndicator();
    }
    
    // Filter and render
    const filtered = filterTrades(sortedTrades);
    if (typeof renderFeed === "function") {
      renderFeed(filtered);
    }
    
    return filtered;
  } catch (error) {
    showError("Failed to refresh feed: " + error.message);
    if (typeof hideLoadingIndicator === "function") {
      hideLoadingIndicator();
    }
    return [];
  }
}

// Error Handling
function showError(message) {
  console.error("[Polymates]", message);
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

    // Try multiple API endpoint patterns
    const searchQuery = encodeURIComponent(query.trim());
    const endpoints = [
      `${POLYMARKET_MARKETS_ENDPOINT}?query=${searchQuery}&limit=20`,
      `${POLYMARKET_MARKETS_ENDPOINT}?search=${searchQuery}&limit=20`,
      `${POLYMARKET_MARKETS_ENDPOINT}?q=${searchQuery}&limit=20`,
      `${POLYMARKET_MARKETS_ENDPOINT}?text=${searchQuery}&limit=20`
    ];

    // Try each endpoint until one works
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          if (Array.isArray(data)) {
            return data;
          } else if (data && Array.isArray(data.data)) {
            return data.data;
          } else if (data && Array.isArray(data.results)) {
            return data.results;
          } else if (data && Array.isArray(data.markets)) {
            return data.markets;
          }
          // If we got a successful response but unexpected format, try next endpoint
          continue;
        } else if (response.status !== 404) {
          // If it's not a 404, log the error but try next endpoint
          console.warn(`Market search endpoint returned ${response.status}: ${url}`);
        }
      } catch (fetchError) {
        // Continue to next endpoint on error
        continue;
      }
    }
    
    // If all endpoints failed, try a simpler approach - get all markets and filter client-side
    // This is a fallback for when search endpoints don't work
    try {
      const url = `${POLYMARKET_MARKETS_ENDPOINT}?limit=100&active=true`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const markets = Array.isArray(data) ? data : (data?.data || data?.results || data?.markets || []);
        
        // Client-side filtering
        const queryLower = query.trim().toLowerCase();
        const filtered = markets.filter(market => {
          const title = (market.question || market.title || market.name || "").toLowerCase();
          const category = (market.category || market.group || "").toLowerCase();
          return title.includes(queryLower) || category.includes(queryLower);
        });
        
        return filtered.slice(0, 20); // Limit to 20 results
      }
    } catch (fallbackError) {
      console.error("Fallback market search failed:", fallbackError);
    }
    
    throw new Error("All market search endpoints failed");
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

// UI Hooks and Event Listeners
if (!window.POLYMATES_BOUND) {
  window.POLYMATES_BOUND = true;
  
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
          const item = e.target.closest(".market-result-item");
          if (item) {
            const marketUrl = item.getAttribute("data-market-url");
            if (marketUrl) {
              openMarket(marketUrl);
            }
          }
        });
      }
      
      // Add wallet button
      const addWalletBtn = document.getElementById("add-wallet-btn");
      if (addWalletBtn) {
        addWalletBtn.addEventListener("click", () => {
          const input = document.getElementById("wallet-input");
          if (input && input.value) {
            addWallet(input.value).then(success => {
              if (success) {
                input.value = "";
                const updatedWallets = loadWallets();
                if (typeof renderWalletList === "function") {
                  renderWalletList(updatedWallets);
                }
                tradeCache.lastFetched = 0;
                refreshFeed();
              }
            });
          }
        });
      }

      // Wallet list container (event delegation)
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
          } else if (e.target && e.target.classList.contains("edit-nickname-btn")) {
            const walletAddress = e.target.getAttribute("data-wallet");
            if (walletAddress) {
              const nicknames = loadNicknames();
              // Use lowercase for lookup
              const lookupKey = walletAddress.toLowerCase();
              const currentNickname = nicknames[lookupKey] || "";
              const newNickname = prompt("Enter nickname for this wallet:", currentNickname);
              if (newNickname !== null) {
                setWalletNickname(walletAddress, newNickname);
                const updatedWallets = loadWallets();
                if (typeof renderWalletList === "function") {
                  renderWalletList(updatedWallets);
                }
              }
            }
          }
        });
      }

      // Refresh button
      const refreshBtn = document.getElementById("refresh-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          tradeCache.lastFetched = 0;
          refreshFeed();
        });
      }

      // Filter buttons
      const filterAllBtn = document.getElementById("filter-all-btn");
      if (filterAllBtn) {
        filterAllBtn.addEventListener("click", () => setTradeFilter("all"));
      }
      
      const filterBuyBtn = document.getElementById("filter-buy-btn");
      if (filterBuyBtn) {
        filterBuyBtn.addEventListener("click", () => setTradeFilter("buy"));
      }
      
      const filterSellBtn = document.getElementById("filter-sell-btn");
      if (filterSellBtn) {
        filterSellBtn.addEventListener("click", () => setTradeFilter("sell"));
      }

      // Feed container (event delegation)
      const feedContainer = document.getElementById("feed-container");
      if (feedContainer) {
        feedContainer.addEventListener("click", (e) => {
          if (e.target && e.target.classList.contains("copy-trade-btn")) {
            const marketUrl = e.target.getAttribute("data-market-url");
            if (marketUrl) {
              openMarket(marketUrl);
            }
          } else if (e.target && e.target.classList.contains("favorite-btn")) {
            const marketId = e.target.getAttribute("data-market-id");
            if (marketId) {
              toggleFavoriteMarket(marketId);
              // Refresh feed to update favorite button states
              const filtered = filterTrades(tradeCache.trades);
              if (typeof renderFeed === "function") {
                renderFeed(filtered);
              }
            }
          }
        });
      }

      // Wallet input Enter key
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

      // Saved markets button
      const savedMarketsBtn = document.getElementById("saved-markets-btn");
      if (savedMarketsBtn) {
        savedMarketsBtn.addEventListener("click", () => {
          if (typeof showSavedMarkets === "function") {
            showSavedMarkets();
          } else {
            // Fallback: show favorites in feed
            const favorites = loadFavorites();
            const allTrades = tradeCache.trades || [];
            const favoriteTrades = allTrades.filter(trade => favorites.includes(trade.marketId));
            if (typeof renderFeed === "function") {
              renderFeed(favoriteTrades);
            }
          }
        });
      }
      
      // Initial filter button state
      updateFilterButtons();

      // Start onboarding if first run
      setTimeout(() => {
        startOnboarding();
      }, 500);
    } catch (error) {
      showError("Failed to initialize UI: " + error.message);
      console.error("[Polymates] Initialization error:", error);
    }
  });
}
