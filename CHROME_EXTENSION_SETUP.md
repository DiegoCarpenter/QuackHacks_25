# Chrome Extension Setup & Testing Guide

## 🚀 Quick Start - Load Extension in Chrome

### Step 1: Open Chrome Extensions Page

1. Open Google Chrome browser
2. Type in the address bar: `chrome://extensions/`
3. Press Enter

### Step 2: Enable Developer Mode

1. Look for the toggle switch in the **top-right corner** that says "Developer mode"
2. **Turn it ON** (toggle to the right)
3. You should see additional options appear below

### Step 3: Load the Extension

1. Click the **"Load unpacked"** button (appears after enabling Developer mode)
2. Navigate to your project folder:
   ```
   C:\Users\shant\OneDrive\Desktop\QuackHacks BS\QuackHacks_25\frontend
   ```
3. **Select the `frontend` folder** (not the parent folder)
4. Click "Select Folder" or "Open"

### Step 4: Verify Extension Loaded

You should see:
- ✅ "Polymates" extension in the list
- ✅ Extension icon appears in Chrome toolbar (top right)
- ✅ No error messages (red text)
- ✅ Status shows "Enabled"

### Step 5: Set Up API Key (IMPORTANT!)

Before testing, you need to add your API key:

1. Open the file: `frontend/backend-popup.js`
2. Find the line: `const POLYMARKET_API_KEY = "YOUR_API_KEY_HERE";`
3. Replace `YOUR_API_KEY_HERE` with your actual API key: `019a88ec-4d56-757a-aad2-3b7d7e683b33`
4. Save the file
5. **Reload the extension** in Chrome:
   - Go back to `chrome://extensions/`
   - Find "Polymates" extension
   - Click the **reload icon** (circular arrow) on the extension card

---

## 🧪 Testing the Extension

### Open the Extension Popup

1. Click the **Polymates extension icon** in the Chrome toolbar (top right)
2. The popup window should open

### Test Basic Functionality

#### 1. **Check UI Loads**
- ✅ Header shows "Polymates" with subtitle
- ✅ Theme toggle button visible (🌙)
- ✅ Wallet input field visible
- ✅ "Add Wallet" button visible
- ✅ "Tracked Wallets" section visible
- ✅ "Trade Feed" section visible

#### 2. **Test Theme Toggle**
- Click the 🌙 button
- Theme should switch between light and dark
- Icon should change (🌙 ↔ ☀️)

#### 3. **Test Add Wallet**
1. Enter a wallet address in the input field:
   ```
   0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   ```
2. Click "Add Wallet" button
3. **Expected:**
   - ✅ Input field clears
   - ✅ Wallet appears in "Tracked Wallets" section
   - ✅ Wallet shown as shortened: `0x742d...0bEb`
   - ✅ "Remove" button appears
   - ✅ Loading indicator shows briefly
   - ✅ Trade feed updates (if wallet has trades)

#### 4. **Test Error Handling**
- Try adding an invalid address: `invalid-address`
- **Expected:** Error message appears: "Invalid wallet address format"
- Try adding the same wallet twice
- **Expected:** Error message: "Wallet already tracked"

#### 5. **Test Remove Wallet**
- Click "Remove" button next to a wallet
- **Expected:** Wallet disappears from list

#### 6. **Test Trade Feed**
- After adding a wallet with activity, wait for trades to load
- **Expected:**
   - ✅ Trade cards appear
   - ✅ Each card shows: market title, outcome, side, price, size, timestamp
   - ✅ "Copy Trade" button on each card

#### 7. **Test Copy Trade**
- Click "Copy Trade" button on any trade card
- **Expected:** New tab opens with Polymarket event page

#### 8. **Test Refresh**
- Click "Refresh" button
- **Expected:** Loading indicator shows, feed updates

---

## 🔍 Debugging

### Open Developer Tools

**Method 1:**
1. Right-click on the extension popup
2. Select "Inspect" or "Inspect popup"

**Method 2:**
1. Open the popup
2. Press `F12` (when popup is focused)

### Check Console for Errors

