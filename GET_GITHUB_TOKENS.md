# GitHub Token & OAuth Setup Guide

## Part 1: Get GitHub Personal Access Token

### Step 1: Generate Personal Access Token
1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `0cto Development`
4. Set expiration: Choose your preference (recommend: 90 days or No expiration for development)
5. Select scopes:
   - ✅ **repo** (Full control of private repositories)
   - ✅ **user:email** (Access user email addresses)
   - ✅ **read:org** (Read org and team membership)
6. Click **"Generate token"**
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
8. Paste it in your `.env.local` as `GITHUB_TOKEN`

### Step 2: Webhook Secret (Optional)
The webhook secret is only needed if you're setting up GitHub webhooks. For now, you can use any random string:
```bash
# Generate a random secret (PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Or just use: `your_random_secret_here_12345`

## Part 2: Fix GitHub OAuth Login

### The Problem
Your app uses Firebase Authentication for GitHub OAuth, but you need to configure it properly.

### Solution: Direct GitHub OAuth (No Firebase Auth needed for GitHub)

I'll create a custom OAuth flow that works directly with your GitHub OAuth app.

### Your GitHub OAuth App Settings
1. Go to: https://github.com/settings/developers
2. Find your OAuth App (Client ID: `Ov23liay5Sgf2MtsWEtz`)
3. **IMPORTANT**: Update the **Authorization callback URL** to:
   ```
   http://localhost:9002/api/auth/github/callback
   ```
   
4. Click **"Update application"**

### Test the OAuth Flow
1. Start your dev server: `pnpm dev`
2. Go to http://localhost:9002
3. Click "Login with GitHub"
4. Authorize the app on GitHub
5. You'll be redirected back and logged in!
