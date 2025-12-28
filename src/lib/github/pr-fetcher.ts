"use client";

import OctokitClient from "./octokit-client";

export interface PullRequest {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  author: {
    login: string;
    avatar: string;
  };
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  closedAt?: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: Array<{ name: string; color: string }>;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  draft: boolean;
  mergeable?: boolean;
  body?: string;
}

export interface PRFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PRDetails extends PullRequest {
  files: PRFile[];
  commitsCount: number;
  reviewsCount: number;
}

export async function fetchPullRequests(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "all",
  limit: number = 50
): Promise<PullRequest[]> {
  const client = OctokitClient.getInstance();
  const octokit = client.getOctokit();

  try {
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo,
      state,
      sort: "updated",
      direction: "desc",
      per_page: Math.min(limit, 100),
    });

    return prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.merged_at ? "merged" : (pr.state as "open" | "closed"),
      author: {
        login: pr.user?.login || "unknown",
        avatar: pr.user?.avatar_url || "",
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at || undefined,
      closedAt: pr.closed_at || undefined,
      // These fields are not returned by pulls.list, only by pulls.get
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      labels: pr.labels.map((l) => ({
        name: typeof l === "string" ? l : l.name || "",
        color: typeof l === "string" ? "666" : l.color || "666",
      })),
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha,
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha,
      },
      draft: pr.draft || false,
      mergeable: undefined,
      body: pr.body || undefined,
    }));
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("Repository not found or is private");
    }
    throw new Error(`Failed to fetch pull requests: ${error.message}`);
  }
}

export async function fetchPRDetails(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRDetails> {
  const client = OctokitClient.getInstance();
  const octokit = client.getOctokit();

  try {
    // Fetch PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Fetch files changed
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    // Fetch reviews count
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber,
    });

    return {
      number: pr.number,
      title: pr.title,
      state: pr.merged_at ? "merged" : (pr.state as "open" | "closed"),
      author: {
        login: pr.user?.login || "unknown",
        avatar: pr.user?.avatar_url || "",
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at || undefined,
      closedAt: pr.closed_at || undefined,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      labels: pr.labels.map((l) => ({
        name: typeof l === "string" ? l : l.name || "",
        color: typeof l === "string" ? "666" : l.color || "666",
      })),
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha,
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha,
      },
      draft: pr.draft || false,
      mergeable: pr.mergeable || undefined,
      body: pr.body || undefined,
      files: files.map((f) => ({
        filename: f.filename,
        status: f.status as "added" | "removed" | "modified" | "renamed",
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      })),
      commitsCount: pr.commits,
      reviewsCount: reviews.length,
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch PR details: ${error.message}`);
  }
}
