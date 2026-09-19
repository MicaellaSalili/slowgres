import React, { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Zap,
  Code2,
  Filter,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Finding, Severity } from "../types/engine";

interface FindingsListProps {
  findings: Finding[];
  onSelectNodePath?: (nodePath: string) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings, onSelectNodePath }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | Severity>("all");

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;

  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity === "all") return true;
    return f.severity === selectedSeverity;
  });

  return (
    <div id="findings-container" className="space-y-4">
      {/* Header and Filter Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 font-display">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            <span>Bottleneck Findings & Remediations</span>
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
            {findings.length}
          </span>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs overflow-x-auto scrollbar-none max-w-full">
          <button
            type="button"
            onClick={() => setSelectedSeverity("all")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              selectedSeverity === "all"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            All ({findings.length})
          </button>
          {criticalCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSeverity("critical")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                selectedSeverity === "critical"
                  ? "bg-rose-500 text-white shadow-2xs font-semibold"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              <AlertOctagon className="w-3 h-3" />
              <span>Critical ({criticalCount})</span>
            </button>
          )}
          {warningCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSeverity("warning")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                selectedSeverity === "warning"
                  ? "bg-amber-500 text-zinc-950 shadow-2xs font-semibold"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Warning ({warningCount})</span>
            </button>
          )}
          {infoCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSeverity("info")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                selectedSeverity === "info"
                  ? "bg-blue-500 text-white shadow-2xs font-semibold"
                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              }`}
            >
              <Info className="w-3 h-3" />
              <span>Info ({infoCount})</span>
            </button>
          )}
        </div>
      </div>

      {findings.length === 0 ? (
        <div className="p-8 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="font-bold text-sm mb-1 font-display">
            Clean Query Plan: No Performance Anti-Patterns Detected
          </div>
          <p className="text-emerald-700/90 dark:text-emerald-300/80 text-xs max-w-lg mx-auto leading-relaxed font-sans">
            The planner utilized efficient index scans, accurate row cardinality estimates, and in-memory execution without table scans or work_mem disk spills.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding, idx) => {
            const isCritical = finding.severity === "critical";
            const isWarning = finding.severity === "warning";

            return (
              <div
                key={idx}
                id={`finding-card-${idx}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 shadow-2xs ${
                  isCritical
                    ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/25 dark:bg-rose-950/15"
                    : isWarning
                    ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                }`}
              >
                {/* Finding title and severity */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        isCritical
                          ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                          : isWarning
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                          : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {isCritical ? (
                        <AlertOctagon className="w-4 h-4" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm font-display tracking-tight">
                        {finding.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[10px] sm:text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 font-semibold">
                          {finding.rule_id}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        {onSelectNodePath ? (
                          <button
                            type="button"
                            onClick={() => onSelectNodePath(finding.node_path)}
                            className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            title="Inspect node details"
                          >
                            <span>Path: {finding.node_path}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span>Path: {finding.node_path}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2 sm:px-2.5 py-0.5 rounded-md uppercase font-mono text-[9px] sm:text-[10px] font-bold tracking-wider ${
                      isCritical
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                        : isWarning
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                    }`}
                  >
                    {finding.severity}
                  </span>
                </div>

                {/* Explanation */}
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3.5 pl-1 font-sans">
                  {finding.explanation}
                </p>

                {/* Recommendation & Suggested DDL */}
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 text-xs space-y-2">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 font-display">
                    <Code2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Recommended Remediation:</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed font-sans">
                    {finding.suggestion}
                  </p>

                  {finding.suggested_ddl && (
                    <div className="relative mt-2.5">
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-t-xl bg-zinc-800 text-[11px] font-mono text-zinc-300 border-x border-t border-zinc-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                          <span>PostgreSQL Optimization DDL</span>
                        </span>
                        <button
                          id={`copy-ddl-btn-${idx}`}
                          type="button"
                          onClick={() => handleCopy(finding.suggested_ddl!, idx)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 hover:text-white transition-colors cursor-pointer text-[11px]"
                          title="Copy DDL SQL to clipboard"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy DDL</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 rounded-b-xl bg-zinc-900 dark:bg-zinc-950 text-amber-300 dark:text-amber-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-zinc-700 dark:border-zinc-800 shadow-inner-xs">
                        {finding.suggested_ddl}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
