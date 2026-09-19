import React, { useState, useMemo } from "react";
import { Finding, Severity } from "../types/engine";

interface FindingsListProps {
  findings: Finding[];
  onSelectNodePath?: (nodePath: string) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings, onSelectNodePath }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Severity ordering: critical -> warning -> info
  const sortedFindings = useMemo(() => {
    const priority: Record<Severity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    return [...findings].sort((a, b) => priority[a.severity] - priority[b.severity]);
  }, [findings]);

  if (findings.length === 0) {
    return (
      <div className="p-4 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--muted)]">
        No performance issues detected. Execution plan looks optimal.
      </div>
    );
  }

  return (
    <div id="findings-container" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">
          Findings ({findings.length})
        </h3>
      </div>

      <div className="space-y-2.5">
        {sortedFindings.map((finding, idx) => {
          const isCritical = finding.severity === "critical";
          const isWarning = finding.severity === "warning";
          const borderColorClass = isCritical
            ? "border-l-[#DC2626]"
            : isWarning
            ? "border-l-[#D97706]"
            : "border-l-[#2563EB]";

          return (
            <div
              key={idx}
              id={`finding-card-${idx}`}
              className={`p-3.5 rounded-[6px] border border-[var(--border)] ${borderColorClass} border-l-[3px] bg-[var(--bg)] text-[13px] space-y-2`}
            >
              {/* Title & Node Path */}
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-[var(--text)] text-[14px]">
                  {finding.title}
                </div>
                <div className="text-[11px] font-mono text-[var(--muted)] shrink-0">
                  {onSelectNodePath ? (
                    <button
                      type="button"
                      onClick={() => onSelectNodePath(finding.node_path)}
                      className="text-[var(--accent)] hover:underline cursor-pointer"
                      title="Inspect target node in plan tree"
                    >
                      Node: {finding.node_path}
                    </button>
                  ) : (
                    <span>Node: {finding.node_path}</span>
                  )}
                </div>
              </div>

              {/* Plain-language explanation */}
              <p className="text-[var(--muted)] text-[13px] leading-relaxed m-0">
                {finding.explanation}
              </p>

              {/* Suggested remediation text */}
              {finding.suggestion && (
                <p className="text-[var(--text)] text-[12px] leading-relaxed m-0">
                  <span className="font-medium">Remediation:</span> {finding.suggestion}
                </p>
              )}

              {/* Suggested DDL */}
              {finding.suggested_ddl && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--muted)]">
                      Suggested index. Verify before applying.
                    </span>
                    <button
                      type="button"
                      id={`copy-ddl-btn-${idx}`}
                      onClick={() => handleCopy(finding.suggested_ddl!, idx)}
                      className="px-2 py-0.5 text-[11px] font-mono rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer"
                    >
                      {copiedIndex === idx ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] font-mono text-[12px] text-[var(--text)] overflow-x-auto whitespace-pre-wrap leading-relaxed m-0">
                    {finding.suggested_ddl}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
