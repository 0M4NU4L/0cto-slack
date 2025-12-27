# 🧹 Branch Hygiene System Setup Guide

## 1. Deploy to Vercel
The "405 Method Not Allowed" error happens because the new webhook code hasn't been deployed to your live server yet.

1. **Commit and Push** your changes:
   ```bash
   git add .
   git commit -m "Add branch hygiene system"
   git push
   ```
2. Wait for Vercel to finish building.

## 2. Configure Environment Variables
Go to **Vercel Dashboard** → **Settings** → **Environment Variables** and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `CRON_SECRET` | `your-random-secret-key` | A secure random string to protect the cron endpoint. |
| `SLACK_NOTIFICATIONS_CHANNEL` | `C12345678` | (Optional) Channel ID for cleanup notifications. Defaults to 'general'. |

## 3. Configure GitHub Secrets
Go to your **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions** and add:

| Secret | Value |
|--------|-------|
| `CRON_SECRET` | Same value as in Vercel |
| `NEXTAUTH_URL` | `https://0cto-slack.vercel.app` |

## 4. Verify Webhook
1. Go to **GitHub Repository Settings** → **Webhooks**.
2. Edit the webhook for `https://0cto-slack.vercel.app/api/github/webhooks`.
3. Ensure **Content type** is `application/json`.
4. Under **Which events would you like to trigger this webhook?**, select **Let me select individual events** and check:
   - **Pull requests**
   - (Optional) **Pushes** (The handler will ignore them but return 200 OK)
5. Click **Update webhook**.
6. Check the **Recent Deliveries** tab. You can redeliver a failed payload to test.

## 5. Test the Cron Job
1. Go to the **Actions** tab in your GitHub repository.
2. Select **Branch Cleanup Cron** from the left sidebar.
3. Click **Run workflow** to trigger it manually.
4. Check the logs to ensure it called the endpoint successfully (HTTP 200).

## 6. Test On-Demand Cleanup
In Slack, run:
```
/0cto cleanup branches
```
(Note: This will only show branches merged more than 7 days ago).
