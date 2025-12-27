import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { FileCode, AlertCircle } from "lucide-react";
import { FileNodeData } from "@/lib/graph/graph-builder";

const FileNode = memo(({ data }: NodeProps<FileNodeData>) => {
  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      TypeScript: "#3178c6",
      TSX: "#3178c6",
      JavaScript: "#f7df1e",
      JSX: "#61dafb",
      ESM: "#f7df1e",
      CommonJS: "#68a063",
    };
    return colors[language] || "#888";
  };

  const hasError = !!data.parseError;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 ${
        hasError
          ? "bg-red-500/10 border-red-500/30"
          : "bg-white/5 border-white/20 hover:border-[#ccf381]/50"
      } backdrop-blur-sm min-w-[180px] transition-all`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-[#ccf381]"
      />

      <div className="flex items-start gap-2">
        <div
          className="p-1.5 rounded"
          style={{ backgroundColor: `${getLanguageColor(data.language)}20` }}
        >
          {hasError ? (
            <AlertCircle className="w-4 h-4" style={{ color: "#ef4444" }} />
          ) : (
            <FileCode
              className="w-4 h-4"
              style={{ color: getLanguageColor(data.language) }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white truncate">
            {data.label}
          </div>
          <div className="text-xs text-white/50 mt-0.5">{data.language}</div>
        </div>
      </div>

      {!hasError && (
        <div className="flex items-center gap-3 mt-2 text-xs">
          <div className="flex items-center gap-1 text-white/70">
            <span className="text-blue-400">{data.imports}</span>
            <span>imports</span>
          </div>
          <div className="flex items-center gap-1 text-white/70">
            <span className="text-green-400">{data.exports}</span>
            <span>exports</span>
          </div>
        </div>
      )}

      {hasError && (
        <div
          className="mt-2 text-xs text-red-400 truncate"
          title={data.parseError}
        >
          Parse error
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-[#ccf381]"
      />
    </div>
  );
});

FileNode.displayName = "FileNode";

export default FileNode;
