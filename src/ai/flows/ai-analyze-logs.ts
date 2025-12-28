'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeLogsInputSchema = z.object({
  logs: z.array(z.string()).describe('The raw log lines to analyze.'),
  context: z.string().optional().describe('Additional context about the environment or recent actions.'),
});
export type AnalyzeLogsInput = z.infer<typeof AnalyzeLogsInputSchema>;

const AnalyzeLogsOutputSchema = z.object({
  is_error: z.boolean().describe('Whether the logs indicate a significant error or failure.'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('The severity of the issue.'),
  summary: z.string().describe('A concise summary of what went wrong.'),
  technical_details: z.string().describe('Technical explanation of the error (e.g., "NullReferenceException in UserService").'),
  suggested_fix: z.string().describe('Actionable steps or code changes to fix the issue.'),
});
export type AnalyzeLogsOutput = z.infer<typeof AnalyzeLogsOutputSchema>;

export async function aiAnalyzeLogs(input: AnalyzeLogsInput): Promise<AnalyzeLogsOutput | null> {
  return aiAnalyzeLogsFlow(input);
}

const analyzeLogsPrompt = ai.definePrompt({
  name: 'analyzeLogsPrompt',
  input: { schema: AnalyzeLogsInputSchema },
  output: { schema: AnalyzeLogsOutputSchema },
  prompt: `You are an expert DevOps and Site Reliability Engineer AI.
  
  Analyze the following server logs to identify errors, crashes, or anomalies.
  Focus on the most recent errors but use the surrounding logs for context.
  
  Logs:
  {{#each logs}}
  {{this}}
  {{/each}}
  
  {{#if context}}
  Context: {{context}}
  {{/if}}
  
  Determine:
  1. Is this a real error? (Ignore standard info/debug noise unless it indicates a failure).
  2. How severe is it?
  3. What is the root cause?
  4. How can it be fixed?
  `
});

export const aiAnalyzeLogsFlow = ai.defineFlow({
  name: 'aiAnalyzeLogsFlow',
  inputSchema: AnalyzeLogsInputSchema,
  outputSchema: AnalyzeLogsOutputSchema,
}, async (input) => {
  const result = await analyzeLogsPrompt(input);
  return result.output;
});
