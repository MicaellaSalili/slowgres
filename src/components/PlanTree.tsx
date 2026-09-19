import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Finding, PlanNodeData } from "../types/engine";

interface PlanTreeProps {
  root: PlanNodeData;
  totalTimeMs: number;
  findings: Finding[];
  onSelectNode: (node: PlanNodeData) => void;
}

interface TreeRowProps {
  node: PlanNodeData;
  depth: number;
  totalTimeMs: number;
  findingsByPath: Record<string, Finding[]>;
  onSelectNode: (node: PlanNodeData) => void;
  collapsedPaths: Set<string>;
  onToggleCollapse: (path: string) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
  node,
  depth,
  totalTimeMs,
  findingsByPath,
  onSelectNode,
  collapsedPaths,
  onToggleCollapse,
}) => {
  const children = node.plans || [];
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedPaths.has(node.node_path);
  const nodeFindings = findingsByPath[node.node_path] || [];

  const hasCritical = nodeFindings.some((f) => f.severity === "critical");
  const hasWarning = nodeFindings.some((f) => f.severity === "warning");

  const timePct = totalTimeMs > 0 ? (node.total_actual_time / totalTimeMs) * 100 : 0;

  return (
    <>
      <div
        id={`tree-row-${node.node_path.replace(/\./g, "-")}`}
        onClick={() => onSelectNode(node)}
        className="flex items-center text-[13px] border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)] cursor-pointer transition-colors py-2 px-3 group"
      >
        {/* Node type & relation */}
        <div
          className="flex-1 flex items-center gap-1.5 min-w-0 pr-3"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isCollapsed ? "Expand node" : "Collapse node"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(node.node_path);
              }}
              className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5 inline-block" />
          )}

          <span className="font-mono text-[13px] font-medium text-[var(--text)] truncate">
            {node.node_type}
          </span>

          {node.relation_name && (
            <span className="text-[var(--muted)] truncate">
              on <span className="font-mono text-[var(--text)]">{node.relation_name}</span>
            </span>
          )}

          {node.index_name && (
            <span className="text-[var(--muted)] text-[12px] truncate hidden md:inline">
              using <span className="font-mono">{node.index_name}</span>
            </span>
          )}

          {/* Finding indicator */}
          {hasCritical && (
            <span
              className="px-1 py-0.2 text-[10px] font-mono font-medium rounded bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 ml-1 shrink-0"
              title="Critical issue detected on this node"
            >
              critical
            </span>
          )}
          {!hasCritical && hasWarning && (
            <span
              className="px-1 py-0.2 text-[10px] font-mono font-medium rounded bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/30 ml-1 shrink-0"
              title="Warning issue detected on this node"
            >
              warning
            </span>
          )}
        </div>

        {/* Actual Time */}
        <div className="w-[120px] sm:w-[140px] text-right font-mono tabular-nums text-[12px] text-[var(--text)] shrink-0 pr-4">
          <div>{node.total_actual_time.toFixed(2)} ms</div>
          {/* Thin inline time bar in muted tone */}
          <div className="w-full h-[3px] bg-[var(--border)] rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-[var(--muted)]"
              style={{ width: `${Math.min(100, Math.max(3, timePct))}%` }}
            />
          </div>
        </div>

        {/* Rows */}
        <div className="w-[80px] sm:w-[100px] text-right font-mono tabular-nums text-[12px] text-[var(--text)] shrink-0 pr-4">
          <div>{node.actual_rows !== undefined ? node.actual_rows.toLocaleString() : "-"}</div>
          {node.plan_rows !== undefined && node.actual_rows !== undefined && (
            <div className="text-[10px] text-[var(--muted)]">
              est: {node.plan_rows.toLocaleString()}
            </div>
          )}
        </div>

        {/* Loops */}
        <div className="w-[50px] sm:w-[60px] text-right font-mono tabular-nums text-[12px] text-[var(--muted)] shrink-0">
          {node.actual_loops || 1}
        </div>
      </div>

      {/* Children */}
      {!isCollapsed &&
        children.map((child) => (
          <TreeRow
            key={child.node_path}
            node={child}
            depth={depth + 1}
            totalTimeMs={totalTimeMs}
            findingsByPath={findingsByPath}
            onSelectNode={onSelectNode}
            collapsedPaths={collapsedPaths}
            onToggleCollapse={onToggleCollapse}
          />
        ))}
    </>
  );
};

export const PlanTree: React.FC<PlanTreeProps> = ({
  root,
  totalTimeMs,
  findings,
  onSelectNode,
}) => {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());

  const findingsByPath = React.useMemo(() => {
    const map: Record<string, Finding[]> = {};
    findings.forEach((f) => {
      if (!map[f.node_path]) map[f.node_path] = [];
      map[f.node_path].push(f);
    });
    return map;
  }, [findings]);

  const toggleCollapse = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const collapseAll = () => {
    const paths = new Set<string>();
    const collect = (n: PlanNodeData) => {
      if (n.plans && n.plans.length > 0) {
        paths.add(n.node_path);
        n.plans.forEach(collect);
      }
    };
    collect(root);
    setCollapsedPaths(paths);
  };

  const expandAll = () => {
    setCollapsedPaths(new Set());
  };

  return (
    <div id="plan-tree-container" className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">
          Execution plan tree
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-[12px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            Expand all
          </button>
          <span className="text-[var(--border)]">·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[12px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] overflow-x-auto">
        {/* Table Header */}
        <div className="flex items-center text-[11px] font-medium text-[var(--muted)] border-b border-[var(--border)] bg-[var(--surface)] py-2 px-3 uppercase tracking-wider">
          <div className="flex-1">Node & Relation</div>
          <div className="w-[120px] sm:w-[140px] text-right pr-4">Actual Time</div>
          <div className="w-[80px] sm:w-[100px] text-right pr-4">Rows</div>
          <div className="w-[50px] sm:w-[60px] text-right">Loops</div>
        </div>

        {/* Tree Rows */}
        <div className="divide-y divide-[var(--border)]">
          <TreeRow
            node={root}
            depth={0}
            totalTimeMs={totalTimeMs}
            findingsByPath={findingsByPath}
            onSelectNode={onSelectNode}
            collapsedPaths={collapsedPaths}
            onToggleCollapse={toggleCollapse}
          />
        </div>
      </div>
    </div>
  );
};
