import React from "react";
import { X, GitPullRequest, GitMerge, XCircle, FileText, Clock, User, MessageSquare, GitCommit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PRDetails } from "@/lib/github/pr-fetcher";

interface PRPanelProps {
  pr: PRDetails;
  onClose: () => void;
}

export default function PRPanel({ pr, onClose }: PRPanelProps) {
  const getStatusIcon = () => {
    switch (pr.state) {
      case "merged":
        return <GitMerge className="w-5 h-5 text-purple-400" />;
      case "closed":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <GitPullRequest className="w-5 h-5 text-green-400" />;
    }
  };

  const getStatusBadge = () => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      merged: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Merged" },
      closed: { bg: "bg-red-500/20", text: "text-red-400", label: "Closed" },
      open: { bg: "bg-green-500/20", text: "text-green-400", label: "Open" },
    };
    const config = configs[pr.state];
    return (
      <span className={`text-sm px-3 py-1 rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case "added":
        return "text-green-400";
      case "removed":
        return "text-red-400";
      case "modified":
        return "text-yellow-400";
      case "renamed":
        return "text-blue-400";
      default:
        return "text-white/60";
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[520px] bg-black border-l border-white/10 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-white/5 flex-shrink-0">
              {getStatusIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/50">#{pr.number}</span>
                {getStatusBadge()}
                {pr.draft && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                    Draft
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-white mt-1 line-clamp-2">{pr.title}</h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/70 hover:text-white flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Author & Branch Info */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            {pr.author.avatar && (
              <img
                src={pr.author.avatar}
                alt={pr.author.login}
                className="w-6 h-6 rounded-full border border-white/20"
              />
            )}
            <span className="text-sm text-white/70">{pr.author.login}</span>
          </div>
          <span className="text-white/30">•</span>
          <div className="text-sm text-white/50">
            <span className="text-[#ccf381] font-mono">{pr.head.ref}</span>
            <span className="mx-2">→</span>
            <span className="text-blue-400 font-mono">{pr.base.ref}</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
              <FileText className="w-4 h-4 mx-auto text-white/50 mb-1" />
              <div className="text-lg font-semibold text-white">{pr.changedFiles}</div>
              <div className="text-xs text-white/50">Files</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
              <GitCommit className="w-4 h-4 mx-auto text-white/50 mb-1" />
              <div className="text-lg font-semibold text-white">{pr.commitsCount}</div>
              <div className="text-xs text-white/50">Commits</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20 text-center">
              <div className="text-lg font-semibold text-green-400">+{pr.additions}</div>
              <div className="text-xs text-green-400/70">Added</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20 text-center">
              <div className="text-lg font-semibold text-red-400">-{pr.deletions}</div>
              <div className="text-xs text-red-400/70">Removed</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="text-xs font-semibold text-white/70 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timeline
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-white/50">Created:</span>
                <span className="text-white/70">{formatDate(pr.createdAt)}</span>
              </div>
              {pr.mergedAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-white/50">Merged:</span>
                  <span className="text-white/70">{formatDate(pr.mergedAt)}</span>
                </div>
              )}
              {pr.closedAt && !pr.mergedAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-white/50">Closed:</span>
                  <span className="text-white/70">{formatDate(pr.closedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {pr.body && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-xs font-semibold text-white/70 mb-2">Description</div>
              <div className="text-sm text-white/70 whitespace-pre-wrap line-clamp-10">
                {pr.body}
              </div>
            </div>
          )}

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-xs font-semibold text-white/70 mb-2">Labels</div>
              <div className="flex flex-wrap gap-2">
                {pr.labels.map((label, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `#${label.color}20`,
                      color: `#${label.color}`,
                      border: `1px solid #${label.color}40`,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Changed Files */}
          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Changed Files ({pr.files.length})
              </div>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="divide-y divide-white/5">
                {pr.files.map((file, idx) => (
                  <div key={idx} className="px-3 py-2 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-xs uppercase font-medium ${getFileStatusColor(file.status)}`}>
                          {file.status.charAt(0)}
                        </span>
                        <span className="text-sm text-white/80 font-mono truncate">
                          {file.filename}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
                        <span className="text-green-400">+{file.additions}</span>
                        <span className="text-red-400">-{file.deletions}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
