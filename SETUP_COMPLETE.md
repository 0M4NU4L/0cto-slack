# 🚀 Quick Setup - Get Your Project Running

## ✅ Status: Your dev server is RUNNING on http://localhost:9002

## 🔑 Step 1: Get GitHub Personal Access Token (Required)

### Generate Token:
1. Visit: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name: `0cto Development`
4. Expiration: 90 days (or your preference)
5. Select scopes:
   - ✅ **repo** - Full control of private repositories
   - ✅ **user:email** - Access user email addresses
   - ✅ **read:org** - Read org and team membership
6. Click **"Generate token"**
7. **COPY THE TOKEN** (shown only once!)
8. Update `.env.local`:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   ```

## 🔐 Step 2: Fix GitHub OAuth Login (Required)

### Update OAuth App Callback URL:
1. Go to: https://github.com/settings/developers
2. Find OAuth App: `Ov23liay5Sgf2MtsWEtz`
3. Click on it
4. Update **Authorization callback URL** to:
   ```
   http://localhost:9002/api/auth/github/callback
   ```
5. Click **"Update application"**

### ✨ That's it! OAuth is now fixed and will work.

## 🧪 Step 3: Test Everything

1. **Dev server is already running at:** http://localhost:9002
2. **Click "Login with GitHub"**
3. **Authorize on GitHub**
4. **You'll be redirected to dashboard**

## 🤖 Step 4: Add Google AI API Key (Optional but recommended)

For AI features to work:
1. Get API key: https://aistudio.google.com/app/apikey
2. Update `.env.local`:
   ```
   GOOGLE_GENAI_API_KEY=your_api_key_here
   ```
3. Restart server: `Ctrl+C` then `pnpm dev`

## 📋 What Was Fixed:

✅ **TypeScript errors** - Fixed kanban-board.tsx and repo-list.tsx
✅ **Environment variables** - Configured .env.local with your credentials
✅ **GitHub OAuth** - Created direct OAuth flow (no Firebase Auth needed)
✅ **OAuth callback** - New API route at `/api/auth/github/callback`
✅ **Token storage** - Secure sessionStorage implementation
✅ **Dev server** - Running on port 9002

## 🎯 Current Configuration:

- **GitHub Client ID**: Ov23liQ5PzD7Ng813Kvu ✅
- **GitHub Client Secret**: 68df4a33a98d937e437ed4a0ad1e9775453255d9 ✅
- **GitHub Token**: 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 ✅
- **Callback URL**: http://localhost:9002/api/auth/github/callback
- **Firebase Project**: studio-1512856463-cb519 ✅
- **Port**: 9002 ✅

## ⚠️ CRITICAL: Update Your GitHub OAuth App

**You MUST update the callback URL in your GitHub OAuth app:**

1. Go to: https://github.com/settings/developers
2. Find OAuth App with Client ID: **Ov23liQ5PzD7Ng813Kvu**
3. Click on it
4. Update **Authorization callback URL** to EXACTLY:
   ```
   http://localhost:9002/api/auth/github/callback
   ```
5. Click **"Update application"**

**Why this is important:**
The OAuth flow will FAIL if the callback URL doesn't match exactly. Currently it might be pointing to Firebase's handler, which is why you're seeing the wrong URL.

## ⚡ Quick Commands:

```powershell
# Start dev server (if not running)
pnpm dev

# Check for errors
pnpm typecheck

# Build for production
pnpm build
```

## 🐛 Troubleshooting:

**OAuth Error "redirect_uri mismatch":**
- Make sure callback URL is exactly: `http://localhost:9002/api/auth/github/callback`
- Check your GitHub OAuth app settings

**Can't access GitHub repos:**
- Generate and add GITHUB_TOKEN to .env.local
- Make sure token has `repo` scope

**AI features not working:**
- Add GOOGLE_GENAI_API_KEY to .env.local
- Restart dev server

---

🎉 **Ready to go! Visit http://localhost:9002 and login with GitHub!**
