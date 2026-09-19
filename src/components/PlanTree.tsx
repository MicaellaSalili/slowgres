import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  AlertTriangle,
  AlertOctagon,
  Info,
  Maximize2,
  Database,
  Filter,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  Cpu,
  Flame,
} from "lucide-react";
import { Finding, PlanNodeData, Severity } from "../types/engine";

interface PlanTreeProps {
  root: PlanNodeData;
  totalTimeMs: number;
  findings: Finding[];
  onSelectNode: (node: PlanNodeData) => void;
}

interface TreeNodeProps {
  node: PlanNodeData;
  totalTimeMs: number;
  findingsByPath: Record<string, Finding[]>;
  onSelectNode: (node: PlanNodeData) => void;
  depth?: number;
  isLastChild?: boolean;
  searchFilter: string;
  bottlenecksOnly: boolean;
  forceExpand?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  totalTimeMs,
  findingsByPath,
  onSelectNode,
  depth = 0,
  isLastChild = false,
  searchFilter,
  bottlenecksOnly,
  forceExpand,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const children = node.plans || [];
  const hasChildren = children.length > 0;
  const nodeFindings = findingsByPath[node.node_path] || [];

  // Determine critical / warning flags
  const hasCritical = nodeFindings.some((f) => f.severity === "critical");
  const hasWarning = nodeFindings.some((f) => f.severity === "warning");
  const isBottleneck = hasCritical || hasWarning || (totalTimeMs > 0 && (node.self_time / totalTimeMs) > 0.2);

