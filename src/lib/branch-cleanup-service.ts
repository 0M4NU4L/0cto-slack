import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { safeGithubCall } from './mcp/github-client';
import { SlackAIService } from './slack-ai-service';

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export interface MergedBranch {
  id?: string;
  repo_owner: string;
  repo_name: string;
  branch_name: string;
  pr_number: number;
  merged_at: Timestamp;
  merged_by: string;
  status: 'pending' | 'scheduled' | 'archived' | 'kept';
  scheduled_archive_at?: Timestamp;
  slack_channel_id?: string;
  slack_message_ts?: string;
}

export class BranchCleanupService {
  private slackService: SlackAIService;

  constructor() {
    this.slackService = new SlackAIService();
  }

  /**
   * Record a merged branch from a webhook event
   */
  async recordMergedBranch(data: Omit<MergedBranch, 'status' | 'id'>) {
    // Check if already exists
    const q = query(
      collection(db, 'merged_branches'),
      where('repo_owner', '==', data.repo_owner),
      where('repo_name', '==', data.repo_name),
      where('branch_name', '==', data.branch_name),
      where('status', '!=', 'archived') // Don't care if it was previously archived
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      console.log(`Branch ${data.branch_name} already tracked.`);
      return;
    }

    // Safety check: Don't track protected branches
    if (this.isProtectedBranch(data.branch_name)) {
      console.log(`Skipping protected branch: ${data.branch_name}`);
      return;
    }

    await addDoc(collection(db, 'merged_branches'), {
      ...data,
      status: 'pending',
      created_at: Timestamp.now()
    });
    
    console.log(`Recorded merged branch: ${data.branch_name}`);
  }

  /**
   * Check for branches that need to be scheduled for archive
   * (Merged > 7 days ago)
   */
  async checkPendingBranches() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q = query(
      collection(db, 'merged_branches'),
      where('status', '==', 'pending'),
      where('merged_at', '<=', Timestamp.fromDate(sevenDaysAgo))
    );

    const snapshot = await getDocs(q);
    
