# Troubleshooting Extension Load Errors

## Common "Failed to Load Extension" Issues

### 1. Check the Exact Error Message
- Open Chrome DevTools (F12)
- Go to `chrome://extensions/`
- Click "Errors" button on the extension card
- Look for the specific error message

### 2. Verify File Structure
Make sure you're loading the **`frontend`** folder, not the parent folder.

Required files in `frontend/`:
- ✅ `manifest.json`
- ✅ `popup.html`
- ✅ `popup.js`
- ✅ `backend-popup.js`
- ✅ `styles.css`
- ✅ `logo.png`

### 3. Common Issues and Fixes

#### Issue: "Manifest file is missing or unreadable"
**Fix:** Make sure you selected the `frontend` folder (not `QuackHacks_25`)

#### Issue: "Could not load manifest"
**Fix:** 
- Check `manifest.json` for JSON syntax errors
- Make sure there are no trailing commas
- Verify all file paths are correct

#### Issue: "Failed to load extension"
**Fix:**
1. Remove the extension completely
2. Reload the extension
3. Check the console for errors

#### Issue: Script errors
**Fix:**
1. Open the popup
2. Right-click → Inspect
3. Check Console tab for JavaScript errors

### 4. Step-by-Step Reload Process

1. Go to `chrome://extensions/`
2. Find "Polymates" extension
3. Click the **trash icon** to remove it
4. Click **"Load unpacked"**
5. Navigate to: `QuackHacks_25/frontend/`
6. Select the `frontend` folder
7. Click "Select Folder"

### 5. Verify Extension Loaded

After loading, you should see:
- ✅ Extension appears in the list
- ✅ Status shows "Enabled"
- ✅ No red error messages
- ✅ Extension icon appears in Chrome toolbar

### 6. Test the Extension

1. Click the extension icon in Chrome toolbar
2. Popup should open
3. If popup doesn't open:
   - Right-click extension icon → Inspect popup
   - Check Console for errors

### 7. Still Having Issues?

Share the exact error message from:
- `chrome://extensions/` → Click "Errors" button
- Or Console errors when opening popup

