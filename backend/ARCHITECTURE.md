# Polymates Lite - Architecture Documentation

## 📁 Project Structure

This is a **Chrome Extension (Manifest V3)** - all code runs client-side in the browser.

```
QuackHacks_25/
├── backend/
│   ├── popup.js          # Backend logic (business logic, API, event handlers)
│   └── ARCHITECTURE.md   # This file
├── frontend/
│   ├── popup.html        # HTML structure
│   ├── popup.js          # Frontend rendering functions
│   ├── styles.css        # Styling
│   ├── manifest.json     # Chrome extension configuration
│   └── logo.png          # Extension icon
```

---

## 🔵 BACKEND (Business Logic & Data Layer)

**Location:** `backend/popup.js` (317 lines)

### Overview
The backend contains all business logic, API integration, data management, and event handling. It orchestrates the entire application flow and calls frontend rendering functions to update the UI.

### Constants & Configuration (Lines 1-12)
- `POLYMARKET_TRADES_ENDPOINT` - API endpoint URL
- `POLYMARKET_API_KEY` - Authentication key for API requests
- `STORAGE_KEY_WALLETS` - localStorage key for wallet storage
- `MAX_TRADES_PER_WALLET` - Maximum trades to fetch per wallet (20)
- `CACHE_TTL_MS` - Cache time-to-live in milliseconds (30 seconds)
- `tradeCache` - In-memory cache object for trades

### Wallet Storage System (Lines 14-81)

#### `loadWallets()`
- **Purpose:** Loads array of wallet addresses from localStorage
- **Returns:** Array of wallet addresses (empty array if none)
- **Error Handling:** Catches parse errors, returns empty array on failure

#### `saveWallets(wallets)`
- **Purpose:** Saves wallet array to localStorage
- **Parameters:** `wallets` - Array of wallet addresses
- **Error Handling:** Logs errors via `showError()`

#### `isValidAddress(address)`
- **Purpose:** Validates Ethereum wallet address format
- **Parameters:** `address` - String to validate
- **Returns:** Boolean (true if valid EVM address)
- **Validation:** Uses regex `/^0x[a-fA-F0-9]{40}$/`

#### `addWallet(address)`
- **Purpose:** Adds a wallet to tracked list
- **Parameters:** `address` - Wallet address string
- **Returns:** Boolean (true if successful)
- **Process:**
  1. Trims and lowercases address
  2. Validates format
  3. Checks for duplicates
  4. Saves to storage
- **Error Handling:** Shows error messages for invalid/duplicate addresses

#### `removeWallet(address)`
- **Purpose:** Removes a wallet from tracked list
- **Parameters:** `address` - Wallet address to remove
- **Returns:** Boolean (true if removed, false if not found)
- **Process:**
  1. Normalizes address (trim + lowercase)
  2. Filters out from array
  3. Saves updated array

### API Integration (Lines 83-170)

#### `fetchTradesForWallet(address)`
- **Purpose:** Fetches trades for a single wallet from Polymarket API
- **Parameters:** `address` - Wallet address
- **Returns:** Promise resolving to array of raw trade objects
- **API Details:**
  - Endpoint: `https://data-api.polymarket.com/trades?user={address}&limit=20`
  - Method: GET
  - Headers: Authorization (Bearer token), Content-Type
- **Error Handling:** Returns empty array on failure, logs error

#### `normalizeTrade(raw, walletAddress)`
- **Purpose:** Transforms raw API response into standardized trade object
- **Parameters:**
  - `raw` - Raw trade object from API
  - `walletAddress` - Wallet address for this trade
- **Returns:** Normalized trade object or null on error
- **Normalized Structure:**
  ```javascript
  {
    id: string,              // Unique trade ID
    user: string,            // Wallet address
    marketId: string,        // Market/event ID
    marketTitle: string,     // Market question/title
    outcome: string,         // Outcome name
    side: string,            // "buy" | "sell" | "unknown"
    price: number,           // Trade price
    size: number,            // Trade size/volume
    timestamp: number,       // Unix timestamp in milliseconds
    marketUrl: string        // URL to Polymarket event page
  }
  ```
- **Data Mapping:**
  - Handles multiple API response formats
  - Infers side from amount if not provided
  - Constructs market URL from market ID
  - Generates fallback ID if missing

#### `fetchAllTrades(wallets)`
- **Purpose:** Fetches trades for all tracked wallets in parallel
- **Parameters:** `wallets` - Array of wallet addresses
- **Returns:** Promise resolving to array of normalized trades
- **Process:**
  1. Creates parallel fetch promises for all wallets
  2. Uses `Promise.allSettled()` to handle partial failures
  3. Normalizes all trades
  4. Flattens into single array
- **Error Handling:** Continues even if some wallets fail, logs individual errors

