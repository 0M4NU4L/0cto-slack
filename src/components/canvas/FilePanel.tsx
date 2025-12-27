import React from "react";
import { X, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilePanelProps {
  fileName: string;
  filePath: string;
  content: string;
  language: string;
  imports?: string[];
  exports?: string[];
  functions?: string[];
  classes?: string[];
  onClose: () => void;
}

export default function FilePanel({
  fileName,
  filePath,
  content,
  language,
  imports = [],
  exports = [],
  functions = [],
  classes = [],
  onClose,
}: FilePanelProps) {
  const lines = content.split("\n");

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] bg-black border-l border-white/10 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileCode className="w-5 h-5 text-[#ccf381] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{fileName}</h3>
            <p className="text-xs text-white/50 truncate">{filePath}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white/70 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* File Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-xs text-white/50 mb-1">Language</div>
              <div className="text-sm font-medium text-white">{language}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-xs text-white/50 mb-1">Lines</div>
              <div className="text-sm font-medium text-white">
                {lines.length}
              </div>
            </div>
          </div>

          {/* Imports */}
          {imports.length > 0 && (
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <div className="text-xs font-semibold text-blue-400 mb-2">
                Imports ({imports.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {imports.slice(0, 10).map((imp, idx) => (
                  <div key={idx} className="text-xs text-white/70 font-mono">
                    {imp}
                  </div>
                ))}
                {imports.length > 10 && (
                  <div className="text-xs text-white/50">
                    +{imports.length - 10} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exports */}
          {exports.length > 0 && (
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <div className="text-xs font-semibold text-green-400 mb-2">
                Exports ({exports.length})
              </div>
              <div className="space-y-1">
                {exports.map((exp, idx) => (
                  <div key={idx} className="text-xs text-white/70 font-mono">
                    {exp}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Functions & Classes */}
          {(functions.length > 0 || classes.length > 0) && (
            <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
              <div className="text-xs font-semibold text-purple-400 mb-2">
                Definitions
              </div>
              {functions.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-white/50 mb-1">
                    Functions: {functions.length}
                  </div>
                  <div className="text-xs text-white/70 font-mono">
                    {functions.slice(0, 5).join(", ")}
                    {functions.length > 5 && ` +${functions.length - 5} more`}
                  </div>
                </div>
              )}
              {classes.length > 0 && (
                <div>
                  <div className="text-xs text-white/50 mb-1">
                    Classes: {classes.length}
                  </div>
                  <div className="text-xs text-white/70 font-mono">
                    {classes.join(", ")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Code Preview */}
          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="text-xs font-semibold text-white">
                Code Preview
              </div>
              <div className="text-xs text-white/50">{lines.length} lines</div>
            </div>
            <ScrollArea className="h-[400px] w-full">
              <div className="overflow-x-auto">
                <pre className="p-3 text-xs font-mono min-w-max">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="text-white/30 select-none w-8 text-right flex-shrink-0">
                        {idx + 1}
                      </span>
                      <code className="text-white/80 whitespace-pre">
                        {line || " "}
                      </code>
                    </div>
                  ))}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
