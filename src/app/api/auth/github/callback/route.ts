import { NextRequest, NextResponse } from 'next/server';

/**
 * GitHub OAuth Callback Handler
 * Handles the callback from GitHub OAuth and exchanges code for access token
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Ensure baseUrl doesn't have a trailing slash
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}/?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token exchange error:', tokenData);
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    // Check if this is a Slack OAuth flow (state contains slack_user_id)
    let isSlackFlow = false;
    if (state) {
      try {
        // Decode state if it's URL encoded
        const decodedState = decodeURIComponent(state);
        const stateData = JSON.parse(decodedState);
        
        if (stateData.slack_user_id) {
          isSlackFlow = true;
          console.log('Detected Slack OAuth flow for user:', stateData.slack_user_id);
          
          // Store GitHub token for Slack user
          const { slackUserService } = await import('@/lib/slack-user-service');
          await slackUserService.storeGitHubAuth(stateData.slack_user_id, {
            access_token: accessToken,
            github_user: userData,
          });

          // Notify user in Slack
          try {
            const { slackAIService } = await import('@/lib/slack-ai-service');
            const targetChannel = stateData.channel_id || stateData.slack_user_id;
            
            await slackAIService.sendMessage(
              targetChannel,
              'GitHub Connected Successfully!',
              [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `✅ *GitHub Connected Successfully!*\n\n🔗 **Account:** ${userData.login}\n📧 **Email:** ${userData.email || 'Not provided'}`
                  }
                }
              ]
            );
          } catch (e) {
            console.error('Failed to send Slack notification:', e);
          }
        }
      } catch (e) {
        // Not a JSON state or not a Slack flow, ignore
        console.log('State is not valid JSON or not Slack flow:', e);
      }
    }

    // Create HTML page that stores token and redirects
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Authenticating...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #0a0a0a;
      color: #fff;
    }
    .container {
      text-align: center;
    }
    .spinner {
      border: 3px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      border-top: 3px solid #7f5af0;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Authentication successful!</h2>
    <p>${isSlackFlow ? 'You can close this window and return to Slack.' : 'Redirecting to dashboard...'}</p>
  </div>
  <script type="module">
    // Store tokens in sessionStorage
    sessionStorage.setItem('github_token', ${JSON.stringify(accessToken)});
    sessionStorage.setItem('github_user', ${JSON.stringify(JSON.stringify(userData))});
    
    // Import Firebase and sign in
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
    import { getAuth, signInWithCustomToken, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
    
    const firebaseConfig = {
      projectId: "studio-1512856463-cb519",
      appId: "1:809320154283:web:eb935fcf5224cd011fe3ee",
      apiKey: "AIzaSyAlySz07mx0GfgZhq9c-X0BMXBe-eBgoDQ",
      authDomain: "studio-1512856463-cb519.firebaseapp.com",
      messagingSenderId: "809320154283"
    };
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    // Sign in anonymously to Firebase (you can replace with custom token later)
    signInAnonymously(auth)
      .then(() => {
        console.log('Firebase auth successful');
        // Redirect to dashboard after Firebase auth
        setTimeout(() => {
          ${isSlackFlow ? 'window.close();' : "window.location.href = '/dashboard';"}
        }, 1500);
      })
      .catch((error) => {
        console.error('Firebase auth error:', error);
        // Still redirect to dashboard even if Firebase fails
        setTimeout(() => {
          ${isSlackFlow ? 'window.close();' : "window.location.href = '/dashboard';"}
        }, 1500);
      });
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/?error=callback_failed`);
  }
}
