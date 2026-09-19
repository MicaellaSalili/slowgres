import React, { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { PlanNodeData } from "../types/engine";

interface NodeDetailModalProps {
  node: PlanNodeData | null;
  onClose: () => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, onClose }) => {
  const [activeTab, setActiveTab] = useState<"metrics" | "json">("metrics");
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  if (!node) return null;

  const hits = node.shared_hit_blocks || 0;
  const reads = node.shared_read_blocks || 0;
  const totalBlocks = hits + reads;
  const hitRatio = totalBlocks > 0 ? (hits / totalBlocks) * 100 : 100;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(node.raw, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1500);
  };

  return (
    <div
      id="node-detail-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        id="node-detail-card"
        className="bg-[var(--bg)] border border-[var(--border)] rounded-[8px] shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-[13px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[15px] text-[var(--text)]">
                {node.node_type}
              </span>
              <span className="font-mono text-[11px] text-[var(--muted)]">
                Path: {node.node_path}
              </span>
            </div>
            {node.relation_name && (
              <div className="text-[12px] text-[var(--muted)] mt-0.5">
                Relation: <span className="font-mono text-[var(--text)]">{node.relation_name}</span>
                {node.alias && node.alias !== node.relation_name && (
                  <span> (alias: {node.alias})</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-[var(--border)] rounded-[6px] overflow-hidden bg-[var(--bg)] p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("metrics")}
                className={`px-2.5 py-1 text-[12px] font-medium rounded-[4px] cursor-pointer transition-colors ${
                  activeTab === "metrics"
                    ? "bg-[var(--surface)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Metrics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("json")}
                className={`px-2.5 py-1 text-[12px] font-medium rounded-[4px] cursor-pointer transition-colors ${
                  activeTab === "json"
                    ? "bg-[var(--surface)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Raw JSON
              </button>
            </div>

            <button
              id="close-node-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === "metrics" ? (
            <div className="space-y-4">
              {/* Cost & Execution Time */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="text-[11px] text-[var(--muted)]">Actual time</div>
                  <div className="text-[16px] font-mono font-medium text-[var(--text)] mt-0.5">
                    {node.total_actual_time.toFixed(2)} <span className="text-[11px] text-[var(--muted)]">ms</span>
                  </div>
                </div>

                <div className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="text-[11px] text-[var(--muted)]">Exclusive time</div>
                  <div className="text-[16px] font-mono font-medium text-[var(--text)] mt-0.5">
                    {node.self_time.toFixed(2)} <span className="text-[11px] text-[var(--muted)]">ms</span>
                  </div>
                </div>

                <div className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="text-[11px] text-[var(--muted)]">Total cost</div>
                  <div className="text-[16px] font-mono font-medium text-[var(--text)] mt-0.5">
                    {Math.round(node.total_cost).toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="text-[11px] text-[var(--muted)]">Loops</div>
                  <div className="text-[16px] font-mono font-medium text-[var(--text)] mt-0.5">
                    {node.actual_loops || 1}
                  </div>
                </div>
              </div>

              {/* Rows & Estimation Accuracy */}
              <div className="p-3.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] space-y-2">
                <div className="font-medium text-[var(--text)]">Row cardinality</div>
                <div className="grid grid-cols-2 gap-4 font-mono text-[12px]">
                  <div>
                    <span className="text-[var(--muted)]">Actual rows:</span>{" "}
                    <span className="text-[var(--text)] font-semibold">
                      {node.actual_rows !== undefined ? node.actual_rows.toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Estimated rows:</span>{" "}
                    <span className="text-[var(--text)] font-semibold">
                      {node.plan_rows.toLocaleString()}
                    </span>
                  </div>
                </div>
                {node.rows_removed_by_filter !== undefined && (
                  <div className="text-[12px] text-[var(--muted)] pt-1 border-t border-[var(--border)]">
                    Rows removed by filter:{" "}
                    <span className="font-mono text-[var(--text)]">
                      {node.rows_removed_by_filter.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Buffer & Cache Statistics */}
              {totalBlocks > 0 && (
                <div className="p-3.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] space-y-2">
                  <div className="font-medium text-[var(--text)]">Buffer cache</div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[12px]">
                    <div>
                      <span className="text-[var(--muted)]">Shared hits:</span>{" "}
                      <span className="text-[var(--text)]">{hits.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Shared reads:</span>{" "}
                      <span className="text-[var(--text)]">{reads.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Hit ratio:</span>{" "}
                      <span className="text-[var(--text)]">{hitRatio.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter expression if present */}
              {node.filter && (
                <div className="space-y-1">
                  <div className="text-[12px] text-[var(--muted)]">Filter condition:</div>
                  <pre className="p-2.5 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] font-mono text-[12px] text-[var(--text)] overflow-x-auto whitespace-pre-wrap m-0">
                    {node.filter}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--muted)]">Node raw JSON:</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2 py-0.5 text-[11px] font-mono rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer flex items-center gap-1"
                >
                  {copiedJson ? <Check className="w-3 h-3 text-[var(--ok)]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedJson ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] font-mono text-[12px] text-[var(--text)] overflow-x-auto leading-relaxed max-h-[380px] m-0">
                {JSON.stringify(node.raw, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-[32px] px-3 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--text)] text-[12px] font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
