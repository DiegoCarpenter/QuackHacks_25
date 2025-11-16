# Testing Guide - Polymates Lite Extension

## 🚀 Quick Start Testing

### Step 1: Load Extension in Chrome

1. **Open Chrome Extensions Page:**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode:**
   - Toggle the switch in the top-right corner

3. **Load the Extension:**
   - Click "Load unpacked"
   - Navigate to: `QuackHacks_25/frontend/`
   - Select the folder and click "Select Folder"

4. **Verify Extension Loaded:**
   - You should see "Polymates" in your extensions list
   - Check for any error messages (red text)
   - Extension icon should appear in toolbar

---

## 🧪 Test Scenarios

### Test 1: Basic Extension Load ✅

**Steps:**
1. Click the extension icon in Chrome toolbar
2. Popup should open

**Expected Results:**
- ✅ Popup opens without errors
- ✅ Header shows "Polymates" with subtitle
- ✅ Theme toggle button visible (🌙)
- ✅ Wallet input field visible
- ✅ "Add Wallet" button visible
- ✅ "Tracked Wallets" section shows "No wallets tracked yet"
- ✅ "Trade Feed" section shows "Add a wallet to start tracking trades"
- ✅ No console errors (F12 → Console)

**If Errors:**
- Check browser console for script loading errors
- Verify `backend/popup.js` path is correct
- Check manifest.json permissions

---

### Test 2: Theme Toggle ✅

**Steps:**
1. Click the theme toggle button (🌙)
2. Click again to toggle back

**Expected Results:**
- ✅ Theme switches between light and dark
- ✅ Icon changes (🌙 ↔ ☀️)
- ✅ Theme persists after closing/reopening popup
- ✅ All UI elements remain visible in both themes

---

### Test 3: Add Valid Wallet ✅

**Test Wallet Address:**
```
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Steps:**
1. Paste wallet address into input field
2. Click "Add Wallet" button
3. OR press Enter key

**Expected Results:**
- ✅ Input field clears after adding
- ✅ Wallet appears in "Tracked Wallets" section
- ✅ Wallet displayed as shortened format: `0x742d...0bEb`
- ✅ "Remove" button appears next to wallet
- ✅ Loading indicator shows briefly
- ✅ Trade feed updates (if wallet has trades)
- ✅ No error messages

**Verify in Console:**
- Open DevTools (F12)
- Check Application → Local Storage
- Should see key: `polymates_tracked_wallets`
- Value should contain the wallet address (lowercase)

---

### Test 4: Add Invalid Wallet ❌

**Test Cases:**
1. Invalid format: `invalid-address`
2. Too short: `0x123`
3. Empty string: (just click Add)

**Expected Results:**
- ✅ Error message appears: "Invalid wallet address format"
- ✅ Error message auto-hides after 3 seconds
- ✅ Wallet NOT added to list
- ✅ Input field retains value (for correction)

---

### Test 5: Add Duplicate Wallet ❌

**Steps:**
1. Add a wallet (use test wallet from Test 3)
2. Try to add the same wallet again

**Expected Results:**
- ✅ Error message: "Wallet already tracked"
- ✅ Wallet NOT duplicated in list
- ✅ Error message auto-hides after 3 seconds

---

### Test 6: Remove Wallet ✅

**Steps:**
1. Add a wallet first
2. Click "Remove" button next to the wallet

**Expected Results:**
- ✅ Wallet disappears from list
- ✅ "No wallets tracked yet" message appears
- ✅ Trade feed updates (shows empty state)
- ✅ Wallet removed from localStorage

---

### Test 7: Trade Feed Loading ✅

**Prerequisites:**
- At least one wallet added
- Wallet should have recent trades on Polymarket

**Steps:**
1. Add a wallet with known activity
2. Wait for feed to load

**Expected Results:**
- ✅ Loading indicator appears briefly
- ✅ Trade cards appear in feed
- ✅ Each trade card shows:
  - Wallet badge (shortened address)
  - Timestamp (relative time: "5m ago", "2h ago", etc.)
  - Market title
  - Outcome
  - Side (Buy/Sell)
  - Price (formatted: $0.6500)
  - Size (formatted: 1.5k or 500.00)
  - "Copy Trade" button
- ✅ Trades sorted newest first
- ✅ Loading indicator disappears

**If No Trades:**
- Check if wallet has recent activity on Polymarket
- Verify API key is valid
- Check network tab for API response

---

### Test 8: Copy Trade Button ✅

**Prerequisites:**
- Trade feed loaded with trades

**Steps:**
1. Click "Copy Trade" button on any trade card

**Expected Results:**
- ✅ New tab opens
- ✅ Polymarket event page loads
- ✅ URL format: `https://polymarket.com/event/{marketId}`
- ✅ Original popup remains open

---

### Test 9: Refresh Feed ✅

**Steps:**
1. With trades loaded, click "Refresh" button
2. Wait for refresh to complete

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Feed updates with latest trades
- ✅ Trades re-sorted by timestamp
- ✅ Loading indicator disappears

**Cache Test:**
- Click refresh again within 30 seconds
- Should use cached data (faster)
- Click refresh after 30+ seconds
- Should fetch fresh data

---

### Test 10: Multiple Wallets ✅

