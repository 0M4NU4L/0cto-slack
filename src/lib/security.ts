
export type SecretLeak = {
  type: 'aws' | 'github' | 'generic' | 'private_key';
  severity: 'critical' | 'high' | 'medium';
  detectedValue: string;
  context: string; // e.g., "Found in commit a1b2c" or "Found in message"
  file?: string;
  line?: number;
};

export type ScanResult = {
  isLeak: boolean;
  leaks: SecretLeak[];
};

const PATTERNS = {
  aws: /(AKIA|ASIA)[A-Z0-9]{16}/,
  github: /gh[pousr]_[a-zA-Z0-9]{36}/,
  private_key: /-----BEGIN [A-Z]+ PRIVATE KEY-----/,
  generic: /(api[ _-]?key|token|secret)\s*(is|:|=)\s*['"]?([a-zA-Z0-9]{30,})['"]?/i,
};

export async function scanText(text: string, source: 'chat' | 'commit' = 'chat'): Promise<ScanResult> {
  const leaks: SecretLeak[] = [];

  // 1. Regex Scanning
  if (PATTERNS.aws.test(text)) {
    leaks.push({
      type: 'aws',
      severity: 'critical',
      detectedValue: text.match(PATTERNS.aws)?.[0] || 'AWS Key',
      context: source === 'chat' ? 'Message content' : 'Commit diff',
    });
  }
  
  if (PATTERNS.github.test(text)) {
    leaks.push({
      type: 'github',
      severity: 'high',
      detectedValue: text.match(PATTERNS.github)?.[0] || 'GitHub Token',
      context: source === 'chat' ? 'Message content' : 'Commit diff',
    });
  }

  if (PATTERNS.private_key.test(text)) {
    leaks.push({
      type: 'private_key',
      severity: 'critical',
      detectedValue: 'Private Key Block',
      context: source === 'chat' ? 'Message content' : 'Commit diff',
    });
  }

  const genericMatch = text.match(PATTERNS.generic);
  if (genericMatch) {
     leaks.push({
      type: 'generic',
      severity: 'high',
      detectedValue: genericMatch[3] || 'API Key', // Capture group 3 is the key
      context: source === 'chat' ? 'Message content' : 'Commit diff',
    });
  }

  // 2. AI Intent Check (Mocked for demo stability, but structure is ready for Gemini)
  // In a real implementation, we would call: await gemini.analyzeSecretIntent(text, leaks);
  // For now, we assume if it matches a pattern, it's a leak unless it looks like a placeholder.
  
  const filteredLeaks = leaks.filter(leak => {
    const val = leak.detectedValue;
    // Simple heuristic: if it contains "EXAMPLE" or "TEST", ignore it
    // if (val.includes('EXAMPLE') || text.includes('test-key')) return false;
    return true;
  });

  return {
    isLeak: filteredLeaks.length > 0,
    leaks: filteredLeaks,
  };
}

export function maskSecret(text: string, leaks: SecretLeak[]): string {
  let masked = text;
  leaks.forEach(leak => {
    if (leak.detectedValue && leak.detectedValue.length > 4) {
        masked = masked.replace(leak.detectedValue, '********' + leak.detectedValue.slice(-4));
    }
  });
  return masked;
}
