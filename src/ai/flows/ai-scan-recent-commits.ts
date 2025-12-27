'use server';

import { z } from 'genkit';
import { scanText, type SecretLeak } from '@/lib/security';

const AIScanRecentCommitsInputSchema = z.object({
  repoOwner: z.string(),
  repoName: z.string(),
  accessToken: z.string(),
});

export type AIScanRecentCommitsInput = z.infer<typeof AIScanRecentCommitsInputSchema>;

export type CommitLeak = {
  commitHash: string;
  commitUrl: string;
  author: string;
  message: string;
  leaks: SecretLeak[];
};

export async function aiScanRecentCommits(input: AIScanRecentCommitsInput): Promise<CommitLeak[]> {
  const { repoOwner, repoName, accessToken } = input;
  const leaksFound: CommitLeak[] = [];

  try {
    // 1. Fetch recent commits
    const commitsUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=5`;
    const commitsResponse = await fetch(commitsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!commitsResponse.ok) {
      console.error('Failed to fetch commits:', await commitsResponse.text());
      return [];
    }

    const commits = await commitsResponse.json();

    // 2. Analyze each commit
    for (const commit of commits) {
      const commitDetailUrl = commit.url; // API URL for the specific commit
      const detailResponse = await fetch(commitDetailUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!detailResponse.ok) continue;

      const commitDetail = await detailResponse.json();
      const commitLeaks: SecretLeak[] = [];

      // Scan commit message
      const messageScan = await scanText(commitDetail.commit.message, 'commit');
      if (messageScan.isLeak) {
        commitLeaks.push(...messageScan.leaks);
      }

      // Scan file patches
      if (commitDetail.files) {
        for (const file of commitDetail.files) {
          if (file.patch) {
            const patchScan = await scanText(file.patch, 'commit');
            if (patchScan.isLeak) {
                // Add file context
                const fileLeaks = patchScan.leaks.map(l => ({
                    ...l,
                    file: file.filename,
                    context: `Found in ${file.filename}`
                }));
                commitLeaks.push(...fileLeaks);
            }
          }
        }
      }

      if (commitLeaks.length > 0) {
        leaksFound.push({
          commitHash: commit.sha,
          commitUrl: commit.html_url,
          author: commit.commit.author.name,
          message: commit.commit.message,
          leaks: commitLeaks,
        });
      }
    }
  } catch (error) {
    console.error('Error scanning commits:', error);
  }

  return leaksFound;
}