#### `sortTradesByTime(trades)`
- **Purpose:** Sorts trades by timestamp (newest first)
- **Parameters:** `trades` - Array of normalized trade objects
- **Returns:** New sorted array (doesn't mutate original)
- **Sort Order:** Descending (newest → oldest)

### Feed Logic (Lines 172-210)

#### `refreshFeed()`
- **Purpose:** Main orchestration function for refreshing the trade feed
- **Returns:** Promise resolving to array of sorted trades
- **Process:**
  1. Checks cache validity (30s TTL)
  2. Returns cached data if fresh
  3. Loads tracked wallets
  4. Returns empty array if no wallets
  5. Fetches all trades in parallel
  6. Sorts by timestamp
  7. Updates cache
  8. Calls `renderFeed()` to update UI
- **Caching:** Implements 30-second cache to reduce API calls
- **Error Handling:** Returns empty array on failure, logs error

### Error Handling (Lines 212-218)

#### `showError(message)`
- **Purpose:** Centralized error logging and UI notification
- **Parameters:** `message` - Error message string
- **Process:**
  1. Logs to console with "[Polymates Lite]" prefix
  2. Calls `showErrorUI()` if function exists (frontend)
- **Design:** Separates logging from UI display

### Utility Functions (Lines 220-229)

#### `openMarket(url)`
- **Purpose:** Opens Polymarket market page in new tab
- **Parameters:** `url` - Market URL string
- **Process:** Uses `window.open()` with "_blank" target
- **Error Handling:** Logs errors if window.open fails

### Event Handlers & Initialization (Lines 231-315)

#### `DOMContentLoaded` Event Listener
- **Purpose:** Initializes application when DOM is ready
- **Initialization Steps:**
  1. Loads wallets from storage
  2. Renders wallet list (calls `renderWalletList()`)
  3. Refreshes feed (calls `refreshFeed()`)
  4. Sets up all event listeners

#### Event Listeners Setup:

**Add Wallet Button** (`add-wallet-btn`)
- Listens for click events
- Reads input value from `wallet-input`
- Calls `addWallet()` to validate and save
- Clears input on success
- Refreshes wallet list and feed

**Remove Wallet Button** (`remove-wallet-btn`)
- Uses event delegation on `wallet-list` container
- Listens for clicks on elements with `remove-wallet-btn` class
- Reads wallet address from `data-wallet` attribute
- Calls `removeWallet()` to remove
- Refreshes wallet list and feed

**Refresh Button** (`refresh-btn`)
- Clears cache (sets `lastFetched` to 0)
- Calls `refreshFeed()` to fetch fresh data

**Copy Trade Button** (`copy-trade-btn`)
- Uses event delegation on `feed-container`
- Listens for clicks on elements with `copy-trade-btn` class
- Reads market URL from `data-market-url` attribute
- Calls `openMarket()` to open in new tab

**Wallet Input** (`wallet-input`)
- Listens for Enter key press
- Triggers add wallet button click
- Provides keyboard shortcut for adding wallets

---

## 🟢 FRONTEND (UI & Presentation Layer)

**Location:** `frontend/popup.js` (186 lines)

### Overview
The frontend contains only rendering functions and UI-specific logic. It receives data from the backend and updates the DOM accordingly.

### Formatting Helpers (Lines 4-33)

#### `formatTimestamp(timestamp)`
- **Purpose:** Converts timestamp to human-readable relative time
- **Returns:** String like "5m ago", "2h ago", "3d ago", or date string
- **Logic:** Calculates time difference and formats accordingly

#### `formatPrice(price)`
- **Purpose:** Formats price to 4 decimal places
- **Returns:** String with formatted price

#### `formatSize(size)`
- **Purpose:** Formats size/volume with "k" suffix for thousands
- **Returns:** String like "1.5k" or "500.00"

### Rendering Functions (Lines 35-134)

#### `renderWalletList(wallets)`
- **Purpose:** Renders list of tracked wallets
- **Parameters:** `wallets` - Array of wallet addresses
- **Process:**
  1. Gets `wallet-list` element
  2. Shows empty state if no wallets
  3. Renders wallet items with shortened addresses
  4. Creates remove buttons with `data-wallet` attributes
- **HTML Structure:** Creates wallet items with address display and remove button

#### `renderFeed(trades)`
- **Purpose:** Renders trade feed with all trades
- **Parameters:** `trades` - Array of normalized trade objects
- **Process:**
  1. Hides loading indicator
  2. Shows empty state if no trades
  3. Maps trades to HTML trade cards
  4. Includes all trade details (market, outcome, side, price, size)
  5. Adds "Copy Trade" button with market URL
- **HTML Structure:** Creates trade cards with all details and action buttons

#### `showErrorUI(message)`
- **Purpose:** Displays error message in UI
- **Parameters:** `message` - Error message string
- **Process:**
  1. Gets `error-message` element
  2. Sets text content
  3. Shows element
  4. Auto-hides after 3 seconds

### Loading Indicator Helpers (Lines 53-66)

#### `showLoadingIndicator()`
- **Purpose:** Shows loading indicator during API calls
- **Process:** Sets `display: block` on `loading-indicator` element

#### `hideLoadingIndicator()`
- **Purpose:** Hides loading indicator when done
- **Process:** Sets `display: none` on `loading-indicator` element

### Theme Management (Lines 136-158)

#### `getStoredTheme()`
- **Purpose:** Gets saved theme preference
- **Returns:** "light" or "dark" (defaults to "light")

#### `setStoredTheme(theme)`
- **Purpose:** Saves theme preference to localStorage
- **Parameters:** `theme` - "light" or "dark"

#### `applyTheme(theme)`
- **Purpose:** Applies theme to document
- **Process:**
  1. Sets `data-theme` attribute on document root
  2. Updates theme icon emoji

#### `toggleTheme()`
- **Purpose:** Switches between light and dark themes
- **Process:** Gets current theme, toggles, saves, and applies

### Frontend Initialization (Lines 160-185)

#### `DOMContentLoaded` Event Listener
- **Purpose:** Initializes frontend-specific features
- **Process:**
  1. Applies saved theme
  2. Sets up theme toggle button listener
  3. Sets up refresh button listener (shows loading)
  4. Shows loading indicator on initial load if wallets exist

---

## 🔄 Data Flow

```
User Action (Click/Input)
    ↓
HTML Element (button/input)
    ↓
Event Listener (Backend - popup.js)
    ↓
Backend Function (addWallet, removeWallet, refreshFeed)
    ↓
API Call / Storage Operation (Backend)
    ↓
Data Processing (Backend - normalize, sort, cache)
    ↓
Frontend Rendering Function (renderWalletList, renderFeed)
    ↓
DOM Update (HTML)
    ↓
User Sees Updated UI
```

---

## 📊 Component Interaction

### Backend → Frontend Communication
- Backend calls frontend functions: `renderWalletList()`, `renderFeed()`, `showErrorUI()`
- Uses `typeof` checks to ensure functions exist before calling
- Frontend functions are pure - they only render, don't fetch data

### Frontend → Backend Communication
- Frontend calls backend functions: `loadWallets()` (for theme initialization)
- Uses `typeof` checks to ensure functions exist
- Minimal interaction - frontend mostly receives data

### Shared State
- **localStorage:** Backend manages wallet storage, frontend manages theme storage
- **Cache:** Backend manages trade cache in memory
- **DOM:** Frontend manages all DOM updates

---

## 🎯 Key Design Decisions

1. **Separation of Concerns:**
   - Backend = Logic, API, Data
   - Frontend = Rendering, UI, Presentation

2. **Loose Coupling:**
   - Backend checks if frontend functions exist before calling
   - Frontend checks if backend functions exist before calling
   - No hard dependencies

3. **Error Handling:**
   - Backend logs errors and calls frontend to display
   - Frontend displays errors but doesn't handle business logic errors

4. **Caching:**
   - 30-second cache reduces API calls
   - Manual refresh bypasses cache
   - Cache stored in memory (not persistent)

5. **Event Delegation:**
   - Used for dynamically created elements (remove buttons, copy trade buttons)
   - More efficient than individual listeners

---

## 📝 File Responsibilities

### `backend/popup.js`
- ✅ All business logic
- ✅ API integration
- ✅ Data management
- ✅ Event handling
- ✅ Error handling
- ✅ Caching logic

### `frontend/popup.js`
- ✅ UI rendering functions
- ✅ Formatting helpers
- ✅ Loading indicators
- ✅ Theme management
- ✅ Minimal initialization

### `frontend/popup.html`
- ✅ HTML structure
- ✅ Element IDs (must match backend expectations)
- ✅ Script loading order (backend first, then frontend)

### `frontend/styles.css`
- ✅ All styling
- ✅ Theme variables
- ✅ Responsive design
- ✅ Animations

### `frontend/manifest.json`
- ✅ Extension configuration
- ✅ Permissions
- ✅ Host permissions for API

---

## ✅ Current Status

### Backend: 100% Complete
- All functions implemented
- All event handlers wired
- Error handling in place
- Caching implemented

### Frontend: 100% Complete
- All rendering functions implemented
- Formatting helpers complete
- Theme management working
- Loading indicators functional

### Integration: 100% Complete
- Backend and frontend communicate seamlessly
- All HTML element IDs match
- Scripts load in correct order
- No conflicts or duplicates

---

## 🚀 Extension is Production Ready!

All components are implemented, tested, and integrated. The extension follows best practices for Chrome extensions and maintains clean separation between business logic and presentation.
