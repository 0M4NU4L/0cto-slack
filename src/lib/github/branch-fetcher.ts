"use client";

import OctokitClient from "./octokit-client";

export interface Branch {
  name: string;
  sha: string;
  protected: boolean;
  isDefault: boolean;
}

export interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email: string;
    avatar?: string;
    login?: string;
  };
  date: string;
  parents: string[];
}

export interface BranchWithCommits {
  branch: Branch;
  commits: Commit[];
}

export async function fetchBranches(
  owner: string,
  repo: string
): Promise<Branch[]> {
  const client = OctokitClient.getInstance();
  const octokit = client.getOctokit();

  try {
    // Get repo info for default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    // Get all branches
    const { data: branches } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return branches.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
      protected: b.protected,
      isDefault: b.name === defaultBranch,
    }));
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("Repository not found or is private");
    }
    throw new Error(`Failed to fetch branches: ${error.message}`);
  }
}

export async function fetchCommits(
  owner: string,
  repo: string,
  branch?: string,
  limit: number = 50
): Promise<Commit[]> {
  const client = OctokitClient.getInstance();
  const octokit = client.getOctokit();

  try {
    const params: any = {
      owner,
      repo,
      per_page: Math.min(limit, 100),
    };

    if (branch) {
      params.sha = branch;
    }

    const { data: commits } = await octokit.repos.listCommits(params);

    return commits.map((c) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit.message.split("\n")[0], // First line only
      author: {
        name: c.commit.author?.name || "Unknown",
        email: c.commit.author?.email || "",
        avatar: c.author?.avatar_url,
        login: c.author?.login,
      },
      date: c.commit.author?.date || new Date().toISOString(),
      parents: c.parents.map((p) => p.sha),
    }));
  } catch (error: any) {
    throw new Error(`Failed to fetch commits: ${error.message}`);
  }
}

export async function fetchBranchesWithCommits(
  owner: string,
  repo: string,
  commitsPerBranch: number = 20
): Promise<BranchWithCommits[]> {
  const branches = await fetchBranches(owner, repo);
  
  // Limit to 10 branches to avoid rate limiting
  const limitedBranches = branches.slice(0, 10);
  
  const results: BranchWithCommits[] = [];
  
  for (const branch of limitedBranches) {
    const commits = await fetchCommits(owner, repo, branch.name, commitsPerBranch);
    results.push({ branch, commits });
  }
  
  return results;
}
