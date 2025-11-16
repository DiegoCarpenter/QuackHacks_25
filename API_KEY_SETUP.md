# API Key Setup Guide

## 🔑 Getting Your API Key

1. Visit the Polymarket API documentation
2. Sign up or log in to get your API key
3. Copy your API key

## 📝 Setting Up the API Key

### Option 1: For Development (frontend/backend-popup.js)

1. The file `frontend/backend-popup.js` is gitignored and contains your actual key
2. If you don't have it, copy from example:
   ```bash
   cp frontend/backend-popup.js.example frontend/backend-popup.js
   ```
3. Open `frontend/backend-popup.js`
4. Replace `YOUR_API_KEY_HERE` with your actual API key
5. Save the file

### Option 2: For Backend Reference (backend/popup.js)

The `backend/popup.js` file uses a placeholder. If you need to test with it:
1. Open `backend/popup.js`
2. Replace `YOUR_API_KEY_HERE` with your actual API key
3. **Note:** This file is tracked in git, so don't commit your real key here

## ✅ Verification

After setting up your API key:
1. Load the extension in Chrome
2. Try adding a wallet
3. Check the Network tab in DevTools
4. Verify the Authorization header includes your API key
5. Check that API calls return 200 status (not 401/403)

## 🚨 Security Reminders

- ✅ `frontend/backend-popup.js` is gitignored - safe to have real key
- ⚠️ `backend/popup.js` is tracked - use placeholder only
- ✅ Never commit files with real API keys
- ✅ Rotate keys if accidentally exposed

