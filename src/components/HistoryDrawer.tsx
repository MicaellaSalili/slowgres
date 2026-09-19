import React, { useState } from "react";
import { X, Search, Trash2, Clock, ArrowRight, Layers, AlertCircle } from "lucide-react";
import { SavedAnalysis } from "../types/engine";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedAnalyses: SavedAnalysis[];
  onSelectAnalysis: (analysis: SavedAnalysis) => void;
  onDeleteAnalysis: (id: string) => void;
  onClearHistory: () => void;
  retentionDays: number;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedAnalyses,
  onSelectAnalysis,
  onDeleteAnalysis,
  onClearHistory,
  retentionDays,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  if (!isOpen) return null;

  const filtered = savedAnalyses.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      (item.query_text && item.query_text.toLowerCase().includes(term))
    );
  });

  return (
    <div
      id="history-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="history-drawer-panel"
        className="w-full max-w-md h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-xs transition-all font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-display">
              Analysis History
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Cached locally in browser for {retentionDays} days
            </p>
          </div>
          <button
            id="close-history-drawer-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by query, relation name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-sans"
            />
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <Layers className="w-10 h-10 mx-auto mb-2.5 opacity-30 text-zinc-400" />
              <p className="font-medium text-xs text-zinc-500 dark:text-zinc-400">No saved analyses found</p>
              <p className="text-[11px] text-zinc-400 mt-1">Run an EXPLAIN plan to automatically record results</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectAnalysis(item);
                  onClose();
                }}
                className="group p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-950/60 hover:bg-white dark:hover:bg-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 font-display line-clamp-1 text-xs">
                    {item.title}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAnalysis(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-opacity cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {item.query_text && (
                  <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 truncate bg-zinc-100/70 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200/60 dark:border-zinc-800/60">
                    {item.query_text}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">
                      {item.total_time_ms.toFixed(1)} ms
                    </span>
                    {item.critical_count > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 font-mono text-[10px] font-bold border border-rose-500/20">
                        {item.critical_count} crit
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                        Optimal
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Clear All */}
        {savedAnalyses.length > 0 && (
          <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex justify-between items-center">
            <span className="text-zinc-400 text-[11px] font-mono">
              {savedAnalyses.length} saved reports
            </span>
            <button
              id="clear-all-history-btn"
              onClick={onClearHistory}
              className="text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Clear all history
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
