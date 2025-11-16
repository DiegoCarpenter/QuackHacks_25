# Polymates Lite - Frontend vs Backend Breakdown

## 📁 Project Structure

This is a **Chrome Extension (Manifest V3)** - all code runs client-side in the browser.

---

## 🔵 BACKEND (Business Logic & Data Layer)

**Location:** `popup.js` (lines 1-229)

### Data Management
- ✅ `loadWallets()` - Load wallets from localStorage
- ✅ `saveWallets(wallets)` - Save wallets to localStorage
- ✅ `isValidAddress(address)` - Validate EVM wallet addresses
- ✅ `addWallet(address)` - Add wallet with validation
- ✅ `removeWallet(address)` - Remove wallet from storage

### API Integration
- ✅ `fetchTradesForWallet(address)` - Fetch trades from Polymarket API
- ✅ `fetchAllTrades(wallets)` - Parallel fetch for all wallets
- ✅ `normalizeTrade(raw, walletAddress)` - Transform API response to standard format
- ✅ `sortTradesByTime(trades)` - Sort trades by timestamp

### Business Logic
- ✅ `refreshFeed()` - Orchestrate feed refresh with caching
- ✅ `tradeCache` - Cache management (30s TTL)
- ✅ `openMarket(url)` - Open market in new tab

### Constants & Configuration
- ✅ `POLYMARKET_TRADES_ENDPOINT`
- ✅ `POLYMARKET_API_KEY`
- ✅ `STORAGE_KEY_WALLETS`
- ✅ `MAX_TRADES_PER_WALLET`
- ✅ `CACHE_TTL_MS`

### Error Handling
- ✅ `showError(message)` - Error logging (calls UI function)

---

## 🟢 FRONTEND (UI & Presentation Layer)

### Files Needed (Not Yet Created)
- ❌ `popup.html` - HTML structure
- ❌ `styles.css` - Styling
- ❌ UI rendering functions (to be added to popup.js or separate file)

### UI Functions (To Be Implemented)
- ❌ `renderWalletList(wallets)` - Display wallet list
- ❌ `renderFeed(trades)` - Display trade feed
- ❌ `showErrorUI(message)` - Display error messages in UI

### Event Handlers (Currently in popup.js, lines 232-315)
- ✅ `DOMContentLoaded` listener - Initialize UI
- ✅ Add wallet button click handler
- ✅ Remove wallet button click handler
- ✅ Refresh button click handler
- ✅ Copy-trade button click handler
- ✅ Enter key handler for wallet input

### HTML Elements Required
- ❌ `wallet-input` - Input field for wallet address
- ❌ `add-wallet-btn` - Button to add wallet
- ❌ `wallet-list` - Container for wallet list
- ❌ `refresh-btn` - Button to refresh feed
- ❌ `feed-container` - Container for trade feed
- ❌ Error message display area

---

## 🔄 Current State

### ✅ COMPLETED (Backend)
- All data management functions
- All API integration functions
- All business logic
- Event listener wiring
- Error handling structure

### ❌ MISSING (Frontend)
- HTML structure (`popup.html`)
- CSS styling (`styles.css`)
- UI rendering functions:
  - `renderWalletList()`
  - `renderFeed()`
  - `showErrorUI()`
- Loading states
- Empty states

### ⚠️ PARTIALLY COMPLETE
- Event handlers are wired but depend on HTML elements that don't exist yet
- Error handling calls UI functions that don't exist yet

---

## 📊 Data Flow

```
User Action (Frontend)
    ↓
Event Handler (Frontend/Backend Bridge)
    ↓
Backend Function (popup.js)
    ↓
API Call / Storage Operation
    ↓
Data Processing (Backend)
    ↓
UI Rendering Function (Frontend - TO BE CREATED)
    ↓
DOM Update (Frontend)
```

---

## 🎯 Next Steps

1. **Create `popup.html`** - Define UI structure
2. **Create `styles.css`** - Style the interface
3. **Implement UI rendering functions** - `renderWalletList()`, `renderFeed()`, `showErrorUI()`
4. **Create `manifest.json`** - Chrome extension configuration
5. **Test end-to-end** - Verify all components work together

---

## 📝 Notes

- **Chrome Extensions are client-side only** - No traditional server backend
- **Backend = Business Logic** - Data processing, API calls, storage
- **Frontend = Presentation** - HTML, CSS, DOM manipulation, user interaction
- **popup.js contains both** - Backend logic + event handlers (frontend bridge)

