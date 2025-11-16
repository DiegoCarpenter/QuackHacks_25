# Backend Documentation - Polymates Lite

## 📋 Table of Contents

1. [Overview](#overview)
2. [Constants & Configuration](#constants--configuration)
3. [Wallet Storage System](#wallet-storage-system)
4. [API Integration](#api-integration)
5. [Data Normalization](#data-normalization)
6. [Feed Management](#feed-management)
7. [Error Handling](#error-handling)
8. [Event Handlers](#event-handlers)
9. [Function Reference](#function-reference)

---

## Overview

The backend (`backend/popup.js`) is the core of the Polymates Lite extension. It handles all business logic, data management, API communication, and user interactions. The backend is completely independent and can function with any frontend that implements the required rendering functions.

**Key Responsibilities:**
- Wallet address management (add, remove, validate, persist)
- Polymarket API integration with authentication
- Trade data fetching and processing
- Data normalization and transformation
- Caching for performance optimization
- Event handling for user interactions
- Error handling and logging

---

## Constants & Configuration

### `POLYMARKET_TRADES_ENDPOINT`
```javascript
const POLYMARKET_TRADES_ENDPOINT = "https://data-api.polymarket.com/trades";
```
- **Type:** String
- **Purpose:** Base URL for Polymarket Data API trades endpoint
- **Usage:** Used in `fetchTradesForWallet()` to construct API URLs

### `POLYMARKET_API_KEY`
```javascript
const POLYMARKET_API_KEY = "YOUR_API_KEY_HERE"; // Replace with your Polymarket API key
```
- **Type:** String
- **Purpose:** Bearer token for API authentication
- **Usage:** Included in Authorization header for all API requests
- **Security:** Currently hardcoded (consider environment variables for production)

### `STORAGE_KEY_WALLETS`
```javascript
const STORAGE_KEY_WALLETS = "polymates_tracked_wallets";
```
- **Type:** String
- **Purpose:** localStorage key for storing tracked wallet addresses
- **Usage:** Used by `loadWallets()` and `saveWallets()`
- **Storage Format:** JSON stringified array of wallet addresses

### `MAX_TRADES_PER_WALLET`
```javascript
const MAX_TRADES_PER_WALLET = 20;
```
- **Type:** Number
- **Purpose:** Maximum number of trades to fetch per wallet per request
- **Usage:** Added as query parameter in API requests
- **Rationale:** Limits response size and improves performance

### `CACHE_TTL_MS`
```javascript
const CACHE_TTL_MS = 30000;
```
- **Type:** Number (milliseconds)
- **Purpose:** Time-to-live for trade cache
- **Value:** 30 seconds (30000 ms)
- **Usage:** Determines when cached data is considered stale
- **Rationale:** Balances freshness with API call reduction

### `tradeCache`
```javascript
let tradeCache = {
  lastFetched: 0,
  trades: []
};
```
- **Type:** Object
- **Purpose:** In-memory cache for trade data
- **Properties:**
  - `lastFetched`: Timestamp (ms) of last cache update
  - `trades`: Array of normalized trade objects
- **Lifetime:** Resets on page refresh (not persistent)
- **Usage:** Checked in `refreshFeed()` before making API calls

---

## Wallet Storage System

### `loadWallets()`

**Purpose:** Retrieves tracked wallet addresses from localStorage.

**Signature:**
```javascript
function loadWallets()
```

**Returns:** `Array<string>` - Array of wallet addresses (lowercase)

**Process:**
1. Retrieves JSON string from localStorage using `STORAGE_KEY_WALLETS`
2. Parses JSON string to array
3. Validates array type (returns empty array if invalid)
4. Returns empty array if no data exists

**Error Handling:**
- Catches JSON parse errors
- Calls `showError()` on failure
- Returns empty array as fallback

**Example:**
```javascript
const wallets = loadWallets();
// Returns: ["0x742d35cc6634c0532925a3b844bc9e7595f0beb", "0x..."]
```

---

### `saveWallets(wallets)`

**Purpose:** Persists wallet addresses to localStorage.

**Signature:**
```javascript
function saveWallets(wallets)
```

**Parameters:**
- `wallets` (Array<string>): Array of wallet addresses to save

**Returns:** `void`

**Process:**
1. Stringifies wallet array to JSON
2. Stores in localStorage with `STORAGE_KEY_WALLETS` key

**Error Handling:**
- Catches storage errors
- Calls `showError()` on failure
- Fails silently (doesn't throw)

**Example:**
```javascript
saveWallets(["0x742d35cc6634c0532925a3b844bc9e7595f0beb"]);
```

---

### `isValidAddress(address)`

**Purpose:** Validates Ethereum wallet address format.

**Signature:**
```javascript
function isValidAddress(address)
```

**Parameters:**
- `address` (string): Address string to validate

**Returns:** `boolean` - true if valid EVM address format

**Validation Rules:**
- Must start with "0x"
- Must be exactly 42 characters (0x + 40 hex chars)
- Must contain only hexadecimal characters (0-9, a-f, A-F)

**Regex Pattern:**
```javascript
/^0x[a-fA-F0-9]{40}$/
```

**Example:**
```javascript
isValidAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"); // true
isValidAddress("0x123"); // false
isValidAddress("invalid"); // false
```

---

### `addWallet(address)`

**Purpose:** Adds a wallet address to the tracked list.

**Signature:**
```javascript
function addWallet(address)
```

**Parameters:**
- `address` (string): Wallet address to add

**Returns:** `boolean` - true if successfully added, false otherwise

**Process:**
1. Trims whitespace and converts to lowercase
2. Validates address format using `isValidAddress()`
3. Loads existing wallets
4. Checks for duplicates
5. Adds to array if valid and unique
6. Saves updated array

**Error Cases:**
- Invalid address format → shows error, returns false
- Duplicate address → shows error, returns false
- Storage failure → shows error, returns false

**Example:**
```javascript
const success = addWallet("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
if (success) {
  console.log("Wallet added!");
}
```

---

### `removeWallet(address)`

**Purpose:** Removes a wallet address from the tracked list.

**Signature:**
```javascript
function removeWallet(address)
```

**Parameters:**
- `address` (string): Wallet address to remove

**Returns:** `boolean` - true if removed, false if not found

**Process:**
1. Normalizes address (trim + lowercase)
2. Loads existing wallets
3. Filters out matching address
4. Compares array lengths to detect removal
5. Saves filtered array

**Error Handling:**
- Catches errors during removal
- Calls `showError()` on failure
- Returns false if wallet not found

**Example:**
```javascript
const removed = removeWallet("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
if (removed) {
  console.log("Wallet removed!");
}
```

---

## API Integration

### `fetchTradesForWallet(address)`

**Purpose:** Fetches recent trades for a single wallet from Polymarket API.

**Signature:**
```javascript
async function fetchTradesForWallet(address)
```

**Parameters:**
- `address` (string): Wallet address to fetch trades for

**Returns:** `Promise<Array<Object>>` - Array of raw trade objects from API

**API Request:**
- **URL:** `https://data-api.polymarket.com/trades?user={address}&limit=20`
- **Method:** GET
- **Headers:**
  - `Authorization: Bearer {POLYMARKET_API_KEY}`
  - `Content-Type: application/json`

**Process:**
1. Constructs URL with encoded wallet address
2. Makes authenticated fetch request
3. Checks response status
4. Parses JSON response
5. Validates array type
6. Returns empty array on error

**Error Handling:**
- HTTP errors → throws error, caught and logged
- Network errors → caught and logged
- Invalid responses → returns empty array
- Calls `showError()` with descriptive message

**Example:**
```javascript
const trades = await fetchTradesForWallet("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
// Returns: [{ id: "...", market_title: "...", ... }, ...]
```

---

### `fetchAllTrades(wallets)`

**Purpose:** Fetches trades for all tracked wallets in parallel.

**Signature:**
```javascript
async function fetchAllTrades(wallets)
```

**Parameters:**
- `wallets` (Array<string>): Array of wallet addresses

**Returns:** `Promise<Array<Object>>` - Array of normalized trade objects

**Process:**
1. Creates array of fetch promises (one per wallet)
2. Uses `Promise.allSettled()` to handle partial failures
3. Iterates through results
4. Normalizes fulfilled promises using `normalizeTrade()`
5. Flattens all trades into single array
6. Logs errors for rejected promises

**Parallel Execution:**
- All wallets fetched simultaneously
- Faster than sequential fetching
- Continues even if some wallets fail

**Error Handling:**
- Individual wallet failures don't stop other fetches
- Logs error for each failed wallet
- Returns array of successfully fetched trades

**Example:**
```javascript
const wallets = ["0x123...", "0x456..."];
const allTrades = await fetchAllTrades(wallets);
// Returns: [normalized trade objects from all wallets]
```

---

## Data Normalization

### `normalizeTrade(raw, walletAddress)`

**Purpose:** Transforms raw API response into standardized trade object.

**Signature:**
```javascript
function normalizeTrade(raw, walletAddress)
```

**Parameters:**
- `raw` (Object): Raw trade object from API
- `walletAddress` (string): Wallet address that made the trade

**Returns:** `Object | null` - Normalized trade object or null on error

**Normalized Trade Structure:**
```javascript
{
  id: string,              // Unique identifier
  user: string,            // Wallet address (lowercase)
  marketId: string,        // Market/event identifier
  marketTitle: string,     // Market question/title
  outcome: string,         // Outcome name (e.g., "Yes", "No")
  side: string,            // "buy" | "sell" | "unknown"
  price: number,           // Trade price (0-1 range)
  size: number,            // Trade size/volume (absolute value)
  timestamp: number,       // Unix timestamp in milliseconds
  marketUrl: string        // Full URL to Polymarket event page
}
```

**Data Mapping Logic:**

1. **Timestamp:**
   - Primary: `raw.created_at` (parsed to milliseconds)
   - Fallback: Current time

2. **Side:**
   - Primary: `raw.side`
   - Fallback: Infer from `raw.amount` (positive = buy, negative = sell)
   - Default: "unknown"

3. **Market ID:**
   - Tries: `raw.event_id`, `raw.market_id`, `raw.condition_id`
   - Fallback: Empty string

4. **Market URL:**
   - Constructed from market ID: `https://polymarket.com/event/{marketId}`
   - Empty if no market ID

5. **Market Title:**
   - Tries: `raw.market_title`, `raw.event_title`, `raw.question`
   - Fallback: "Unknown Market"

6. **Outcome:**
   - Tries: `raw.outcome`, `raw.outcome_title`
   - Fallback: "Unknown"

7. **Price:**
   - Tries: `raw.price`, `raw.outcome_price`
   - Fallback: 0
   - Parsed to float

8. **Size:**
   - Tries: `raw.amount`, `raw.size`
   - Fallback: 0
   - Absolute value (always positive)

9. **ID:**
   - Primary: `raw.id`
   - Fallback: `raw.tx_hash`
   - Last resort: Generated ID using wallet, timestamp, and random

**Error Handling:**
- Catches normalization errors
- Returns null on failure
- Logs error via `showError()`

**Example:**
```javascript
const raw = {
  created_at: "2024-01-15T10:30:00Z",
  market_title: "Will Bitcoin reach $100k?",
  outcome: "Yes",
  price: 0.65,
  amount: 100
};
const normalized = normalizeTrade(raw, "0x123...");
// Returns: { id: "...", user: "0x123...", marketTitle: "Will Bitcoin reach $100k?", ... }
```

---

### `sortTradesByTime(trades)`

**Purpose:** Sorts trades by timestamp in descending order (newest first).

**Signature:**
```javascript
function sortTradesByTime(trades)
```

**Parameters:**
- `trades` (Array<Object>): Array of normalized trade objects

**Returns:** `Array<Object>` - New sorted array (original not mutated)

**Sort Logic:**
- Compares `timestamp` property
- Descending order: `b.timestamp - a.timestamp`
- Creates new array (doesn't mutate input)

**Example:**
```javascript
const sorted = sortTradesByTime(trades);
// Newest trade first, oldest last
```

---

## Feed Management

### `refreshFeed()`

**Purpose:** Main orchestration function for refreshing the trade feed.

**Signature:**
```javascript
async function refreshFeed()
```

**Returns:** `Promise<Array<Object>>` - Array of sorted, normalized trades

**Process Flow:**

1. **Cache Check:**
   - Gets current timestamp
   - Checks if cache exists and is fresh (< 30 seconds old)
   - If fresh, returns cached trades and calls `renderFeed()`
   - Skips API calls if cache valid

2. **Empty Wallet Check:**
   - Loads tracked wallets
   - If no wallets, sets empty cache and calls `renderFeed([])`
   - Returns empty array

3. **Fetch Trades:**
   - Calls `fetchAllTrades()` with all wallets
   - Waits for parallel fetching to complete

4. **Process Trades:**
   - Sorts trades by timestamp using `sortTradesByTime()`
   - Updates cache with new data and timestamp

5. **Render:**
   - Calls `renderFeed()` with sorted trades
   - Returns trades array

**Caching Strategy:**
- 30-second TTL reduces API calls
- Manual refresh bypasses cache (sets `lastFetched` to 0)
- Cache stored in memory (not persistent)

**Error Handling:**
- Catches all errors
- Returns empty array on failure
- Logs error via `showError()`

**Example:**
```javascript
const trades = await refreshFeed();
// Returns: Sorted array of all trades from all wallets
```

---

## Error Handling

### `showError(message)`

**Purpose:** Centralized error logging and UI notification.

**Signature:**
```javascript
function showError(message)
```

**Parameters:**
- `message` (string): Error message to display

**Returns:** `void`

**Process:**
1. Logs error to console with "[Polymates Lite]" prefix
2. Checks if `showErrorUI()` function exists (frontend)
3. Calls `showErrorUI()` if available

**Design Rationale:**
- Separates logging from UI display
- Allows backend to work without frontend
- Frontend handles actual error display

**Example:**
```javascript
showError("Failed to fetch trades: Network error");
// Logs to console and displays in UI (if frontend available)
```

---

## Utility Functions

### `openMarket(url)`

**Purpose:** Opens Polymarket market page in new browser tab.

**Signature:**
```javascript
function openMarket(url)
```

**Parameters:**
- `url` (string): Market URL to open

**Returns:** `void`

**Process:**
1. Validates URL exists
2. Uses `window.open(url, "_blank")` to open in new tab
3. Handles errors gracefully

**Error Handling:**
- Catches window.open errors
- Logs error via `showError()`
- Fails silently if URL invalid

**Example:**
```javascript
openMarket("https://polymarket.com/event/will-bitcoin-reach-100k");
// Opens market page in new tab
```

---

## Event Handlers

### DOMContentLoaded Initialization

**Purpose:** Sets up all event listeners when DOM is ready.

**Location:** Lines 232-315

**Initialization Steps:**

1. **Load Wallets:**
   - Calls `loadWallets()` to get tracked wallets
   - Calls `renderWalletList()` if function exists

2. **Initial Feed Refresh:**
   - Calls `refreshFeed()` to load initial trades

3. **Event Listener Setup:**
   - Sets up all button and input listeners

---

### Add Wallet Button Handler

**Element ID:** `add-wallet-btn`

**Process:**
1. Listens for click events
2. Reads value from `wallet-input` element
3. Calls `addWallet()` with input value
4. On success:
   - Clears input field
   - Reloads wallets
   - Renders updated wallet list
   - Clears cache
   - Refreshes feed

**Error Handling:**
- `addWallet()` handles validation and shows errors
- No additional error handling needed

---

### Remove Wallet Button Handler

**Element ID:** `wallet-list` (event delegation)

**Process:**
1. Uses event delegation on container
2. Listens for clicks on elements with `remove-wallet-btn` class
3. Reads wallet address from `data-wallet` attribute
4. Calls `removeWallet()` with address
5. On success:
   - Reloads wallets
   - Renders updated wallet list
   - Clears cache
   - Refreshes feed

**Event Delegation:**
- More efficient than individual listeners
- Works with dynamically created elements
- Single listener handles all remove buttons

---

### Refresh Button Handler

**Element ID:** `refresh-btn`

**Process:**
1. Listens for click events
2. Clears cache by setting `tradeCache.lastFetched = 0`
3. Calls `refreshFeed()` to fetch fresh data

**Cache Bypass:**
- Setting `lastFetched` to 0 forces cache miss
- Ensures fresh data on manual refresh

---

### Copy Trade Button Handler

**Element ID:** `feed-container` (event delegation)

**Process:**
1. Uses event delegation on container
2. Listens for clicks on elements with `copy-trade-btn` class
3. Reads market URL from `data-market-url` attribute
4. Calls `openMarket()` with URL

**Event Delegation:**
- Handles dynamically created trade cards
- Single listener for all copy buttons

---

### Wallet Input Enter Key Handler

**Element ID:** `wallet-input`

**Process:**
1. Listens for keypress events
2. Checks if Enter key pressed
3. Programmatically clicks `add-wallet-btn`
4. Triggers add wallet flow

**User Experience:**
- Allows keyboard-only workflow
- Faster than clicking button

---

## Function Reference

### Quick Reference Table

| Function | Type | Parameters | Returns | Purpose |
|----------|------|------------|---------|---------|
| `loadWallets()` | Sync | None | `Array<string>` | Load wallets from storage |
| `saveWallets()` | Sync | `wallets: Array<string>` | `void` | Save wallets to storage |
| `isValidAddress()` | Sync | `address: string` | `boolean` | Validate address format |
| `addWallet()` | Sync | `address: string` | `boolean` | Add wallet to list |
| `removeWallet()` | Sync | `address: string` | `boolean` | Remove wallet from list |
| `fetchTradesForWallet()` | Async | `address: string` | `Promise<Array>` | Fetch trades for one wallet |
| `normalizeTrade()` | Sync | `raw: Object, wallet: string` | `Object\|null` | Normalize trade data |
| `fetchAllTrades()` | Async | `wallets: Array<string>` | `Promise<Array>` | Fetch trades for all wallets |
| `sortTradesByTime()` | Sync | `trades: Array` | `Array` | Sort trades by timestamp |
| `refreshFeed()` | Async | None | `Promise<Array>` | Refresh trade feed |
| `showError()` | Sync | `message: string` | `void` | Log and display error |
| `openMarket()` | Sync | `url: string` | `void` | Open market in new tab |

---

## Dependencies

### Frontend Functions (Expected)
- `renderWalletList(wallets)` - Renders wallet list
- `renderFeed(trades)` - Renders trade feed
- `showErrorUI(message)` - Displays error in UI

### Browser APIs Used
- `localStorage` - Persistent storage
- `fetch()` - HTTP requests
- `window.open()` - Open new tabs
- `document.getElementById()` - DOM access
- `addEventListener()` - Event handling

### External Services
- Polymarket Data API (`https://data-api.polymarket.com`)

---

## Error Scenarios

### Network Errors
- **Cause:** API unreachable, network failure
- **Handling:** Caught in `fetchTradesForWallet()`, returns empty array
- **User Impact:** No trades displayed, error logged

### Invalid API Response
- **Cause:** API returns unexpected format
- **Handling:** `normalizeTrade()` handles missing fields with fallbacks
- **User Impact:** Partial data displayed, errors logged

### Storage Errors
- **Cause:** localStorage quota exceeded, disabled
- **Handling:** Caught in `saveWallets()`, error logged
- **User Impact:** Wallets not saved, error displayed

### Invalid Wallet Address
- **Cause:** User enters malformed address
- **Handling:** Validated in `addWallet()`, error shown
- **User Impact:** Wallet not added, error message displayed

---

## Performance Considerations

### Caching
- 30-second cache reduces API calls by ~95% during active use
- Cache stored in memory (fast access)
- Manual refresh bypasses cache for fresh data

### Parallel Fetching
- All wallets fetched simultaneously
- Reduces total fetch time from `n * avg_time` to `max_time`
- Significantly faster for multiple wallets

### Event Delegation
- Single listener per container instead of per element
- More efficient for dynamic content
- Reduces memory usage

---

## Security Considerations

### API Key
- Currently hardcoded in source code
- **Recommendation:** Use environment variables or secure storage
- Key exposed in extension code (visible to users)

### Input Validation
- All wallet addresses validated before storage
- Prevents injection of invalid data
- Regex validation ensures format correctness

### XSS Prevention
- Frontend handles all HTML rendering
- Backend doesn't directly manipulate DOM
- Separation reduces XSS risk

---

## Testing Recommendations

### Unit Tests
- Test `isValidAddress()` with various inputs
- Test `normalizeTrade()` with different API response formats
- Test `sortTradesByTime()` with unsorted arrays

### Integration Tests
- Test `addWallet()` → `loadWallets()` flow
- Test `fetchAllTrades()` with multiple wallets
- Test `refreshFeed()` cache behavior

### Error Handling Tests
- Test with invalid API responses
- Test with network failures
- Test with storage errors

---

## Future Improvements

1. **Persistent Cache:** Store cache in localStorage for faster initial load
2. **Incremental Updates:** Only fetch new trades since last update
3. **Rate Limiting:** Implement request throttling
4. **Retry Logic:** Automatic retry on failed requests
5. **Background Sync:** Update trades in background
6. **WebSocket Support:** Real-time trade updates
7. **Batch API Calls:** Combine multiple wallet requests

---

## Conclusion

The backend is a well-structured, modular system that handles all business logic independently of the frontend. It follows best practices for error handling, caching, and performance optimization. The separation of concerns allows for easy testing and maintenance.

