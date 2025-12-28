import type { Node, Edge } from "reactflow";
import type { Commit, Branch, BranchWithCommits } from "@/lib/github/branch-fetcher";
import type { CommitNodeData } from "@/components/canvas/CommitNode";
import type { BranchNodeData } from "@/components/canvas/BranchNode";
import type { PullRequest } from "@/lib/github/pr-fetcher";
import type { PRNodeData } from "@/components/canvas/PRNode";

// Color palette for branches
const BRANCH_COLORS = [
  "#ccf381", // lime (default)
  "#60a5fa", // blue
  "#f472b6", // pink
  "#a78bfa", // purple
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f87171", // red
  "#2dd4bf", // teal
  "#fb923c", // orange
  "#a3e635", // lime-green
];

function getBranchColor(index: number): string {
  return BRANCH_COLORS[index % BRANCH_COLORS.length];
}

// Create timeline graph for commits across branches
export function createTimelineGraph(
  branchesWithCommits: BranchWithCommits[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  const commitPositions = new Map<string, { x: number; y: number }>();
  const processedCommits = new Set<string>();
  
  // Sort branches: default first, then by name
  const sortedBranches = [...branchesWithCommits].sort((a, b) => {
    if (a.branch.isDefault) return -1;
    if (b.branch.isDefault) return 1;
    return a.branch.name.localeCompare(b.branch.name);
  });

  // Calculate positions
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 90;
  const BRANCH_SPACING = 120;
  const COMMIT_SPACING = 320;
  
  let currentY = 0;

  sortedBranches.forEach((branchData, branchIndex) => {
    const branchColor = getBranchColor(branchIndex);
    const branchY = currentY;
    
    // Add branch node
    const branchNodeId = `branch-${branchData.branch.name}`;
    nodes.push({
      id: branchNodeId,
      type: "branchNode",
      position: { x: 0, y: branchY },
      data: {
        name: branchData.branch.name,
        sha: branchData.branch.sha,
        isDefault: branchData.branch.isDefault,
        protected: branchData.branch.protected,
        commitCount: branchData.commits.length,
        color: branchColor,
      } as BranchNodeData,
    });

    // Add commit nodes for this branch
    branchData.commits.forEach((commit, commitIndex) => {
      if (processedCommits.has(commit.sha)) {
        // Connect to existing commit
        const existingPos = commitPositions.get(commit.sha);
        if (existingPos && commitIndex === 0) {
          edges.push({
            id: `${branchNodeId}-${commit.sha}`,
            source: branchNodeId,
            target: commit.sha,
            type: "smoothstep",
            style: { stroke: branchColor, strokeWidth: 2 },
            animated: false,
          });
        }
        return;
      }

      const commitX = 200 + commitIndex * COMMIT_SPACING;
      const commitY = branchY;
      
      commitPositions.set(commit.sha, { x: commitX, y: commitY });
      processedCommits.add(commit.sha);

      const isMerge = commit.parents.length > 1;

      nodes.push({
        id: commit.sha,
        type: "commitNode",
        position: { x: commitX, y: commitY },
        data: {
          sha: commit.sha,
          shortSha: commit.shortSha,
          message: commit.message,
          author: commit.author,
          date: commit.date,
          isMerge,
          branchColor,
        } as CommitNodeData,
      });

      // Connect to branch or previous commit
      if (commitIndex === 0) {
        edges.push({
          id: `${branchNodeId}-${commit.sha}`,
          source: branchNodeId,
          target: commit.sha,
          type: "smoothstep",
          style: { stroke: branchColor, strokeWidth: 2 },
        });
      } else {
        const prevCommit = branchData.commits[commitIndex - 1];
        edges.push({
          id: `${prevCommit.sha}-${commit.sha}`,
          source: prevCommit.sha,
          target: commit.sha,
          type: "smoothstep",
          style: { stroke: branchColor, strokeWidth: 2 },
        });
      }

      // Connect merge commits to parents from other branches
      if (isMerge) {
        commit.parents.forEach((parentSha, idx) => {
          if (idx > 0 && commitPositions.has(parentSha)) {
            edges.push({
              id: `merge-${parentSha}-${commit.sha}`,
              source: parentSha,
              target: commit.sha,
              type: "smoothstep",
              style: { stroke: "#a78bfa", strokeWidth: 2, strokeDasharray: "5 5" },
              animated: true,
            });
          }
        });
      }
    });

    currentY += BRANCH_SPACING;
  });

  return { nodes, edges };
}

// Create PR timeline graph
export function createPRTimelineGraph(
  prs: PullRequest[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const PR_WIDTH = 320;
  const PR_SPACING = 40;
  const COLUMNS = 3;

  // Sort PRs by updated date
  const sortedPRs = [...prs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  sortedPRs.forEach((pr, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    
    nodes.push({
      id: `pr-${pr.number}`,
      type: "prNode",
      position: {
        x: col * (PR_WIDTH + PR_SPACING),
        y: row * 200,
      },
      data: pr as PRNodeData,
    });
  });

  // No edges for PR view (they're independent cards)
  return { nodes, edges };
}