1. In DevTools, click the **Console** tab
2. Look for:
   - ❌ Red errors
   - ⚠️ Yellow warnings
   - ✅ Green success messages

**Common Console Messages:**
- `[Polymates Lite] Backend initializing...` - Good!
- `[Polymates Lite] Add wallet button found: [object HTMLButtonElement]` - Good!
- `Failed to load script` - Script path issue
- `renderWalletList is not a function` - Function not loaded

### Check Network Tab

1. In DevTools, click the **Network** tab
2. Add a wallet
3. Look for API request to `data-api.polymarket.com`
4. Check:
   - **Request URL:** Should include wallet address
   - **Request Headers:** Should have `Authorization: Bearer {API_KEY}`
   - **Status:** Should be `200` (success)
   - **Response:** Should be JSON array of trades

### Check localStorage

1. In DevTools, click **Application** tab
2. Expand **Local Storage**
3. Click on the extension URL
4. Check for:
   - `polymates_tracked_wallets` - Array of wallet addresses
   - `polymates_theme` - "light" or "dark"

---

## 🐛 Troubleshooting

### Issue: Extension doesn't load

**Symptoms:** Error when clicking "Load unpacked"

**Solutions:**
- Make sure you selected the `frontend` folder (not parent folder)
- Check that `manifest.json` exists in the folder
- Verify `popup.html` exists

### Issue: Popup doesn't open

**Symptoms:** Clicking extension icon does nothing

**Solutions:**
- Check `chrome://extensions/` for error messages
- Click "Errors" button on extension card
- Reload the extension

### Issue: "Failed to load script"

**Symptoms:** Console shows script loading errors

**Solutions:**
- Verify `backend-popup.js` exists in `frontend/` folder
- Check `popup.html` script paths are correct
- Make sure API key is set in `backend-popup.js`

### Issue: Add wallet button doesn't work

**Symptoms:** Clicking button does nothing

**Solutions:**
- Open DevTools Console
- Check for JavaScript errors
- Verify button element exists: `document.getElementById("add-wallet-btn")`
- Check if backend script loaded: Look for `[Polymates Lite] Backend initializing...` in console

### Issue: API calls fail (401/403)

**Symptoms:** "Failed to fetch trades" errors

**Solutions:**
- Verify API key is correct in `backend-popup.js`
- Check Network tab - look at request headers
- Make sure API key hasn't expired
- Verify `host_permissions` in `manifest.json` includes API domain

### Issue: No trades loading

**Symptoms:** Feed shows "No trades found"

**Solutions:**
- Verify wallet has recent trades on Polymarket
- Check Network tab for API response
- Try a different wallet address
- Check API response in Network tab (should be array of trades)

---

## 📋 Quick Test Checklist

- [ ] Extension loads without errors
- [ ] Popup opens when clicking icon
- [ ] Theme toggle works
- [ ] Add wallet button works
- [ ] Wallet appears in list after adding
- [ ] Invalid address shows error
- [ ] Remove wallet works
- [ ] Trades load (if wallet has activity)
- [ ] Copy Trade button opens Polymarket
- [ ] Refresh button works
- [ ] Data persists after closing/reopening popup

---

## 🎯 Expected First Run

When you first open the extension:

1. **Popup opens** ✅
2. **Theme loads** (light or dark based on preference) ✅
3. **"No wallets tracked yet"** message ✅
4. **"Add a wallet to start tracking trades"** in feed ✅
5. **No console errors** ✅

After adding a wallet:

1. **Wallet appears** in list ✅
2. **Loading indicator** shows ✅
3. **Trades load** (if wallet has activity) ✅
4. **Trade cards display** with all details ✅

---

## 💡 Tips

1. **Keep DevTools open** while testing to see errors immediately
2. **Check console first** if something doesn't work
3. **Reload extension** after making code changes (click reload icon in `chrome://extensions/`)
4. **Test with real wallet addresses** that have Polymarket activity
5. **Use Network tab** to verify API calls are working

---

## ✅ Success!

If all tests pass, your extension is working correctly! 🎉

