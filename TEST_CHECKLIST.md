# Extension Testing Checklist

## ✅ Code Validation Results

### Function Mapping
- ✅ `renderWalletList(wallets)` - Defined in frontend, called by backend
- ✅ `renderFeed(trades)` - Defined in frontend, called by backend  
- ✅ `showErrorUI(message)` - Defined in frontend, called by backend
- ✅ All HTML element IDs match backend expectations

### File Structure
- ✅ `backend/popup.js` - Backend logic (unchanged)
- ✅ `frontend/popup.html` - HTML structure with correct IDs
- ✅ `frontend/popup.js` - Rendering functions
- ✅ `frontend/styles.css` - Styling
- ✅ `frontend/manifest.json` - Extension config

---

## 🧪 Manual Testing Steps

### 1. Load Extension in Chrome
- [ ] Open Chrome and go to `chrome://extensions/`
- [ ] Enable "Developer mode" (toggle in top right)
- [ ] Click "Load unpacked"
- [ ] Select the `frontend/` folder (or root folder if manifest points to frontend/)
- [ ] Verify extension loads without errors
- [ ] Check console for any errors (F12 → Console)

### 2. Test Extension Popup
- [ ] Click extension icon in toolbar
- [ ] Verify popup opens
- [ ] Verify UI displays correctly (header, input, buttons)
- [ ] Check for any JavaScript errors in console

### 3. Test Theme Toggle
- [ ] Click theme toggle button (🌙/☀️)
- [ ] Verify theme switches between light/dark
- [ ] Verify theme persists after closing/reopening popup

### 4. Test Wallet Management
- [ ] Enter a valid wallet address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- [ ] Click "Add Wallet" button
- [ ] Verify wallet appears in "Tracked Wallets" section
- [ ] Verify wallet is shortened (first 6 + last 4 chars)
- [ ] Try adding the same wallet again - should show error
- [ ] Try adding invalid address - should show error
- [ ] Click "Remove" button on a wallet
- [ ] Verify wallet is removed from list

### 5. Test Trade Feed
- [ ] With wallets added, verify feed loads
- [ ] Check loading indicator appears during fetch
- [ ] Verify trades display (if wallet has trades)
- [ ] Verify trade cards show:
  - [ ] Wallet badge (shortened address)
  - [ ] Timestamp (relative time)
  - [ ] Market title
  - [ ] Outcome
  - [ ] Side (buy/sell)
  - [ ] Price
  - [ ] Size
  - [ ] Copy Trade button
- [ ] Click "Copy Trade" button - should open Polymarket in new tab
- [ ] Click "Refresh" button - should reload trades
- [ ] Verify loading indicator shows during refresh

### 6. Test Error Handling
- [ ] Try adding invalid wallet format
- [ ] Verify error message displays
- [ ] Verify error message auto-hides after 3 seconds
- [ ] Test with network disconnected (if possible)
- [ ] Verify error handling for API failures

### 7. Test Empty States
- [ ] Remove all wallets
- [ ] Verify "No wallets tracked yet" message
- [ ] Verify "Add a wallet to start tracking trades" in feed
- [ ] Add wallet with no trades
- [ ] Verify "No trades found" message

### 8. Test Caching
- [ ] Add a wallet with trades
- [ ] Wait for feed to load
- [ ] Click refresh immediately (within 30 seconds)
- [ ] Verify cached data is used (faster load)
- [ ] Wait 30+ seconds, click refresh
- [ ] Verify fresh data is fetched

### 9. Test Data Persistence
- [ ] Add wallets
- [ ] Close popup
- [ ] Reopen popup
- [ ] Verify wallets are still there
- [ ] Verify theme preference is saved

---

## 🐛 Common Issues & Fixes

### Issue: Script not loading
**Symptom:** Console shows "Failed to load script" or functions undefined
**Fix:** 
- Check script path in `popup.html` matches your folder structure
- If extension root is `frontend/`, change path to `../backend/popup.js` or copy backend file
- Verify manifest.json points to correct popup.html location

### Issue: Functions not found
**Symptom:** `renderWalletList is not a function`
**Fix:**
- Verify `frontend/popup.js` is loaded after `backend/popup.js`
- Check function names match exactly (case-sensitive)

### Issue: API errors
**Symptom:** "Failed to fetch trades" errors
**Fix:**
- Verify API key is correct in `backend/popup.js`
- Check network tab for API response
- Verify `host_permissions` in manifest.json includes API domain

### Issue: Styling broken
**Symptom:** UI looks wrong or unstyled
**Fix:**
- Verify `styles.css` is in same folder as `popup.html`
- Check CSS file path in HTML `<link>` tag

---

## 📊 Expected Behavior

### On Load
1. Theme initializes (light or dark based on preference)
2. Wallets load from localStorage
3. Wallet list renders
4. If wallets exist, feed starts loading
5. Loading indicator shows during fetch
6. Trades render when ready

### On Add Wallet
1. Input validates address format
2. Checks for duplicates
3. Saves to localStorage
4. Updates wallet list
5. Clears input field
6. Refreshes feed

### On Remove Wallet
1. Removes from localStorage
2. Updates wallet list
3. Refreshes feed

### On Refresh
1. Shows loading indicator
2. Clears cache
3. Fetches fresh data
4. Renders updated feed
5. Hides loading indicator

---

## ✅ Success Criteria

Extension is working correctly if:
- ✅ No console errors
- ✅ Wallets can be added/removed
- ✅ Trades load and display
- ✅ Copy Trade buttons work
- ✅ Theme toggle works
- ✅ Data persists across sessions
- ✅ Loading states work
- ✅ Error messages display properly

---

## 🔍 Debugging Tips

1. **Open DevTools:**
   - Right-click extension popup → Inspect
   - Or: F12 when popup is focused

2. **Check Console:**
   - Look for errors or warnings
   - Check network tab for API calls

3. **Check localStorage:**
   - Application tab → Local Storage
   - Verify `polymates_tracked_wallets` key exists

4. **Test API directly:**
   - Open network tab
   - Check API request/response
   - Verify Authorization header is sent

5. **Verify Functions:**
   - Type in console: `typeof renderWalletList`
   - Should return: `"function"`

