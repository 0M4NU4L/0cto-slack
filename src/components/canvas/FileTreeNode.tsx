import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Folder, FolderOpen, FileCode, FileText, FileJson } from "lucide-react";

export interface FileTreeNodeData {
  label: string;
  path: string;
  type: "file" | "directory";
  isExpanded?: boolean;
  depth: number;
  fileCount?: number;
  language?: string;
  size?: number;
}

const FileTreeNode = memo(({ data }: NodeProps<FileTreeNodeData>) => {
  const getFileIcon = () => {
    if (data.type === "directory") {
      return data.isExpanded ? (
        <FolderOpen className="w-4 h-4 text-yellow-400" />
      ) : (
        <Folder className="w-4 h-4 text-yellow-400" />
      );
    }

    // File icons based on extension
    const ext = data.label.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case "js":
      case "jsx":
        return <FileCode className="w-4 h-4 text-yellow-300" />;
      case "json":
        return <FileJson className="w-4 h-4 text-green-400" />;
      case "md":
        return <FileText className="w-4 h-4 text-white/70" />;
      case "css":
      case "scss":
        return <FileCode className="w-4 h-4 text-pink-400" />;
      default:
        return <FileText className="w-4 h-4 text-white/50" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div
      className={`px-3 py-2 rounded-lg border backdrop-blur-sm transition-all cursor-pointer
        ${
          data.type === "directory"
            ? "bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-400/50"
            : "bg-white/5 border-white/20 hover:border-[#ccf381]/50"
        }`}
      style={{ marginLeft: data.depth * 8 }}
    >
      {data.type === "file" && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-1.5 h-1.5 !bg-white/30"
        />
      )}

      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">{getFileIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white truncate max-w-[140px]">
            {data.label}
          </div>
          {data.type === "directory" && data.fileCount !== undefined && (
            <div className="text-xs text-white/40">
              {data.fileCount} {data.fileCount === 1 ? "item" : "items"}
            </div>
          )}
          {data.type === "file" && data.size && (
            <div className="text-xs text-white/40">{formatSize(data.size)}</div>
          )}
        </div>
      </div>

      {data.type === "directory" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-1.5 h-1.5 !bg-yellow-400/50"
        />
      )}
    </div>
  );
});

FileTreeNode.displayName = "FileTreeNode";

export default FileTreeNode;
