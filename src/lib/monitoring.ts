
export type Incident = {
  id: string;
  serviceName: string;
  status: 'down' | 'degraded' | 'healthy';
  errorSummary?: string;
  lastCommit?: {
    hash: string;
    author: string;
    message: string;
  };
  timestamp: number;
};

export type HealthResult = {
  healthy: boolean;
  statusCode: number;
  latency: number;
};

// Mock monitoring service
export async function checkHealth(url: string): Promise<HealthResult> {
  // In a real app, this would fetch(url)
  // For demo, we simulate a check
  return {
    healthy: true,
    statusCode: 200,
    latency: 45,
  };
}

export async function analyzeLog(logSnippet: string): Promise<string> {
  // Mock AI analysis
  // In real app: await gemini.analyzeLog(logSnippet);
  if (logSnippet.includes('ConnectionRefused')) {
    return "Database connection failed. Likely caused by missing environment variables in the recent deployment.";
  }
  if (logSnippet.includes('NullPointerException')) {
    return "Uncaught exception in auth handler. User object was null.";
  }
  return "Unknown error pattern. Check system logs.";
}
