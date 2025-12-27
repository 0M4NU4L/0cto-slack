"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Github, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import OctokitClient from "@/lib/github/octokit-client";
import { fetchRepoTree, fetchFileContent } from "@/lib/github/repo-fetcher";
import {
  parseFile,
  canParse,
  type FileParseResult,
} from "@/lib/parser/babel-parser";
import { buildGraph, type FileNodeData } from "@/lib/graph/graph-builder";
import { applyDagreLayout } from "@/lib/layout/dagre-layout";
import RepoCache from "@/lib/cache/storage";
import FileNode from "@/components/canvas/FileNode";
import FilePanel from "@/components/canvas/FilePanel";
import type { Node as FlowNode, NodeTypes } from "reactflow";

// Dynamically import React Flow to avoid SSR issues
const ReactFlow = dynamic(
  () => import("reactflow").then((mod) => mod.ReactFlow),
  { ssr: false }
);

const Controls = dynamic(
  () => import("reactflow").then((mod) => mod.Controls),
  { ssr: false }
);

const MiniMap = dynamic(() => import("reactflow").then((mod) => mod.MiniMap), {
  ssr: false,
});

const Background = dynamic(
  () => import("reactflow").then((mod) => mod.Background),
  { ssr: false }
);

const Panel = dynamic(() => import("reactflow").then((mod) => mod.Panel), {
  ssr: false,
});

import "reactflow/dist/style.css";

const nodeTypes: NodeTypes = {
  fileNode: FileNode,
};