**Test Wallets:**
```
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
0x8ba1f109551bD432803012645Hac136c22C9c8
```

**Steps:**
1. Add first wallet
2. Add second wallet
3. Wait for feed to load

**Expected Results:**
- ✅ Both wallets appear in list
- ✅ Feed shows trades from both wallets
- ✅ Trades sorted by timestamp (newest first)
- ✅ Wallet badge shows which wallet made each trade
- ✅ All trades from both wallets merged correctly

---

### Test 11: Keyboard Shortcuts ✅

**Steps:**
1. Click in wallet input field
2. Type wallet address
3. Press Enter key

**Expected Results:**
- ✅ Wallet added (same as clicking button)
- ✅ Input clears
- ✅ Feed updates

---

### Test 12: Data Persistence ✅

**Steps:**
1. Add one or more wallets
2. Close the popup
3. Reopen the popup

**Expected Results:**
- ✅ Wallets still in list
- ✅ Theme preference saved
- ✅ Feed loads automatically
- ✅ All data persisted in localStorage

---

### Test 13: Error Handling - Network Failure ❌

**Steps:**
1. Disconnect internet (or block API domain)
2. Add a wallet
3. Try to refresh feed

**Expected Results:**
- ✅ Error message appears
- ✅ Error logged to console
- ✅ Extension doesn't crash
- ✅ UI remains functional

---

### Test 14: Empty States ✅

**Steps:**
1. Remove all wallets
2. Observe UI

**Expected Results:**
- ✅ "No wallets tracked yet" message
- ✅ "Add a wallet to start tracking trades" in feed
- ✅ No errors or broken UI

---

## 🔍 Debugging Tips

### Open DevTools
1. Right-click extension popup → "Inspect"
2. OR: Press F12 when popup is focused

### Check Console
- Look for errors (red text)
- Check for warnings (yellow text)
- Verify function calls

### Check Network Tab
1. Open DevTools → Network tab
2. Add a wallet
3. Look for API request to `data-api.polymarket.com`
4. Check:
   - Request URL (includes wallet address)
   - Request headers (Authorization header present)
   - Response status (200 = success)
   - Response data (array of trades)

### Check localStorage
1. DevTools → Application tab
2. Local Storage → Extension URL
3. Check keys:
   - `polymates_tracked_wallets` - Array of wallet addresses
   - `polymates_theme` - "light" or "dark"

### Verify Functions
Type in console:
```javascript
typeof renderWalletList  // Should return "function"
typeof renderFeed        // Should return "function"
typeof showErrorUI       // Should return "function"
typeof loadWallets       // Should return "function"
```

---

## ✅ Success Criteria

Extension is working correctly if:
- ✅ All tests pass
- ✅ No console errors
- ✅ Wallets persist across sessions
- ✅ Trades load and display correctly
- ✅ All buttons work
- ✅ Theme toggle works
- ✅ Error messages display properly
- ✅ Loading states work
- ✅ Copy Trade opens correct URLs

---

## 🐛 Common Issues & Solutions

### Issue: Script not loading
**Symptom:** Console shows "Failed to load script"
**Solution:**
- Check `popup.html` script paths
- Verify `backend/popup.js` exists
- Check file permissions

### Issue: Functions undefined
**Symptom:** "renderWalletList is not a function"
**Solution:**
- Verify scripts load in correct order (backend first)
- Check for JavaScript syntax errors
- Reload extension

### Issue: API errors (401/403)
**Symptom:** "Failed to fetch trades" with 401/403 status
**Solution:**
- Verify API key is correct in `backend/popup.js`
- Check API key hasn't expired
- Verify `host_permissions` in manifest.json

### Issue: No trades loading
**Symptom:** Feed shows "No trades found"
**Solution:**
- Verify wallet has recent trades on Polymarket
- Check API response in Network tab
- Try a different wallet address
- Verify API endpoint is correct

### Issue: Theme not persisting
**Symptom:** Theme resets on popup close
**Solution:**
- Check localStorage in Application tab
- Verify `polymates_theme` key exists
- Check theme functions in frontend/popup.js

---

## 📊 Test Results Template

```
Test 1: Basic Extension Load        [ ] Pass  [ ] Fail
Test 2: Theme Toggle                [ ] Pass  [ ] Fail
Test 3: Add Valid Wallet            [ ] Pass  [ ] Fail
Test 4: Add Invalid Wallet          [ ] Pass  [ ] Fail
Test 5: Add Duplicate Wallet        [ ] Pass  [ ] Fail
Test 6: Remove Wallet               [ ] Pass  [ ] Fail
Test 7: Trade Feed Loading          [ ] Pass  [ ] Fail
Test 8: Copy Trade Button           [ ] Pass  [ ] Fail
Test 9: Refresh Feed                [ ] Pass  [ ] Fail
Test 10: Multiple Wallets           [ ] Pass  [ ] Fail
Test 11: Keyboard Shortcuts         [ ] Pass  [ ] Fail
Test 12: Data Persistence           [ ] Pass  [ ] Fail
Test 13: Error Handling             [ ] Pass  [ ] Fail
Test 14: Empty States               [ ] Pass  [ ] Fail
```

---

## 🎯 Ready to Test!

Follow the steps above and check off each test as you complete it. If you encounter any issues, refer to the debugging section or check the console for error messages.

Good luck! 🚀

