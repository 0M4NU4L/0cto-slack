"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Filter, X, ChevronRight, ClipboardList, Loader, CheckCircle } from "lucide-react";
import { useAuth } from '@/lib/auth';

// Data contracts
export type Priority = "high" | "medium" | "low";

export type KanbanIssue = {
  id: string;               // unique id (message id or github issue id)
  number?: number;          // optional GitHub issue number
  title: string;
  summary?: string;         // short description (<= 80 chars)
  assignee?: {
    name?: string;
    avatarUrl?: string;
  } | null;
  priority: Priority;
  column: "todo" | "in_progress" | "done";
  source?: "ai" | "github"; // where this came from
};

export type KanbanBoardProps = {
  repoFullName: string;
  // Optional: AI issues derived from chat messages. The board will merge unseen ones into To Do.
  aiIssues?: Array<Pick<KanbanIssue, "id" | "title" | "summary" | "priority" | "assignee">>;
  className?: string;
};

// Utility: clamp summary to 80 chars
function clampSummary(text?: string, max = 80): string | undefined {
  if (!text) return text;
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Priority color badges
function PriorityBadge({ priority }: { priority: Priority }) {
  const color = priority === "high" ? "bg-red-500" : priority === "medium" ? "bg-yellow-500" : "bg-green-500";
  const label = priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// Mock placeholder issues to demonstrate layout
const MOCK_ISSUES: KanbanIssue[] = [
  {
    id: "gh-101",
    number: 101,
    title: "Improve onboarding docs for new contributors",
    summary: "Add step-by-step guide and screenshots for initial setup.",
    assignee: { name: "Alex", avatarUrl: "https://i.pravatar.cc/100?img=3" },
    priority: "medium",
    column: "todo",
    source: "github",
  },
  {
    id: "ai-1",
    title: "AI: Race condition in message feed on slow networks",
    summary: "Observed duplicate renders when switching channels quickly.",
    assignee: null,
    priority: "high",
    column: "in_progress",
    source: "ai",
  },
  {
    id: "gh-88",
    number: 88,
    title: "UI: Align avatars in chat bubbles",
    summary: "Left margin inconsistent in Firefox vs Chrome.",
    assignee: { name: "Sam", avatarUrl: "https://i.pravatar.cc/100?img=5" },
    priority: "low",
    column: "done",
    source: "github",
  },
];

export function KanbanBoard({ repoFullName, aiIssues = [], className }: KanbanBoardProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Internal board state
  const [board, setBoard] = useState(() => {
    // Start with mock issues, sorted into columns
    const initial = { todo: [], in_progress: [], done: [] } as Record<string, KanbanIssue[]>;
    for (const issue of MOCK_ISSUES) {
      initial[issue.column].push(issue);
    }
    return initial;
  });

  // Track seen issue IDs to avoid duplicates
  const seenIds = useRef<Set<string>>(new Set(MOCK_ISSUES.map(i => i.id)));

  // Merge incoming AI issues (from chat) into To Do if unseen
  useEffect(() => {
    if (!aiIssues || aiIssues.length === 0) return;
    setBoard(prev => {
      const next = { ...prev, todo: [...prev.todo] };
      let changed = false;
      for (const ai of aiIssues) {
        if (!seenIds.current.has(ai.id)) {
          seenIds.current.add(ai.id);
          next.todo.unshift({
            id: ai.id,
            title: ai.title,
            summary: clampSummary(ai.summary),
            assignee: ai.assignee || null,
            priority: ai.priority || "medium",
            column: "todo",
            source: "ai",
          });
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [aiIssues]);

  // Simple client-side filter by title or priority
  const filterFn = (issue: KanbanIssue) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      issue.title.toLowerCase().includes(q) ||
      (issue.priority && issue.priority.toLowerCase().includes(q))
    );
  };

  const handleDragEnd = (result: DropResult) => {
    try {
      const { destination, source } = result;
      if (!destination) return;
      
      const srcCol = source.droppableId as keyof typeof board;
      const dstCol = destination.droppableId as keyof typeof board;

      // Validate columns exist
      if (!board[srcCol] || !board[dstCol]) {
        console.error('Invalid column in drag operation:', { srcCol, dstCol });
        return;
      }

      if (srcCol === dstCol && source.index === destination.index) return;

      const srcItems = Array.from(board[srcCol] || []);
      const [moved] = srcItems.splice(source.index, 1);
      
      // Ensure moved item exists
      if (!moved) {
        console.error('No item found at source index:', source.index);
        return;
      }

      const dstItems = Array.from(board[dstCol] || []);
      dstItems.splice(destination.index, 0, { ...moved, column: dstCol as "todo" | "in_progress" | "done" });

      setBoard({
        ...board,
        [srcCol]: srcItems,
        [dstCol]: dstItems,
      });
    } catch (error) {
      console.error('Error in drag operation:', error);
    }
  };

  // Placeholder for GitHub sync (optional)
  async function syncWithGithub() {
    await fetchAndMergeGithubIssues();
  }

  // Fetch issues from GitHub and merge into board state.
  const { githubToken } = useAuth();

  async function fetchGithubIssuesOnce(page = 1, per_page = 100) {
    if (!repoFullName) return { issues: [], hasMore: false };
    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) return { issues: [], hasMore: false };

    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=${per_page}&page=${page}`;
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn('[Kanban] Failed to fetch issues from GitHub', res.status);
      return { issues: [], hasMore: false };
    }

    const data = await res.json();
    // GitHub returns pull requests in this endpoint as well (they include pull_request key). Filter those out.
    const issues = Array.isArray(data) ? data.filter((i: any) => !i.pull_request) : [];

    // simple pagination detection: if returned length === per_page, there might be more
    const hasMore = Array.isArray(data) && data.length === per_page;
    return { issues, hasMore };
  }

  async function fetchAndMergeGithubIssues() {
    try {
      let page = 1;
      const per_page = 100;
      const allFetched: any[] = [];
      while (true) {
        const { issues, hasMore } = await fetchGithubIssuesOnce(page, per_page);
        if (!issues || issues.length === 0) break;
        allFetched.push(...issues);
        if (!hasMore) break;
        page += 1;
        // safety: avoid infinite loops
        if (page > 5) break;
      }

      if (allFetched.length === 0) return;

      // Merge into board: add new issues, update existing ones, move closed -> done
      setBoard(prev => {
        const next = { todo: [...(prev.todo ?? [])], in_progress: [...(prev.in_progress ?? [])], done: [...(prev.done ?? [])] } as Record<string, KanbanIssue[]>;

        for (const gh of allFetched) {
          const ghId = `gh-${gh.id}`;
          // detect priority from labels (label names containing 'priority' or high/low)
          let priority: Priority = 'medium';
          if (gh.labels && Array.isArray(gh.labels)) {
            const labelNames = gh.labels.map((l: any) => (l.name || '').toString().toLowerCase());
            if (labelNames.some((n: string) => n.includes('high') || n.includes('priority: high'))) priority = 'high';
            else if (labelNames.some((n: string) => n.includes('low') || n.includes('priority: low'))) priority = 'low';
            else if (labelNames.some((n: string) => n.includes('in-progress') || n.includes('doing'))) {
              // treat as in_progress
            }
          }

          const mapped: KanbanIssue = {
            id: ghId,
            number: gh.number,
            title: gh.title,
            summary: clampSummary(gh.body || ''),
            assignee: gh.assignee ? { name: gh.assignee.login, avatarUrl: gh.assignee.avatar_url } : null,
            priority,
            column: gh.state === 'closed' ? 'done' : 'todo',
            source: 'github',
          };

          // If we have seen it before (either in any column), update/move
          const existsIn = (col: string) => (next[col] ?? []).findIndex(i => i.id === ghId);
          const idxTodo = existsIn('todo');
          const idxProgress = existsIn('in_progress');
          const idxDone = existsIn('done');

          // remove from wherever it exists
          if (idxTodo !== -1) next.todo.splice(idxTodo, 1);
          if (idxProgress !== -1) next.in_progress.splice(idxProgress, 1);
          if (idxDone !== -1) next.done.splice(idxDone, 1);

          // push into appropriate column (closed -> done)
          if (mapped.column === 'done') {
            // push to top of done
            next.done.unshift(mapped);
          } else {
            // if labels indicate in-progress, put there
            const labelNames = (gh.labels || []).map((l: any) => (l.name || '').toString().toLowerCase());
            if (labelNames.some((n: string) => n.includes('in-progress') || n.includes('doing') || n.includes('wip'))) {
              mapped.column = 'in_progress';
              next.in_progress.unshift(mapped);
            } else {
              next.todo.unshift(mapped);
            }
          }

          // mark seen
          seenIds.current.add(mapped.id);
        }

        return next;
      });
    } catch (e) {
      console.error('[Kanban] Error fetching GitHub issues', e);
    }
  }

  // Auto-sync on mount and when repoFullName or githubToken changes, and poll every 60s
  useEffect(() => {
    let mounted = true;
    if (!repoFullName) return;
    // run an initial sync
    fetchAndMergeGithubIssues();
    const iv = setInterval(() => {
      if (!mounted) return;
      fetchAndMergeGithubIssues();
    }, 60_000);
    return () => { mounted = false; clearInterval(iv); };
  }, [repoFullName, githubToken]);

  // Column Renderer
  const Column: React.FC<{ id: keyof typeof board; title: string }> = ({ id, title }) => {
    const items = (board[id] ?? []).filter(filterFn);
    return (
      <div className="flex flex-col h-full w-full rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${id === 'todo' ? 'bg-cyan-500' : id === 'in_progress' ? 'bg-purple-500' : 'bg-green-500'}`} />
            <span className="font-semibold text-sm text-white">{title}</span>
          </div>
          <Badge variant="outline" className="bg-white/5 border-white/10 text-white/70">{items.length}</Badge>
        </div>
        <div className="flex-1 p-2 min-h-0">
            <Droppable droppableId={id} isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {items.map((issue, index) => (
                    <Draggable key={issue.id} draggableId={issue.id} index={index}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={cn(
                            "group relative rounded-lg border p-3 shadow-sm transition-all duration-200",
                            snapshot.isDragging ? "bg-purple-500/20 border-purple-500/50 ring-2 ring-purple-500/30 z-50" : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                          )}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-mono text-white/40">{issue.number ? `#${issue.number}` : 'AI'}</span>
                                <PriorityBadge priority={issue.priority} />
                            </div>
                            <div className="font-medium text-sm text-white leading-snug">{issue.title}</div>
                            {issue.summary && (
                                <div className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                                  {issue.summary}
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1">
                                    {issue.source === 'github' ? (
                                        <div className="p-1 rounded bg-white/5 text-white/50" title="From GitHub">
                                            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                        </div>
                                    ) : (
                                        <div className="p-1 rounded bg-purple-500/10 text-purple-400" title="AI Generated">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                                        </div>
                                    )}
                                </div>
                                <Avatar className="h-5 w-5 ring-1 ring-white/10">
                                    {issue.assignee?.avatarUrl ? (
                                    <AvatarImage src={issue.assignee.avatarUrl} alt={issue.assignee?.name || "Assignee"} />
                                    ) : (
                                    <AvatarFallback className="text-[10px] bg-white/10 text-white/70">U</AvatarFallback>
                                    )}
                                </Avatar>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
        </div>
      </div>
    );
  };

  if (!isBrowser) {
    return (
        <div className={cn("relative h-full flex flex-col bg-transparent", className)}>
            <div className="flex-1 flex items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        </div>
    );
  }

  return (
    <div className={cn("relative h-full flex flex-col bg-transparent", className)}>
      {/* Header controls */}
      <div className="flex flex-col border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3 p-4 pb-2">
            <div className="relative flex-1">
            <Input
                placeholder="Search issues..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-9"
            />
            <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            </div>
            {query && (
                <Button variant="ghost" size="icon" onClick={() => setQuery("")} className="h-9 w-9 text-white/50 hover:text-white hover:bg-white/10"> 
                <X className="h-4 w-4" />
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={syncWithGithub} className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-cyan-300 h-9 gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Sync
            </Button>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 px-4 pb-4">
            <Button 
                variant={activeTab === 'todo' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('todo')}
                className={cn("flex-1 h-9", activeTab === 'todo' ? "bg-cyan-500 hover:bg-cyan-600 text-white border-transparent" : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70")}
            >
                To Do
                <Badge variant="secondary" className="ml-2 bg-black/20 text-white hover:bg-black/30">{board.todo.length}</Badge>
            </Button>
            <Button 
                variant={activeTab === 'in_progress' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('in_progress')}
                className={cn("flex-1 h-9", activeTab === 'in_progress' ? "bg-purple-500 hover:bg-purple-600 text-white border-transparent" : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70")}
            >
                In Progress
                <Badge variant="secondary" className="ml-2 bg-black/20 text-white hover:bg-black/30">{board.in_progress.length}</Badge>
            </Button>
            <Button 
                variant={activeTab === 'done' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('done')}
                className={cn("flex-1 h-9", activeTab === 'done' ? "bg-green-500 hover:bg-green-600 text-white border-transparent" : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70")}
            >
                Done
                <Badge variant="secondary" className="ml-2 bg-black/20 text-white hover:bg-black/30">{board.done.length}</Badge>
            </Button>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="h-full w-full">
                {activeTab === 'todo' && <Column id="todo" title="To Do" />}
                {activeTab === 'in_progress' && <Column id="in_progress" title="In Progress" />}
                {activeTab === 'done' && <Column id="done" title="Done" />}
            </div>
        </DragDropContext>
      </div>
    </div>
  );
}

export default KanbanBoard;
