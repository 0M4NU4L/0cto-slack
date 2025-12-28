import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import type { FileTreeNodeData } from "@/components/canvas/FileTreeNode";

interface TreeItem {
  path: string;
  type: "file" | "directory";
  size?: number;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children: TreeNode[];
  size?: number;
}

// Build a tree structure from flat file paths
function buildTreeStructure(items: TreeItem[]): TreeNode {
  const root: TreeNode = {
    name: "root",
    path: "",
    type: "directory",
    children: [],
  };

  for (const item of items) {
    const parts = item.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      let child = current.children.find((c) => c.name === part);
      
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          type: isLast ? item.type : "directory",
          children: [],
          size: isLast ? item.size : undefined,
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  // Sort children: directories first, then alphabetically
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };

  sortChildren(root);
  return root;
}

// Count files in a directory (recursive)
function countFiles(node: TreeNode): number {
  if (node.type === "file") return 1;
  return node.children.reduce((sum, child) => sum + countFiles(child), 0);
}

// Convert tree structure to React Flow nodes and edges
function treeToNodesAndEdges(
  tree: TreeNode,
  depth: number = 0,
  parentId: string | null = null
): { nodes: Node<FileTreeNodeData>[]; edges: Edge[] } {
  const nodes: Node<FileTreeNodeData>[] = [];
  const edges: Edge[] = [];

  const processNode = (
    node: TreeNode,
    currentDepth: number,
    parent: string | null
  ) => {
    if (node.name === "root" && currentDepth === 0) {
      // Skip root, process children directly
      node.children.forEach((child) => processNode(child, 0, null));
      return;
    }

    const nodeId = node.path;
    
    nodes.push({
      id: nodeId,
      type: "fileTreeNode",
      position: { x: 0, y: 0 }, // Will be set by dagre
      data: {
        label: node.name,
        path: node.path,
        type: node.type,
        depth: currentDepth,
        fileCount: node.type === "directory" ? countFiles(node) : undefined,
        size: node.size,
        isExpanded: true,
      },
    });

    if (parent) {
      edges.push({
        id: `${parent}-${nodeId}`,
        source: parent,
        target: nodeId,
        type: "smoothstep",
        style: { stroke: "#fcd34d40", strokeWidth: 1.5 },
        animated: false,
      });
    }

    // Process children
    node.children.forEach((child) => processNode(child, currentDepth + 1, nodeId));
  };

  processNode(tree, depth, parentId);
  return { nodes, edges };
}

// Apply dagre layout for tree visualization
export function applyTreeLayout(
  nodes: Node<FileTreeNodeData>[],
  edges: Edge[],
  direction: "TB" | "LR" = "LR"
): Node<FileTreeNodeData>[] {
  if (nodes.length === 0) return [];

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 20,
    ranksep: 60,
    marginx: 40,
    marginy: 40,
  });

  // Add nodes
  nodes.forEach((node) => {
    const width = node.data.type === "directory" ? 160 : 180;
    const height = node.data.type === "directory" ? 50 : 45;
    dagreGraph.setNode(node.id, { width, height });
  });

  // Add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Apply positions
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.data.type === "directory" ? 80 : 90),
        y: nodeWithPosition.y - (node.data.type === "directory" ? 25 : 22.5),
      },
    };
  });
}

// Main function to create file tree visualization
export function createFileTreeGraph(
  files: Array<{ path: string; type: "file" | "dir"; size?: number }>
): { nodes: Node<FileTreeNodeData>[]; edges: Edge[] } {
  const items: TreeItem[] = files.map((f) => ({
    path: f.path,
    type: f.type === "dir" ? "directory" : "file",
    size: f.size,
  }));

  const tree = buildTreeStructure(items);
  const { nodes, edges } = treeToNodesAndEdges(tree);
  const layoutedNodes = applyTreeLayout(nodes, edges);

  return { nodes: layoutedNodes, edges };
}