  // Filter matching
  const matchesSearch = useMemo(() => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      node.node_type.toLowerCase().includes(term) ||
      (node.relation_name && node.relation_name.toLowerCase().includes(term)) ||
      (node.index_name && node.index_name.toLowerCase().includes(term)) ||
      (node.filter && node.filter.toLowerCase().includes(term))
    );
  }, [node, searchFilter]);

  if (bottlenecksOnly && !isBottleneck && nodeFindings.length === 0) {
    // If bottlenecks only is toggled, only show if this node or its children have bottlenecks
    const hasBottleneckChild = (children: PlanNodeData[]): boolean => {
      return children.some(
        (c) =>
          findingsByPath[c.node_path]?.length > 0 ||
          (totalTimeMs > 0 && (c.self_time / totalTimeMs) > 0.2) ||
          (c.plans && hasBottleneckChild(c.plans))
      );
    };
    if (!hasBottleneckChild(children)) {
      return null;
    }
  }

  // Time metrics
  const selfTimePct = totalTimeMs > 0 ? (node.self_time / totalTimeMs) * 100 : 0;
  const totalTimePct = totalTimeMs > 0 ? (node.total_actual_time / totalTimeMs) * 100 : 0;

  // Row misestimate check
  let estimateMismatchTag: React.ReactNode = null;
  if (node.actual_rows !== undefined && node.plan_rows > 0) {
    const factor =
      node.actual_rows > node.plan_rows
        ? node.actual_rows / Math.max(1, node.plan_rows)
        : node.plan_rows / Math.max(1, node.actual_rows);
    if (factor >= 10 && Math.max(node.actual_rows, node.plan_rows) >= 500) {
      const isUnder = node.actual_rows > node.plan_rows;
      estimateMismatchTag = (
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold inline-flex items-center gap-1 ${
            factor >= 100
              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800"
              : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800"
          }`}
          title={`Planner estimated ${node.plan_rows.toLocaleString()} rows vs actual ${node.actual_rows.toLocaleString()} rows (${factor.toFixed(1)}x difference)`}
        >
          <span>{factor.toFixed(0)}x</span>
          <span>{isUnder ? "under-estimate" : "over-estimate"}</span>
        </span>
      );
    }
  }

  // Node type styling badge
  const getNodeBadgeClass = () => {
    if (hasCritical) {
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
    }
    if (hasWarning) {
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    }
    if (node.node_type.includes("Scan")) {
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
    }
    if (node.node_type.includes("Join") || node.node_type.includes("Loop")) {
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30";
    }
    if (node.node_type.includes("Sort") || node.node_type.includes("Aggregate")) {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    }
    return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
  };

  const isHighlighted = searchFilter && matchesSearch;

  return (
    <div className="relative text-xs">
      {/* Visual connector branch line if nested */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 border-l border-zinc-200 dark:border-zinc-800 hidden sm:block"
          style={{ left: `${(depth - 1) * 20 + 12}px` }}
        />
      )}

      <div
        id={`plan-node-${node.node_path.replace(/\./g, "-")}`}
        onClick={() => onSelectNode(node)}
        className={`group relative flex items-start gap-2 p-2.5 sm:p-3 rounded-xl border my-1.5 transition-all duration-150 cursor-pointer ${
          isHighlighted
            ? "ring-2 ring-amber-500 dark:ring-amber-400 shadow-md"
            : ""
        } ${
          hasCritical
            ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-950/35"
            : hasWarning
            ? "border-amber-300 dark:border-amber-900/80 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/35"
            : "border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 shadow-2xs"
        }`}
        style={{
          marginLeft: `${Math.min(depth * 14, 70)}px`,
        }}
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 mt-0.5 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-4 sm:w-5 shrink-0 flex items-center justify-center mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>
        )}

        {/* Node content block */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
            {/* Node type badge */}
            <span
              className={`px-2 sm:px-2.5 py-0.5 rounded-md text-xs font-bold font-display border ${getNodeBadgeClass()}`}
            >
              {node.node_type}
            </span>

            {/* Target relation/index */}
            {node.relation_name && (
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 font-sans text-xs">
                <Database className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">{node.relation_name}</span>
                {node.alias && node.alias !== node.relation_name && (
                  <span className="text-zinc-400 font-normal">({node.alias})</span>
                )}
              </span>
            )}

            {node.index_name && (
              <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] sm:text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 truncate max-w-[140px] sm:max-w-none">
                index: {node.index_name}
              </span>
            )}

            {/* Row misestimate pill */}
            {estimateMismatchTag}

            {/* High self-time flame badge */}
            {selfTimePct >= 30 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-current" />
                <span>{selfTimePct.toFixed(0)}% runtime</span>
              </span>
            )}

            {/* Rule warning badges */}
            {nodeFindings.map((f, idx) => (
              <span
                key={idx}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                  f.severity === "critical"
                    ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                    : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                }`}
              >
                {f.severity === "critical" ? (
                  <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span>{f.rule_id}</span>
              </span>
            ))}
          </div>

          {/* Secondary metadata row (Filter, loops, rows) */}
          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-sans">
            {node.actual_rows !== undefined && (
              <span>
                Actual Rows:{" "}
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                  {node.actual_rows.toLocaleString()}
                </strong>
                {node.actual_loops > 1 && (
                  <span className="font-mono text-zinc-400">
                    {" "}
                    (×{node.actual_loops.toLocaleString()} loops)
                  </span>
                )}
              </span>
            )}

            {node.rows_removed_by_filter !== undefined && (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                <Filter className="w-3 h-3 shrink-0" />
                <span>
                  {node.rows_removed_by_filter.toLocaleString()} discarded
                </span>
              </span>
            )}

            {node.filter && (
              <span
                className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[200px] sm:max-w-sm"
                title={node.filter}
              >
                filter: {node.filter}
              </span>
            )}
          </div>

          {/* Visual self-time bar */}
          {node.self_time > 0 && totalTimeMs > 0 && (
            <div className="mt-2 sm:mt-2.5 flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <div className="w-20 sm:w-32 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    selfTimePct > 50
                      ? "bg-rose-500"
                      : selfTimePct > 20
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, selfTimePct))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Self-Time:{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {node.self_time.toFixed(2)} ms
                </strong>{" "}
                ({selfTimePct.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        {/* Node detail inspect button (visible on mobile, hover on desktop) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode(node);
          }}
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
          title="Inspect full PostgreSQL node metrics"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recursive children rendering */}
      {!collapsed && hasChildren && (
        <div className="relative">
          {children.map((child, idx) => (
            <TreeNode
              key={idx}
              node={child}
              totalTimeMs={totalTimeMs}
              findingsByPath={findingsByPath}
              onSelectNode={onSelectNode}
              depth={depth + 1}
              isLastChild={idx === children.length - 1}
              searchFilter={searchFilter}
              bottlenecksOnly={bottlenecksOnly}
              forceExpand={forceExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PlanTree: React.FC<PlanTreeProps> = ({
  root,
  totalTimeMs,
  findings,
  onSelectNode,
}) => {
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [bottlenecksOnly, setBottlenecksOnly] = useState<boolean>(false);

  // Index findings by node path for O(1) lookup
  const findingsByPath: Record<string, Finding[]> = {};
  for (const f of findings) {
    if (!findingsByPath[f.node_path]) {
      findingsByPath[f.node_path] = [];
    }
    findingsByPath[f.node_path].push(f);
  }

  return (
    <div id="plan-tree-view" className="space-y-3">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 font-display">
            <Layers className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">Plan Hierarchy & Self-Time</span>
          </h3>
        </div>

        {/* Tree search and quick filter */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter nodes..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 w-full sm:w-48 font-sans"
            />
          </div>

          <button
            type="button"
            onClick={() => setBottlenecksOnly(!bottlenecksOnly)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              bottlenecksOnly
                ? "bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-300"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            <Flame className="w-3 h-3 text-amber-500" />
            <span>Bottlenecks Only</span>
          </button>
        </div>
      </div>

      <div className="bg-zinc-50/60 dark:bg-zinc-950/40 p-2 sm:p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <div className="min-w-[400px] sm:min-w-0">
          <TreeNode
            node={root}
            totalTimeMs={totalTimeMs}
            findingsByPath={findingsByPath}
            onSelectNode={onSelectNode}
            searchFilter={searchFilter}
            bottlenecksOnly={bottlenecksOnly}
          />
        </div>
      </div>
    </div>
  );
};