    for (const docSnap of snapshot.docs) {
      const branch = docSnap.data() as MergedBranch;
      await this.scheduleArchive(docSnap.id, branch);
    }
  }

  /**
   * Check for branches that are scheduled and ready to be archived
   */
  async checkScheduledBranches() {
    const now = new Date();
    
    const q = query(
      collection(db, 'merged_branches'),
      where('status', '==', 'scheduled'),
      where('scheduled_archive_at', '<=', Timestamp.fromDate(now))
    );

    const snapshot = await getDocs(q);
    
    for (const docSnap of snapshot.docs) {
      const branch = docSnap.data() as MergedBranch;
      await this.executeArchive(docSnap.id, branch);
    }
  }

  /**
   * Schedule a branch for archive and notify Slack
   */
  private async scheduleArchive(docId: string, branch: MergedBranch) {
    // Double check safety
    if (this.isProtectedBranch(branch.branch_name)) {
      await updateDoc(doc(db, 'merged_branches', docId), { status: 'kept' });
      return;
    }

    // Check for labels (requires fetching PR again, or we assume we stored it? 
    // For now, let's assume we check labels during the initial webhook or here if we had the token)
    // Skipping label check for now as we don't have the token easily accessible here without user context,
    // but in a real app we'd use an installation token.

    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 24);

    // Send Slack Notification
    // We need a channel to post to. Ideally, this comes from the repo settings or a default channel.
    // For now, we'll try to find a channel or use a default.
    // Assuming we have a way to map repo to channel, or just use a default 'general' or from env.
    const channelId = process.env.SLACK_NOTIFICATIONS_CHANNEL || 'general'; 

    try {
      const message = await this.slackService.sendMessage(
        channelId,
        `🧹 Branch cleanup scheduled for \`${branch.branch_name}\``,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🧹 *Branch cleanup scheduled for* \`${branch.branch_name}\`\nMerged 7 days ago (PR #${branch.pr_number})\nArchiving in 24h.\n\nReply \`keep\` to cancel.`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Keep Branch',
                  emoji: true
                },
                value: `keep_branch_${docId}`,
                action_id: 'keep_branch_action'
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Archive Now',
                  emoji: true
                },
                value: `archive_branch_${docId}`,
                action_id: 'archive_branch_now_action'
              }
            ]
          }
        ]
      );

      if (message && message.ok) {
        await updateDoc(doc(db, 'merged_branches', docId), {
          status: 'scheduled',
          scheduled_archive_at: Timestamp.fromDate(scheduledTime),
          slack_channel_id: message.channel,
          slack_message_ts: message.ts
        });
      } else {
        console.error('Failed to send Slack notification, message object:', message);
      }

    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Execute the archive (rename)
   */
  async executeArchive(docId: string, branch: MergedBranch) {
    const oldBranchName = branch.branch_name;
    const newBranchName = `archived/${oldBranchName}`;

    try {
      // 1. Get the SHA of the old branch
      // We need an installation token. For this demo, we might rely on a global token or similar.
      // In a real app, we'd fetch the installation token for the repo owner.
      const token = process.env.GITHUB_TOKEN; 
      if (!token) throw new Error("No GitHub token available");

      // Get ref
      const getRefRes = await fetch(`https://api.github.com/repos/${branch.repo_owner}/${branch.repo_name}/git/ref/heads/${oldBranchName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!getRefRes.ok) {
        if (getRefRes.status === 404) {
          console.log(`Branch ${oldBranchName} not found, maybe already deleted.`);
          await updateDoc(doc(db, 'merged_branches', docId), { status: 'archived' });
          return;
        }
        throw new Error(`Failed to get ref: ${getRefRes.statusText}`);
      }

      const refData = await getRefRes.json();
      const sha = refData.object.sha;

      // 2. Create new ref
      const createRefRes = await fetch(`https://api.github.com/repos/${branch.repo_owner}/${branch.repo_name}/git/refs`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${newBranchName}`,
          sha: sha
        })
      });

      if (!createRefRes.ok && createRefRes.status !== 422) { // 422 means already exists
         throw new Error(`Failed to create ref: ${createRefRes.statusText}`);
      }

      // 3. Delete old ref
      const deleteRefRes = await fetch(`https://api.github.com/repos/${branch.repo_owner}/${branch.repo_name}/git/refs/heads/${oldBranchName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!deleteRefRes.ok) {
         throw new Error(`Failed to delete old ref: ${deleteRefRes.statusText}`);
      }

      // Update DB
      await updateDoc(doc(db, 'merged_branches', docId), { status: 'archived' });

      // Notify Slack
      if (branch.slack_channel_id) {
        await this.slackService.sendMessage(
          branch.slack_channel_id,
          `✅ Branch archived automatically by GitPulse: \`${oldBranchName}\` → \`${newBranchName}\``
        );
      }

    } catch (error) {
      console.error(`Failed to archive branch ${oldBranchName}:`, error);
      // Optionally update status to error or retry
    }
  }

  /**
   * Archive a branch by ID (for manual trigger)
   */
  async archiveBranchById(docId: string) {
    const snap = await getDoc(doc(db, 'merged_branches', docId));
    if (!snap.exists()) return;
    
    const branch = snap.data() as MergedBranch;
    await this.executeArchive(docId, branch);
  }

  /**
   * Handle "Keep" action
   */
  async keepBranch(docId: string) {
    await updateDoc(doc(db, 'merged_branches', docId), { status: 'kept' });
    
    const snap = await getDoc(doc(db, 'merged_branches', docId));
    const data = snap.data() as MergedBranch;

    if (data.slack_channel_id && data.slack_message_ts) {
       // Update the message to remove buttons and show "Kept"
       // This requires chat.update which might be in SlackAIService or we call fetch directly
       // For now, just post a confirmation
       await this.slackService.sendMessage(
         data.slack_channel_id,
         `🛡️ Branch \`${data.branch_name}\` will be kept.`
       );
    }
  }

  private isProtectedBranch(branchName: string): boolean {
    return /^release\/.*$/.test(branchName) || 
           /^hotfix\/.*$/.test(branchName) || 
           ['main', 'master', 'develop', 'production'].includes(branchName);
  }
  
  /**
   * Get stale branches for on-demand list
   */
  async getStaleBranches() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q = query(
      collection(db, 'merged_branches'),
      where('status', '==', 'pending'),
      where('merged_at', '<=', Timestamp.fromDate(sevenDaysAgo))
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MergedBranch));
  }
}

export const branchCleanupService = new BranchCleanupService();
