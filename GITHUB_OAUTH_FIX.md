# GitHub OAuth Configuration Guide

## Issue
The GitHub OAuth login is currently using Firebase Authentication's GitHub provider, but the client IDs don't match. You have two options:

## Option 1: Update Firebase Authentication Settings (Recommended)

1. **Go to Firebase Console**: https://console.firebase.google.com/project/studio-1512856463-cb519/authentication/providers

2. **Enable GitHub Provider**:
   - Click on "GitHub" in the Sign-in providers list
   - Enable the provider
   - Add your GitHub OAuth credentials:
     - **Client ID**: `Ov23liay5Sgf2MtsWEtz`
     - **Client Secret**: `a759b190ece99f379c388bd664de4c505596a2cc`
   - Click "Save"

3. **Update GitHub OAuth App Settings**:
   - Go to: https://github.com/settings/developers
   - Find your OAuth app with Client ID `Ov23liay5Sgf2MtsWEtz`
   - Update the **Authorization callback URL** to:
     ```
     https://studio-1512856463-cb519.firebaseapp.com/__/auth/handler
     ```
   - Also add for local development:
     ```
     http://localhost:9002/__/auth/handler
     ```

## Option 2: Use Direct GitHub OAuth (Without Firebase Auth)

If you prefer to handle GitHub OAuth directly without Firebase:

1. Update the authorization callback URL in your GitHub OAuth app to:
   ```
   http://localhost:9002/api/auth/callback/github
   ```

2. Create a custom API route handler (see implementation below)

## Current Configuration

- **Firebase Project**: studio-1512856463-cb519
- **Firebase Auth Handler**: https://studio-1512856463-cb519.firebaseapp.com/__/auth/handler
- **Your GitHub Client ID**: Ov23liay5Sgf2MtsWEtz
- **Your GitHub Client Secret**: a759b190ece99f379c388bd664de4c505596a2cc

## Testing

After configuration:

1. Start the dev server: `pnpm dev`
2. Navigate to http://localhost:9002
3. Click "Login with GitHub"
4. You should be redirected to GitHub for authorization
5. After authorization, you'll be redirected back to the dashboard

## Troubleshooting

- **Error: "The redirect_uri MUST match"**: Update the callback URL in your GitHub OAuth app settings
- **Error: "Invalid client_id"**: Make sure the client ID in Firebase matches your GitHub OAuth app
- **Token not saved**: Check browser console for errors and verify sessionStorage is working
