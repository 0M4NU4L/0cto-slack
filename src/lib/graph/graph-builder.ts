import { Node, Edge, MarkerType } from "reactflow";
import { FileParseResult } from "../parser/babel-parser";

export interface FileNodeData {
  label: string;
  path: string;
  imports: number;
  exports: number;
  language: string;
  parseError?: string;
  functions?: string[];
  classes?: string[];
}

export interface GraphData {
  nodes: Node<FileNodeData>[];
  edges: Edge[];
}

export function buildGraph(
  parsedFiles: Map<string, FileParseResult>
): GraphData {
  const nodes: Node<FileNodeData>[] = [];
  const edges: Edge[] = [];
  const edgeSet = new Set<string>(); // Prevent duplicates
  const allFilePaths = new Set(parsedFiles.keys());

  console.log("📊 Building graph from", parsedFiles.size, "files");

  let totalImports = 0;
  parsedFiles.forEach((parseResult, filePath) => {
    const fileName = filePath.split("/").pop() || filePath;
    const language = getLanguageFromPath(filePath);

    if (parseResult.success) {
      // Create node for this file
      nodes.push({
        id: filePath,
        type: "fileNode",
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          label: fileName,
          path: filePath,
          imports: parseResult.imports.length,
          exports: parseResult.exports.length,
          language,
          functions: parseResult.functions,
          classes: parseResult.classes,
        },
      });

      totalImports += parseResult.imports.length;

      // Create edges for imports
      parseResult.imports.forEach((importStmt) => {
        const targetPath = resolveImportPath(
          filePath,
          importStmt.source,
          allFilePaths
        );

        if (!targetPath) return;

        const edgeId = `${filePath}->${targetPath}`;
        if (!edgeSet.has(edgeId)) {
          // Determine edge style based on import type
          const hasDefaultImport = importStmt.specifiers.some(
            (s) => s === "default"
          );

          edges.push({
            id: edgeId,
            source: filePath,
            target: targetPath,
            type: "default",
            animated: true,
            style: {
              stroke: hasDefaultImport ? "#a78bfa" : "#4ade80",
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: hasDefaultImport ? "#a78bfa" : "#4ade80",
              width: 20,
              height: 20,
            },
          });
          edgeSet.add(edgeId);
        }
      });
    } else {
      // Create node with error
      nodes.push({
        id: filePath,
        type: "fileNode",
        position: { x: 0, y: 0 },
        data: {
          label: fileName,
          path: filePath,
          imports: 0,
          exports: 0,
          language,
          parseError: parseResult.error,
        },
      });
    }
  });

  console.log(`✅ Graph built: ${nodes.length} nodes, ${edges.length} edges`);

  return { nodes, edges };
}

function getLanguageFromPath(path: string): string {
  if (path.endsWith(".ts")) return "TypeScript";
  if (path.endsWith(".tsx")) return "TSX";
  if (path.endsWith(".jsx")) return "JSX";
  if (path.endsWith(".js")) return "JavaScript";
  if (path.endsWith(".mjs")) return "ESM";
  if (path.endsWith(".cjs")) return "CommonJS";
  return "Unknown";
}

function resolveImportPath(
  currentFile: string,
  importSource: string,
  allFiles: Set<string>
): string | null {
  // Handle @/ alias (TypeScript path alias mapping to project root)
  let resolvedPath = importSource;
  if (importSource.startsWith("@/")) {
    // Remove @/ and treat as absolute path from root
    resolvedPath = importSource.substring(2);
  } else if (importSource.startsWith(".")) {
    // Resolve relative imports
    const currentDir = currentFile.split("/").slice(0, -1).join("/");

    const parts = importSource.split("/");
    const currentParts = currentDir.split("/").filter((p) => p);

    for (const part of parts) {
      if (part === "..") {
        currentParts.pop();
      } else if (part !== "." && part !== "") {
        currentParts.push(part);
      }
    }

    resolvedPath = currentParts.join("/");
  } else if (importSource.startsWith("/")) {
    // Absolute path from repo root
    resolvedPath = importSource.substring(1);
  } else {
    // External package (npm module like 'react', 'next/link', etc.)
    return null;
  }

  // Try to find exact match
  if (allFiles.has(resolvedPath)) {
    return resolvedPath;
  }

  // Try common extensions
  const extensions = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"];

  for (const ext of extensions) {
    const withExt = resolvedPath + ext;
    if (allFiles.has(withExt)) {
      return withExt;
    }
  }

  // Try index files
  const indexFiles = [
    "/index.js",
    "/index.ts",
    "/index.jsx",
    "/index.tsx",
    "/index.mjs",
    "/index.cjs",
  ];
  for (const indexFile of indexFiles) {
    const withIndex = resolvedPath + indexFile;
    if (allFiles.has(withIndex)) {
      return withIndex;
    }
  }

  // Try without first directory segment (sometimes imports are from src/)
  const pathParts = resolvedPath.split("/");
  if (pathParts.length > 1) {
    const withoutFirst = pathParts.slice(1).join("/");

    if (allFiles.has(withoutFirst)) {
      return withoutFirst;
    }

    for (const ext of extensions) {
      const withExt = withoutFirst + ext;
      if (allFiles.has(withExt)) {
        return withExt;
      }
    }
  }

  return null;
}

export function filterNodes(
  nodes: Node<FileNodeData>[],
  searchTerm: string
): Node<FileNodeData>[] {
  if (!searchTerm) return nodes;

  const term = searchTerm.toLowerCase();
  return nodes.filter(
    (node) =>
      node.data.path.toLowerCase().includes(term) ||
      node.data.label.toLowerCase().includes(term)
  );
}

export function getNodesByLanguage(
  nodes: Node<FileNodeData>[],
  language: string
): Node<FileNodeData>[] {
  if (language === "all") return nodes;
  return nodes.filter((node) => node.data.language === language);
}
