import React, { useState } from "react";
import {
  X,
  Clock,
  Database,
  HardDrive,
  Cpu,
  Terminal,
  Layers,
  Filter,
  Code,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
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
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div
      id="node-detail-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/70 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="node-detail-card"
        className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden text-xs transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-950/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 font-display">
                {node.node_type}
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] sm:text-[11px] bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/60 dark:border-zinc-700/60 truncate">
                path: {node.node_path}
              </span>
            </div>
            {node.relation_name && (
              <p className="text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 font-sans text-xs truncate">
                <Database className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Target:</span>
                <strong className="text-zinc-900 dark:text-zinc-100 font-semibold truncate">{node.relation_name}</strong>
                {node.alias && node.alias !== node.relation_name && (
                  <span className="text-zinc-400 font-normal">({node.alias})</span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* View Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("metrics")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === "metrics"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Metrics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("json")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === "json"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Raw JSON
              </button>
            </div>

            <button
              id="close-node-detail-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 font-sans">
          {activeTab === "json" ? (
            <div className="relative">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-mono text-zinc-500">PostgreSQL Node Dict</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 sm:p-4 rounded-xl bg-zinc-900 dark:bg-zinc-950 text-zinc-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-zinc-800 max-h-[50vh]">
                {JSON.stringify(node.raw, null, 2)}
              </pre>
            </div>
          ) : (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 uppercase font-medium tracking-wider">Total Time</span>
                  <div className="font-mono text-zinc-900 dark:text-zinc-100 font-bold text-xs sm:text-sm mt-0.5 sm:mt-1">
                    {node.actual_total_time !== undefined ? `${node.actual_total_time.toFixed(2)} ms` : "N/A"}
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 uppercase font-medium tracking-wider">Self-Time</span>
                  <div className="font-mono text-zinc-900 dark:text-zinc-100 font-bold text-xs sm:text-sm mt-0.5 sm:mt-1">
                    {node.self_time.toFixed(2)} ms
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 uppercase font-medium tracking-wider">Actual Rows</span>
                  <div className="font-mono text-zinc-900 dark:text-zinc-100 font-bold text-xs sm:text-sm mt-0.5 sm:mt-1">
                    {node.actual_rows !== undefined ? node.actual_rows.toLocaleString() : "N/A"}
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 uppercase font-medium tracking-wider">Loops</span>
                  <div className="font-mono text-zinc-900 dark:text-zinc-100 font-bold text-xs sm:text-sm mt-0.5 sm:mt-1">
                    {node.actual_loops.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Planner Estimates vs Actuals */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 space-y-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs font-display flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cost & Row Estimation Accuracy</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                    <span className="text-zinc-400">Estimated Plan Rows:</span>{" "}
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {node.plan_rows.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                    <span className="text-zinc-400">Actual Executed Rows:</span>{" "}
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {node.actual_rows !== undefined ? node.actual_rows.toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                    <span className="text-zinc-400">Startup Cost .. Total:</span>{" "}
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {node.startup_cost.toFixed(1)} .. {node.total_cost.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                    <span className="text-zinc-400">Average Row Width:</span>{" "}
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {node.plan_width ? `${node.plan_width} bytes` : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter & Index Details */}
              {(node.filter || node.index_cond || node.hash_cond) && (
                <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 space-y-3">
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs font-display flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-amber-500" />
                    <span>Scan Conditions & Discard Metrics</span>
                  </h4>
                  {node.filter && (
                    <div className="space-y-1.5">
                      <div className="text-zinc-400 text-xs">Table Filter Expression:</div>
                      <pre className="p-3 rounded-xl bg-zinc-900 dark:bg-zinc-950 font-mono text-[11px] overflow-x-auto text-amber-300 dark:text-amber-400 border border-zinc-800">
                        {node.filter}
                      </pre>
                      {node.rows_removed_by_filter !== undefined && (
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-mono text-xs mt-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Discarded {node.rows_removed_by_filter.toLocaleString()} rows after reading from disk/memory
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {node.index_cond && (
                    <div className="space-y-1.5">
                      <div className="text-zinc-400 text-xs">Index Condition:</div>
                      <pre className="p-3 rounded-xl bg-zinc-900 dark:bg-zinc-950 font-mono text-[11px] overflow-x-auto text-blue-300 dark:text-blue-400 border border-zinc-800">
                        {node.index_cond}
                      </pre>
                    </div>
                  )}

                  {node.hash_cond && (
                    <div className="space-y-1.5">
                      <div className="text-zinc-400 text-xs">Hash Condition:</div>
                      <pre className="p-3 rounded-xl bg-zinc-900 dark:bg-zinc-950 font-mono text-[11px] overflow-x-auto text-purple-300 dark:text-purple-400 border border-zinc-800">
                        {node.hash_cond}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Buffer Cache Statistics with visual progress bar */}
              {totalBlocks > 0 && (
                <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs font-display flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                      <span>PostgreSQL Buffer Cache Efficiency</span>
                    </h4>
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {hitRatio.toFixed(1)}% Cache Hit Ratio
                    </span>
                  </div>

                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${hitRatio}%` }}
                      title={`Cache Hits: ${hits.toLocaleString()} pages`}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${100 - hitRatio}%` }}
                      title={`Disk Reads: ${reads.toLocaleString()} pages`}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs pt-1">
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Shared Hit (RAM):</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {hits.toLocaleString()} blocks
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Shared Read (Disk):</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {reads.toLocaleString()} blocks
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Shared Dirtied:</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {node.shared_dirtied_blocks || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Shared Written:</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {node.shared_written_blocks || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
            Node Path: {node.node_path}
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-white transition-all cursor-pointer shadow-sm text-xs font-display text-center"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
