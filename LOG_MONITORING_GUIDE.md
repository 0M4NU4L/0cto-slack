# 🚨 Localhost Log Monitoring System

This system allows you to monitor your localhost logs in real-time. When an error occurs, it uses AI to analyze the logs and automatically sends a notification to Slack and creates an incident in your dashboard.

## 🛠️ Setup

1. **Install Dependencies** (if not already installed):
   ```bash
   npm install dotenv
   ```

2. **Environment Variables**:
   Ensure your `.env.local` has:
   - `GOOGLE_GENAI_API_KEY`: For AI analysis.
   - `SLACK_BOT_TOKEN`: For sending notifications.
   - `SLACK_NOTIFICATIONS_CHANNEL`: Channel ID to post alerts (e.g., `C12345`).
   - `NEXT_PUBLIC_FIREBASE_*`: Firebase config for storing incidents.

## 🚀 How to Run

You need to run your application and pipe its output to `app.log`, while running the watcher in a separate terminal.

### Terminal 1: Run Your App
```bash
# Run Next.js and save logs to file
npm run dev > app.log 2>&1
```

### Terminal 2: Run the Watcher
```bash
# Run the log watcher script
npx tsx scripts/watch-logs.ts
```

## 🧪 How to Test

1. Start both terminals as described above.
2. Trigger an error in your application (e.g., visit a page that crashes or throw an error in code).
3. Watch the terminal running `watch-logs.ts`. You should see:
   - `🔥 Error detected!`
   - `🧠 Analyzing error with AI...`
   - `🚨 Critical issue confirmed...`
4. Check Slack for the notification.
5. Check your Firebase `incidents` collection.

## 🧠 How It Works

1. **Ingestion**: The `watch-logs.ts` script tails `app.log` in real-time.
2. **Detection**: It scans for keywords like "Error", "Exception", "Crash".
3. **Buffering**: It waits 5 seconds to collect the full stack trace.
4. **Analysis**: It sends the last 20 log lines to Google Gemini (via Genkit).
5. **Decision**: The AI decides if it's a real issue and determines severity/fix.
6. **Action**: If valid, it calls `IncidentService` to notify Slack and save to DB.
