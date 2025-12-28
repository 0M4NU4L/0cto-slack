import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { aiAnalyzeLogs } from '../src/ai/flows/ai-analyze-logs';
import { incidentService } from '../src/lib/incident-service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const LOG_FILE = 'app.log';
const BUFFER_SIZE = 20; // Keep last 20 lines for context
const DEBOUNCE_MS = 5000; // Wait 5s after error to collect full stack trace

class LogWatcher {
  private buffer: string[] = [];
  private isAnalyzing = false;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(private filePath: string) {}

  start() {
    console.log(`👀 Watching logs at ${this.filePath}...`);
    
    // Ensure file exists
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '');
    }

    // Tail the file
    // Using fs.watchFile or chokidar is good, but for simple tailing:
    let fileSize = fs.statSync(this.filePath).size;

    fs.watchFile(this.filePath, { interval: 500 }, (curr, prev) => {
      if (curr.mtime <= prev.mtime) return;

      const newSize = curr.size;
      if (newSize < fileSize) {
        // File truncated
        fileSize = newSize;
        return;
      }

      const stream = fs.createReadStream(this.filePath, {
        start: fileSize,
        end: newSize
      });

      stream.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) this.processLine(line);
        });
      });

      fileSize = newSize;
    });
  }

  private processLine(line: string) {
    console.log(`[LOG] ${line}`);
    this.buffer.push(line);
    if (this.buffer.length > BUFFER_SIZE) {
      this.buffer.shift();
    }

    // Check for error patterns
    if (this.isError(line)) {
      console.log('🔥 Error detected! Waiting for stack trace...');
      this.triggerAnalysis();
    }
  }

  private isError(line: string): boolean {
    const lower = line.toLowerCase();
    return (
      lower.includes('error') ||
      lower.includes('exception') ||
      lower.includes('fail') ||
      lower.includes('crash') ||
      lower.includes('unhandled rejection')
    ) && !lower.includes('node_modules'); // Ignore some noise if needed
  }

  private triggerAnalysis() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(async () => {
      if (this.isAnalyzing) return;
      this.isAnalyzing = true;

      console.log('🧠 Analyzing error with AI...');
      
      try {
        const logsToAnalyze = [...this.buffer];
        const analysis = await aiAnalyzeLogs({
          logs: logsToAnalyze,
          context: 'Localhost development environment. Next.js application.'
        });

        if (analysis && analysis.is_error && analysis.severity !== 'low') {
          console.log('🚨 Critical issue confirmed by AI. Creating incident...');
          await incidentService.createIncident(analysis, logsToAnalyze);
        } else {
          console.log('✅ AI dismissed it as noise or low severity.');
        }

      } catch (error) {
        console.error('Failed to analyze logs:', error);
      } finally {
        this.isAnalyzing = false;
      }
    }, DEBOUNCE_MS);
  }
}

// Start the watcher
const watcher = new LogWatcher(path.resolve(process.cwd(), LOG_FILE));
watcher.start();

// Keep process alive
process.stdin.resume();
