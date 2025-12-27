# 0cto - AI-Powered Development Assistant

0cto is an AI teammate that listens to developer conversations in Slack and turns ideas into actionable GitHub issues instantly.

## Features

- 🤖 **AI-Powered Analysis**: Automatically detects potential issues and feature requests from team conversations
- 💬 **Slack Integration**: Works seamlessly in your Slack workspace with slash commands and mentions
- 🔄 **GitHub Integration**: Creates GitHub issues directly from Slack conversations
- 🎯 **Smart Detection**: Uses advanced AI to understand context and priority
- 📊 **Dashboard**: Web interface for managing repositories and configurations

## Slack Integration

0cto includes a fully-featured Slack app that enables:

### Slash Commands
- `/0cto analyze` - Analyze recent channel messages for potential issues
- `/0cto create-issue` - Create a new GitHub issue with guided modal
- `/0cto help` - Show available commands and usage

### Bot Mentions
- Mention `@0cto` in any channel for assistance
- Automatic issue detection in conversations
- Interactive buttons and forms for issue creation

### Setup
See [SLACK_SETUP_GUIDE.md](./SLACK_SETUP_GUIDE.md) for detailed Slack app configuration instructions.

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hackspire_2025
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # Add your Firebase, GitHub, and Slack credentials
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

5. **Configure Slack app** (optional)
   Follow the [Slack Setup Guide](./SLACK_SETUP_GUIDE.md)

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **AI**: Google Genkit for AI flows and processing
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Integrations**: Slack API, GitHub API
- **Deployment**: Vercel/Firebase Hosting