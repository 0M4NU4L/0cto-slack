import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GitBranch, Shield, Star } from "lucide-react";

export interface BranchNodeData {
  name: string;
  sha: string;
  isDefault: boolean;
  protected: boolean;
  commitCount?: number;
  color: string;
}

const BranchNode = memo(({ data }: NodeProps<BranchNodeData>) => {
  return (
    <div
      className="px-4 py-2.5 rounded-xl border-2 backdrop-blur-sm transition-all hover:scale-105"
      style={{
        backgroundColor: `${data.color}15`,
        borderColor: `${data.color}60`,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2"
        style={{ backgroundColor: data.color }}
      />

      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4" style={{ color: data.color }} />
        <span className="font-medium text-sm text-white">{data.name}</span>
        
        {data.isDefault && (
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
        )}
        {data.protected && (
          <Shield className="w-3.5 h-3.5 text-blue-400" />
        )}
      </div>

      {data.commitCount !== undefined && (
        <div className="text-xs text-white/50 mt-1 ml-6">
          {data.commitCount} commits
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2"
        style={{ backgroundColor: data.color }}
      />
    </div>
  );
});

BranchNode.displayName = "BranchNode";

export default BranchNode;
