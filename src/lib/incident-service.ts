import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { SlackAIService } from './slack-ai-service';
import { AnalyzeLogsOutput } from '@/ai/flows/ai-analyze-logs';

// Initialize Firebase
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export interface Incident {
  id?: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  technical_details: string;
  suggested_fix: string;
  raw_logs: string[];
  created_at: Timestamp;
  status: 'open' | 'investigating' | 'resolved';
  source: 'localhost' | 'production';
}

export class IncidentService {
  private slackService: SlackAIService;

  constructor() {
    this.slackService = new SlackAIService();
  }

  async createIncident(analysis: AnalyzeLogsOutput, rawLogs: string[]) {
    try {
      // 1. Save to Firestore
      const incidentData: Omit<Incident, 'id'> = {
        summary: analysis.summary,
        severity: analysis.severity,
        technical_details: analysis.technical_details,
        suggested_fix: analysis.suggested_fix,
        raw_logs: rawLogs,
        created_at: Timestamp.now(),
        status: 'open',
        source: 'localhost'
      };

      const docRef = await addDoc(collection(db, 'incidents'), incidentData);
      console.log(`🚨 Incident created with ID: ${docRef.id}`);

      // 2. Notify Slack
      const channelId = process.env.SLACK_NOTIFICATIONS_CHANNEL || 'general';
      
      const colorMap = {
        low: '#36a64f',
        medium: '#ecb22e',
        high: '#e01e5a',
        critical: '#ff0000'
      };

      await this.slackService.sendMessage(
        channelId,
        `🚨 *New Incident Detected* (${analysis.severity.toUpperCase()})`,
        [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 Incident: ${analysis.summary}`,
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Severity:*\n${analysis.severity.toUpperCase()}`
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\nOpen`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Technical Details:*\n${analysis.technical_details}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Suggested Fix:*\n${analysis.suggested_fix}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `ID: ${docRef.id} | Source: Localhost Monitor`
              }
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Dashboard',
                  emoji: true
                },
                url: `${process.env.NEXTAUTH_URL}/dashboard/incidents/${docRef.id}`
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Acknowledge',
                  emoji: true
                },
                action_id: 'acknowledge_incident',
                value: docRef.id
              }
            ]
          }
        ]
      );

    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  }
}

export const incidentService = new IncidentService();
