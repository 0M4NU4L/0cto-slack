import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GitCommit } from "lucide-react";

export interface CommitNodeData {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    avatar?: string;
    login?: string;
  };
  date: string;
  isMerge: boolean;
  branchColor: string;
}

const CommitNode = memo(({ data }: NodeProps<CommitNodeData>) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`rounded-xl border backdrop-blur-sm transition-all hover:scale-105 ${
        data.isMerge
          ? "px-4 py-3 border-purple-500/40 bg-purple-500/10"
          : "px-3 py-2 border-white/20 bg-white/5"
      }`}
      style={{
        borderLeftWidth: data.isMerge ? 2 : 3,
        borderLeftColor: data.branchColor,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2"
        style={{ backgroundColor: data.branchColor }}
      />

      <div className="flex items-start gap-2">
        <div
          className="p-1.5 rounded-full mt-0.5"
          style={{ backgroundColor: `${data.branchColor}20` }}
        >
          <GitCommit className="w-3.5 h-3.5" style={{ color: data.branchColor }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#ccf381]">
              {data.shortSha}
            </code>
            {data.isMerge && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                Merge
              </span>
            )}
          </div>
          
          <div className="text-sm text-white mt-1 line-clamp-1 max-w-[200px]">
            {data.message}
          </div>
          
          <div className="flex items-center gap-2 mt-1.5">
            {data.author.avatar && (
              <img
                src={data.author.avatar}
                alt={data.author.name}
                className="w-4 h-4 rounded-full border border-white/20"
              />
            )}
            <span className="text-xs text-white/50">
              {data.author.login || data.author.name}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/40">{formatDate(data.date)}</span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2"
        style={{ backgroundColor: data.branchColor }}
      />
    </div>
  );
});

CommitNode.displayName = "CommitNode";

export default CommitNode;
