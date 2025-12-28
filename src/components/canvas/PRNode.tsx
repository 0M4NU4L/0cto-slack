import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GitPullRequest, GitMerge, XCircle, Clock, FileText } from "lucide-react";
import type { PullRequest } from "@/lib/github/pr-fetcher";

export interface PRNodeData extends PullRequest {}

const PRNode = memo(({ data }: NodeProps<PRNodeData>) => {
  const getStatusIcon = () => {
    switch (data.state) {
      case "merged":
        return <GitMerge className="w-4 h-4 text-purple-400" />;
      case "closed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <GitPullRequest className="w-4 h-4 text-green-400" />;
    }
  };

  const getStatusColor = () => {
    switch (data.state) {
      case "merged":
        return "border-purple-500/40 bg-purple-500/10";
      case "closed":
        return "border-red-500/40 bg-red-500/10";
      default:
        return "border-green-500/40 bg-green-500/10";
    }
  };

  const getStatusBadge = () => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      merged: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Merged" },
      closed: { bg: "bg-red-500/20", text: "text-red-400", label: "Closed" },
      open: { bg: "bg-green-500/20", text: "text-green-400", label: "Open" },
    };
    const badge = badges[data.state];
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 backdrop-blur-sm min-w-[280px] max-w-[320px] transition-all hover:scale-[1.02] ${getStatusColor()}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 !bg-[#ccf381]"
      />

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-white/5">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/50 text-sm">#{data.number}</span>
            {getStatusBadge()}
            {data.draft && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                Draft
              </span>
            )}
          </div>
          <div className="font-medium text-sm text-white line-clamp-2">
            {data.title}
          </div>
        </div>
      </div>

      {/* Author & Date */}
      <div className="flex items-center gap-2 mt-3">
        {data.author.avatar && (
          <img
            src={data.author.avatar}
            alt={data.author.login}
            className="w-5 h-5 rounded-full border border-white/20"
          />
        )}
        <span className="text-xs text-white/60">{data.author.login}</span>
        <span className="text-white/30">•</span>
        <Clock className="w-3 h-3 text-white/40" />
        <span className="text-xs text-white/40">{formatDate(data.createdAt)}</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/60">{data.changedFiles} files</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-400">+{data.additions}</span>
          <span className="text-red-400">-{data.deletions}</span>
        </div>
      </div>

      {/* Labels */}
      {data.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.labels.slice(0, 3).map((label, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
                border: `1px solid #${label.color}40`,
              }}
            >
              {label.name}
            </span>
          ))}
          {data.labels.length > 3 && (
            <span className="text-xs text-white/40">+{data.labels.length - 3}</span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-[#ccf381]"
      />
    </div>
  );
});

PRNode.displayName = "PRNode";

export default PRNode;
