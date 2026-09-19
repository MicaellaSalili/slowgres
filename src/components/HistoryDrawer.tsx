import React, { useState } from "react";
import { X, Search, Trash2 } from "lucide-react";
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
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        id="history-drawer-panel"
        className="w-full max-w-md h-full bg-[var(--bg)] border-l border-[var(--border)] shadow-xl flex flex-col overflow-hidden text-[13px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[15px] text-[var(--text)]">
              Analysis history
            </h3>
            <p className="text-[12px] text-[var(--muted)] mt-0.5">
              Saved in local browser storage for {retentionDays} days
            </p>
          </div>
          <button
            id="close-history-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by query, relation name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--text)] placeholder:text-[var(--muted)]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-[var(--muted)]">
              <p className="font-medium text-[13px]">No saved analyses found</p>
              <p className="text-[12px] text-[var(--muted)] mt-1">
                Run an EXPLAIN plan to automatically record results
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                onClick={() => {
                  onSelectAnalysis(item);
                  onClose();
                }}
                className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--text)] transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-[var(--text)] truncate">
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAnalysis(item.id);
                    }}
                    className="p-1 text-[var(--muted)] hover:text-[#DC2626] rounded-[4px] cursor-pointer"
                    title="Delete item from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--muted)]">
                  <span>{item.total_time_ms.toFixed(2)} ms</span>
                  <span>·</span>
                  <span>{item.findings_count} finding{item.findings_count === 1 ? "" : "s"}</span>
                  <span>·</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {savedAnalyses.length > 0 && (
          <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] flex justify-between items-center">
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[12px] text-[var(--muted)] hover:text-[#DC2626] cursor-pointer"
            >
              Clear all history
            </button>
            <span className="text-[12px] text-[var(--muted)]">
              {savedAnalyses.length} item{savedAnalyses.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