function CanvasContent() {
  const searchParams = useSearchParams();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    message: "",
  });
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [token, setToken] = useState("");
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    content: string;
    parsed: FileParseResult;
    data: FileNodeData;
  } | null>(null);
  const [fileContents, setFileContents] = useState<Map<string, string>>(
    new Map()
  );
  const [parsedData, setParsedData] = useState<Map<string, FileParseResult>>(
    new Map()
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Repository selection mode
  const [repoMode, setRepoMode] = useState<"my-repos" | "explore">("my-repos");
  const [userRepos, setUserRepos] = useState<
    Array<{ name: string; full_name: string; private: boolean }>
  >([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);

  useEffect(() => {
    // Get token from localStorage (set during OAuth flow)
    const storedToken = localStorage.getItem("github_token");
    console.log(
      "🔍 Checking for stored token:",
      storedToken ? "✅ Found" : "❌ Not found"
    );
    if (storedToken) {
      setToken(storedToken);
      OctokitClient.getInstance().setToken(storedToken);
      console.log("✅ Token loaded and Octokit configured");
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    console.log("🔄 Nodes/Edges changed:", {
      nodes: nodes.length,
      edges: edges.length,
    });
  }, [nodes, edges]);

  const fetchUserRepos = async () => {
    if (!token) return;

    setLoadingRepos(true);
    try {
      const octokit = OctokitClient.getInstance().getOctokit();
      const response = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
        affiliation: "owner",
      });

      setUserRepos(
        response.data.map((repo: any) => ({
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch user repos:", err);
      setError("Failed to load your repositories");
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (token && repoMode === "my-repos") {
      fetchUserRepos();
    }
  }, [token, repoMode]);

  const parseGitHubUrl = (url: string) => {
    // Extract owner/repo from various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /^([^\/]+)\/([^\/]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const repo = match[2].replace(/\.git$/, "");
        return { owner: match[1], repo };
      }
    }
    return null;
  };

  const handleAnalyze = async () => {
    setError("");
    setWarnings([]);
    setLoading(true);
    setProgress({ current: 0, total: 0, message: "Fetching repository..." });

    try {
      // Ensure token is set before making API calls
      const storedToken = localStorage.getItem("github_token");
      if (!storedToken) {
        setError("Please sign in with GitHub from the home page first");
        setLoading(false);
        return;
      }

      OctokitClient.getInstance().setToken(storedToken);
      setToken(storedToken);

      let repoToAnalyze = "";
      if (repoMode === "my-repos") {
        if (!selectedRepo) {
          setError("Please select a repository");
          setLoading(false);
          return;
        }
        repoToAnalyze = selectedRepo;
      } else {
        if (!repoUrl) {
          setError("Please enter a repository URL");
          setLoading(false);
          return;
        }
        repoToAnalyze = repoUrl;
      }

      const parsed = parseGitHubUrl(repoToAnalyze);
      if (!parsed) {
        setError(
          "Invalid GitHub URL. Use format: owner/repo or full GitHub URL"
        );
        setLoading(false);
        return;
      }

      const { owner, repo } = parsed;

      // Check cache first
      const cachedData = RepoCache.get<any>(owner, repo);
      if (cachedData) {
        setNodes(cachedData.nodes);
        setEdges(cachedData.edges);
        setWarnings(cachedData.warnings || []);
        setLoading(false);
        return;
      }

      // Fetch repository tree
      setProgress({
        current: 0,
        total: 0,
        message: "Fetching repository structure...",
      });
      const treeData = await fetchRepoTree(owner, repo);

      if (treeData.warnings.length > 0) {
        setWarnings(treeData.warnings);
      }

      // Filter parseable files
      const parseableFiles = treeData.files.filter((file) =>
        canParse(file.path)
      );

      // Limit to 200 files for MVP
      const filesToParse = parseableFiles.slice(0, 200);

      if (parseableFiles.length > 200) {
        setWarnings((prev) => [
          ...prev,
          `Repository has ${parseableFiles.length} parseable files. Analyzing first 200 files.`,
        ]);
      }

      // Parse files
      const parsedFiles = new Map<string, FileParseResult>();
      const contents = new Map<string, string>();

      for (let i = 0; i < filesToParse.length; i++) {
        const file = filesToParse[i];
        setProgress({
          current: i + 1,
          total: filesToParse.length,
          message: `Parsing ${file.path}...`,
        });

        try {
          const content = await fetchFileContent(owner, repo, file.path);
          contents.set(file.path, content);
          const parseResult = parseFile(content, file.path);
          parsedFiles.set(file.path, parseResult);
        } catch (err) {
          // Add as failed parse
          parsedFiles.set(file.path, {
            success: false,
            error: err instanceof Error ? err.message : "Failed to fetch",
          });
        }
      }

      // Store file contents and parsed data
      setFileContents(contents);
      setParsedData(parsedFiles);

      // Build graph
      setProgress({ current: 0, total: 0, message: "Building graph..." });
      const graphData = buildGraph(parsedFiles);

      // Apply layout
      setProgress({ current: 0, total: 0, message: "Applying layout..." });
      const layoutedNodes = applyDagreLayout(graphData.nodes, graphData.edges);

      setNodes(layoutedNodes);
      setEdges(graphData.edges);

      // Cache the result
      RepoCache.set(
        owner,
        repo,
        {
          nodes: layoutedNodes,
          edges: graphData.edges,
          warnings,
        },
        treeData.sha
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze repository"
      );
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, message: "" });
    }
  };

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode<FileNodeData>) => {
      const content = fileContents.get(node.id);
      const parsed = parsedData.get(node.id);
      if (content && parsed) {
        setSelectedFile({
          path: node.id,
          content,
          parsed,
          data: node.data,
        });
      }
    },
    [fileContents, parsedData]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/superdash">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Github className="h-6 w-6 text-[#ccf381]" />
                <h1 className="text-xl font-bold">CodeCanvas</h1>
                <span className="text-xs bg-[#ccf381]/10 text-[#ccf381] px-2 py-1 rounded-full">
                  Beta
                </span>
              </div>
            </div>

            {token && (
              <div className="text-xs text-white/50">
                <Github className="inline h-3 w-3 mr-1" />
                Authenticated
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold mb-4">Visualize Repository</h2>

            {/* Repository Mode Toggle */}
            <div className="flex items-center space-x-2 mb-4">
              <Label htmlFor="repo-mode" className="text-sm font-medium">
                My Repositories
              </Label>
              <Switch
                id="repo-mode"
                checked={repoMode === "explore"}
                onCheckedChange={(checked) =>
                  setRepoMode(checked ? "explore" : "my-repos")
                }
              />
              <Label htmlFor="repo-mode" className="text-sm font-medium">
                Explore Any Repo
              </Label>
            </div>

            {/* Repository Selection */}
            {repoMode === "my-repos" ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Repository</Label>
                <Select
                  value={selectedRepo}
                  onValueChange={setSelectedRepo}
                  disabled={loadingRepos || !token}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue
                      placeholder={
                        loadingRepos
                          ? "Loading repositories..."
                          : "Choose a repository"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/20">
                    {userRepos.map((repo) => (
                      <SelectItem
                        key={repo.full_name}
                        value={repo.full_name}
                        className="text-white hover:bg-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <span>{repo.full_name}</span>
                          {repo.private && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                              Private
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Repository URL</Label>
                <Input
                  type="text"
                  placeholder="owner/repo or https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  disabled={loading}
                />
              </div>
            )}

            <div className="mt-4">
              <Button
                onClick={handleAnalyze}
                disabled={
                  loading ||
                  (!selectedRepo && repoMode === "my-repos") ||
                  (!repoUrl && repoMode === "explore") ||
                  !isInitialized ||
                  !token
                }
                className="w-full bg-[#ccf381] text-black hover:bg-[#ccf381]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : !token ? (
                  "Sign in Required"
                ) : (
                  "Analyze Repository"
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm space-y-1">
                {warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {loading && progress.total > 0 && (
              <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-white/70 mb-2">
                  {progress.message}
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-[#ccf381] h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-white/50 mt-1 text-right">
                  {progress.current} / {progress.total}
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-white/50">
              {repoMode === "my-repos" ? (
                <p>
                  Select one of your repositories to visualize its code
                  structure and dependencies
                </p>
              ) : (
                <p>
                  Enter any public GitHub repository URL to visualize its code
                  structure
                </p>
              )}
              {!token && isInitialized && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400">
                  <p className="font-medium">⚠️ Not authenticated</p>
                  <p className="mt-1">
                    Please{" "}
                    <Link href="/" className="underline hover:text-yellow-300">
                      sign in with GitHub
                    </Link>{" "}
                    to use CodeCanvas
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Section */}
        {nodes.length > 0 && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm text-white/70">
                <span className="font-semibold text-white">{nodes.length}</span>{" "}
                files •{" "}
                <span className="font-semibold text-white">{edges.length}</span>{" "}
                connections
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNodes([]);
                  setEdges([]);
                  setWarnings([]);
                }}
                className="border-white/20 text-white/70 hover:text-white"
              >
                Clear
              </Button>
            </div>
            <div style={{ height: "70vh" }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                className="bg-black"
                minZoom={0.1}
                maxZoom={2}
                snapToGrid={false}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                connectionLineStyle={{ stroke: "#ccf381", strokeWidth: 2 }}
              >
                <Controls className="bg-white/10 border-white/20" />
                <MiniMap
                  className="!bg-zinc-900 border border-white/20"
                  nodeColor={(node) => {
                    const data = node.data as FileNodeData;
                    if (data.parseError) return "#ef4444";
                    // Color by language
                    switch (data.language) {
                      case "TypeScript":
                        return "#3178c6";
                      case "TSX":
                        return "#61dafb";
                      case "JavaScript":
                        return "#f7df1e";
                      case "JSX":
                        return "#61dafb";
                      default:
                        return "#ccf381";
                    }
                  }}
                  nodeStrokeColor={() => "#444"}
                  nodeStrokeWidth={1}
                  maskColor="rgba(0, 0, 0, 0.6)"
                />
                <Background color="#333" gap={16} />
                <Panel
                  position="top-right"
                  className="bg-black/80 backdrop-blur border border-white/10 rounded-lg p-3 text-xs text-white/70"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-[#4ade80]"></div>
                      <span>Default Import</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-[#a78bfa]"></div>
                      <span>Named Import</span>
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          </div>
        )}
      </div>

      {/* File Panel */}
      {selectedFile && selectedFile.parsed.success && (
        <FilePanel
          fileName={selectedFile.data.label}
          filePath={selectedFile.path}
          content={selectedFile.content}
          language={selectedFile.data.language}
          imports={selectedFile.parsed.imports.map((imp) =>
            imp.specifiers.length > 0
              ? `${imp.specifiers.join(", ")} from "${imp.source}"`
              : `import "${imp.source}"`
          )}
          exports={selectedFile.parsed.exports.map((exp) => exp.name)}
          functions={selectedFile.parsed.functions}
          classes={selectedFile.parsed.classes}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}

export default function CanvasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ccf381]" />
        </div>
      }
    >
      <CanvasContent />
    </Suspense>
  );
}
