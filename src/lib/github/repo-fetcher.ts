import OctokitClient from "./octokit-client";

export interface RepoFile {
  path: string;
  type: "file" | "dir";
  size: number;
  sha: string;
  url: string;
}

export interface RepoTreeResponse {
  files: RepoFile[];
  totalFiles: number;
  sha: string;
  warnings: string[];
}

const IGNORED_PATHS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "vendor",
  "coverage",
  ".next",
  "out",
  ".cache",
];

const IGNORED_EXTENSIONS = [".min.js", ".min.css", ".map", ".lock", ".log"];

const MAX_FILE_SIZE = 500 * 1024; // 500KB

export async function fetchRepoTree(
  owner: string,
  repo: string
): Promise<RepoTreeResponse> {
  const client = OctokitClient.getInstance();
  const octokit = client.getOctokit();
  const warnings: string[] = [];

  try {
    // Get default branch
    const { data: repoData } = await octokit.repos.get({
      owner,
      repo,
    });

    const defaultBranch = repoData.default_branch;

    // Get git tree recursively
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "true",
    });

    // Filter and process files
    const files: RepoFile[] = treeData.tree
      .filter((item) => {
        // Only include files (not directories)
        if (item.type !== "blob") return false;

        // Check if path should be ignored
        const path = item.path || "";
        const shouldIgnore = IGNORED_PATHS.some((ignored) =>
          path.includes(ignored)
        );
        if (shouldIgnore) return false;

        // Check file extension
        const hasIgnoredExt = IGNORED_EXTENSIONS.some((ext) =>
          path.endsWith(ext)
        );
        if (hasIgnoredExt) return false;

        // Check file size
        if (item.size && item.size > MAX_FILE_SIZE) {
          warnings.push(
            `Skipped ${path}: file too large (${Math.round(
              item.size / 1024
            )}KB)`
          );
          return false;
        }

        return true;
      })
      .map((item) => ({
        path: item.path || "",
        type: "file" as const,
        size: item.size || 0,
        sha: item.sha || "",
        url: item.url || "",
      }));

    return {
      files,
      totalFiles: files.length,
      sha: repoData.default_branch,
      warnings,
    };
  } catch (error: any) {
    if (error.status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. Please provide a personal access token."
      );
    }
    if (error.status === 404) {
      throw new Error("Repository not found or is private");
    }
    throw new Error(`Failed to fetch repository: ${error.message}`);
  }
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const client = OctokitClient.getInstance();
  const octokit = client.getOctokit();

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if ("content" in data && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    throw new Error("File content not available");
  } catch (error: any) {
    throw new Error(`Failed to fetch file content: ${error.message}`);
  }
}
