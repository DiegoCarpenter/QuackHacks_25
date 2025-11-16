# Security & API Key Management

## ⚠️ Important: API Key Security

The Polymarket API key is **sensitive information** and should **NEVER** be committed to version control.

## 🔒 Files with API Keys

The following files contain the API key and are **excluded from git**:

- `frontend/backend-popup.js` - Contains actual API key (gitignored)
- `popup.js` - Root level file (gitignored)

## 📋 Setup Instructions

### For Development:

1. **Copy the example file:**
   ```bash
   cp frontend/backend-popup.js.example frontend/backend-popup.js
   ```

2. **Add your API key:**
   - Open `frontend/backend-popup.js`
   - Replace `YOUR_API_KEY_HERE` with your actual Polymarket API key
   - Save the file

3. **Verify it's gitignored:**
   ```bash
   git status
   # frontend/backend-popup.js should NOT appear in the list
   ```

### For Production:

- Never commit files with real API keys
- Use environment variables or secure configuration management
- Rotate API keys if they're accidentally exposed

## ✅ Gitignore Protection

The following patterns are in `.gitignore`:

```
# API Keys and sensitive configuration
*.key
*.secret
config.js
secrets.js
.env.local
.env.production
frontend/backend-popup.js
popup.js
```

## 🔍 Verify API Key is Protected

Check if files are ignored:
```bash
git check-ignore frontend/backend-popup.js
# Should return: frontend/backend-popup.js
```

If a file with an API key was already committed:
1. Remove it from git tracking: `git rm --cached frontend/backend-popup.js`
2. Add it to .gitignore
3. Commit the .gitignore change
4. Rotate the API key if it was exposed

## 📝 Template File

`frontend/backend-popup.js.example` is a template file that:
- Contains placeholder `YOUR_API_KEY_HERE`
- Can be safely committed to git
- Shows the structure without exposing secrets

## 🚨 If API Key is Exposed

1. **Immediately rotate the API key** in Polymarket dashboard
2. Remove the key from git history (if already committed)
3. Update all local copies with the new key
4. Review git history to see if it was pushed to remote

