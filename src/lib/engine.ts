import { Finding, PlanAnalysis, PlanNodeData, Severity } from "../types/engine";

/**
 * Extracts column names from Postgres filter/index expressions.
 */
function extractColumnsFromExpression(expr: string): string[] {
  if (!expr) return [];
  // Strip casts, operators, literals, and function parens
  const cleaned = expr
    .replace(/::[a-zA-Z0-9_]+/g, "")
    .replace(/'[^']*'/g, "")
    .replace(/\b\d+(\.\d+)?\b/g, "");

  const words = cleaned.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const reserved = new Set([
    "and", "or", "not", "null", "is", "true", "false", "case", "when", "then",
    "else", "end", "in", "like", "ilike", "between", "current_date", "now",
    "text", "integer", "bigint", "date", "timestamp", "varchar", "numeric"
  ]);

  const seen = new Set<string>();
  const columns: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!reserved.has(lower) && !seen.has(lower)) {
      seen.add(lower);
      columns.push(word);
    }
  }
  return columns;
}

/**
 * Generates an index suggestion for a sequential or index scan node.
 */
function suggestIndex(tableName: string, filterExpr?: string, indexCond?: string): string {
  const table = tableName || "table_name";
  const cols = extractColumnsFromExpression(filterExpr || indexCond || "");
  const colList = cols.length > 0 ? cols.join(", ") : "column_name";
  const indexName = `idx_${table.replace(/[^a-zA-Z0-9_]/g, "_")}_${cols.slice(0, 3).join("_") || "query"}`;
  return `CREATE INDEX CONCURRENTLY ${indexName} ON ${table} (${colList});`;
}

/**
 * Recursively parses Postgres JSON plan node into unified PlanNodeData.
 */
function parseRawNode(raw: Record<string, any>, path: string = "0"): PlanNodeData {
  const nodeType = raw["Node Type"] || "Unknown";
  const relationName = raw["Relation Name"];
  const schema = raw["Schema"];
  const alias = raw["Alias"];
  const startupCost = Number(raw["Startup Cost"] || 0);
  const totalCost = Number(raw["Total Cost"] || 0);
  const planRows = Number(raw["Plan Rows"] || 0);
  const planWidth = raw["Plan Width"] ? Number(raw["Plan Width"]) : undefined;

  const actualStartupTime = raw["Actual Startup Time"] !== undefined ? Number(raw["Actual Startup Time"]) : undefined;
  const actualTotalTime = raw["Actual Total Time"] !== undefined ? Number(raw["Actual Total Time"]) : undefined;
  const actualRows = raw["Actual Rows"] !== undefined ? Number(raw["Actual Rows"]) : undefined;
  const actualLoops = Math.max(1, Number(raw["Actual Loops"] || 1));

  const totalActualRows = (actualRows !== undefined ? actualRows : planRows) * actualLoops;
  const totalActualTime = (actualTotalTime !== undefined ? actualTotalTime : 0) * actualLoops;

  const rawChildren = Array.isArray(raw["Plans"]) ? raw["Plans"] : [];
  const children: PlanNodeData[] = rawChildren.map((child: Record<string, any>, idx: number) =>
    parseRawNode(child, `${path}.${idx}`)
  );

  // Exclusive self time = total time - sum(children total time)
  const childrenTotalTime = children.reduce((acc, c) => acc + c.total_actual_time, 0);
  const selfTime = Math.max(0, totalActualTime - childrenTotalTime);

  return {
    node_type: nodeType,
    relation_name: relationName,
    schema,
    alias,
    startup_cost: startupCost,
    total_cost: totalCost,
    plan_rows: planRows,
    plan_width: planWidth,
    actual_startup_time: actualStartupTime,
    actual_total_time: actualTotalTime,
    actual_rows: actualRows,
    actual_loops: actualLoops,
    total_actual_rows: totalActualRows,
    total_actual_time: totalActualTime,
    self_time: selfTime,
    filter: raw["Filter"],
    rows_removed_by_filter: raw["Rows Removed by Filter"] !== undefined ? Number(raw["Rows Removed by Filter"]) : undefined,
    index_name: raw["Index Name"],
    index_cond: raw["Index Cond"],
    hash_cond: raw["Hash Cond"],
    join_type: raw["Join Type"],
    sort_key: Array.isArray(raw["Sort Key"]) ? raw["Sort Key"] : undefined,
    sort_method: raw["Sort Method"],
    sort_space_used: raw["Sort Space Used"] !== undefined ? Number(raw["Sort Space Used"]) : undefined,
    sort_space_type: raw["Sort Space Type"],
    hash_batches: raw["Hash Batches"] !== undefined ? Number(raw["Hash Batches"]) : undefined,
    hash_buckets: raw["Hash Buckets"] !== undefined ? Number(raw["Hash Buckets"]) : undefined,
    shared_hit_blocks: raw["Shared Hit Blocks"] !== undefined ? Number(raw["Shared Hit Blocks"]) : undefined,
    shared_read_blocks: raw["Shared Read Blocks"] !== undefined ? Number(raw["Shared Read Blocks"]) : undefined,
    shared_dirtied_blocks: raw["Shared Dirtied Blocks"] !== undefined ? Number(raw["Shared Dirtied Blocks"]) : undefined,
    shared_written_blocks: raw["Shared Written Blocks"] !== undefined ? Number(raw["Shared Written Blocks"]) : undefined,
    node_path: path,
    plans: children,
    raw,
  };
}

/**
 * Flatten tree to walk all nodes.
 */
export function flattenPlanTree(root: PlanNodeData): PlanNodeData[] {
  const result: PlanNodeData[] = [root];
  if (root.plans && root.plans.length > 0) {
    for (const child of root.plans) {
      result.push(...flattenPlanTree(child));
    }
  }
  return result;
}

/**
 * Diagnostic Rules Engine
 */
function runRules(root: PlanNodeData, totalExecutionTime: number): Finding[] {
  const findings: Finding[] = [];
  const nodes = flattenPlanTree(root);

  for (const node of nodes) {
    // Rule 1: seq_scan_filtered
    if (node.node_type === "Seq Scan" && node.rows_removed_by_filter && node.rows_removed_by_filter >= 1000) {
      const scannedTotal = (node.actual_rows || 0) + node.rows_removed_by_filter;
      const removedRatio = scannedTotal > 0 ? node.rows_removed_by_filter / scannedTotal : 0;
      if (removedRatio >= 0.5) {
        findings.push({
          rule_id: "seq_scan_filtered",
          severity: "critical",
          node_path: node.node_path,
          title: `Heavily filtered Seq Scan on '${node.relation_name || node.alias}' (${(removedRatio * 100).toFixed(0)}% rows discarded)`,
          explanation: `Sequential scan on '${node.relation_name || "table"}' scanned ${scannedTotal.toLocaleString()} rows but discarded ${node.rows_removed_by_filter.toLocaleString()} rows (${(removedRatio * 100).toFixed(1)}%) via filter: ${node.filter || "predicate"}. Scanning and filtering unindexed heap pages consumes unnecessary disk I/O and buffer cache.`,
          suggestion: `Add a targeted index on the filtered column(s) of '${node.relation_name || "table"}' to permit an Index Scan instead.`,
          suggested_ddl: suggestIndex(node.relation_name || node.alias || "", node.filter),
        });
      }
    }

    // Rule 2: row_estimate_mismatch
    if (node.actual_rows !== undefined && node.plan_rows > 0) {
      const actual = node.actual_rows;
      const estimated = node.plan_rows;
      const factor = actual > estimated ? actual / Math.max(1, estimated) : estimated / Math.max(1, actual);

      if (factor >= 10.0 && Math.max(actual, estimated) >= 500) {
        const direction = actual > estimated ? "under-estimated" : "over-estimated";
        findings.push({
          rule_id: "row_estimate_mismatch",
          severity: factor >= 100 ? "critical" : "warning",
          node_path: node.node_path,
          title: `Planner row estimate mismatch (${factor.toFixed(0)}x ${direction}) on ${node.node_type}`,
          explanation: `The PostgreSQL query planner estimated ${estimated.toLocaleString()} rows for ${node.node_type} (path: ${node.node_path}), but actual execution produced ${actual.toLocaleString()} rows (${factor.toFixed(1)}x difference). Significant row misestimates lead the planner to choose suboptimal join strategies (e.g. nested loops over hash joins) or inappropriate scan types.`,
          suggestion: `Update PostgreSQL table statistics on '${node.relation_name || "the affected table"}' using ANALYZE. If data distribution is skewed, increase statistics targets.`,
          suggested_ddl: node.relation_name ? `ANALYZE ${node.relation_name};` : `ANALYZE;`,
        });
      }
    }

    // Rule 3: sort_spill_to_disk
    if (node.node_type === "Sort") {
      const isDisk =
        node.sort_space_type?.toLowerCase() === "disk" ||
        node.sort_method?.toLowerCase().includes("external");
      if (isDisk) {
        const mb = node.sort_space_used ? (node.sort_space_used / 1024).toFixed(1) : "unknown";
        findings.push({
          rule_id: "sort_spill_to_disk",
          severity: "critical",
          node_path: node.node_path,
          title: `Sort operation spilled to disk (${mb} MB)`,
          explanation: `The Sort node ran out of memory allocated by 'work_mem' and performed an ${node.sort_method || "external merge"} on disk using ${mb} MB of temporary disk space. Writing intermediate sort runs to disk degrades query performance significantly.`,
          suggestion: `Increase the 'work_mem' setting for this session or database so the sort can fit entirely into fast RAM. Alternatively, create an index on the ORDER BY expression to eliminate sorting entirely.`,
          suggested_ddl: `SET work_mem = '64MB';`,
        });
      }
    }

    // Rule 4: hash_multiple_batches
    if (node.node_type === "Hash" || node.node_type === "Hash Join") {
      if (node.hash_batches && node.hash_batches > 1) {
        findings.push({
          rule_id: "hash_multiple_batches",
          severity: "warning",
          node_path: node.node_path,
          title: `Hash join partitioned into ${node.hash_batches} batches`,
          explanation: `The Hash join exceeded the memory limit and split the hash table across ${node.hash_batches} batches. Multi-batch hash joins require writing and reading partition files to and from disk.`,
          suggestion: `Increase 'work_mem' to allow the complete hash table to reside in a single in-memory batch.`,
          suggested_ddl: `SET work_mem = '32MB';`,
        });
      }
    }

    // Rule 5: nested_loop_heavy
    if (node.node_type === "Nested Loop") {
      const isHeavy =
        node.self_time > 50 ||
        (totalExecutionTime > 0 && node.self_time / totalExecutionTime > 0.3) ||
        (node.plans && node.plans.some((child) => child.actual_loops >= 500));
      if (isHeavy) {
        findings.push({
          rule_id: "nested_loop_heavy",
          severity: "warning",
          node_path: node.node_path,
          title: `High-latency Nested Loop join (${node.self_time.toFixed(1)} ms self-time)`,
          explanation: `Nested Loop join consumed significant execution time (${node.self_time.toFixed(1)} ms). Nested loops repeat the inner scan for every outer row. If the inner relation lacks an efficient index or if the planner under-estimated outer rows, execution time explodes quadratically.`,
          suggestion: `Ensure the inner table has an index matching the join key. If statistics are current, test if a Hash Join or Merge Join performs faster.`,
          suggested_ddl: node.plans && node.plans[1]?.relation_name ? `ANALYZE ${node.plans[1].relation_name};` : undefined,
        });
      }
    }

    // Rule 6: filter_after_index_scan
    if (
      (node.node_type === "Index Scan" ||
        node.node_type === "Index Only Scan" ||
        node.node_type === "Bitmap Heap Scan") &&
      node.rows_removed_by_filter &&
      node.rows_removed_by_filter >= 1000
    ) {
      const returned = node.actual_rows || 0;
      const total = returned + node.rows_removed_by_filter;
      const ratio = total > 0 ? node.rows_removed_by_filter / total : 0;
      if (ratio >= 0.3) {
        findings.push({
          rule_id: "filter_after_index_scan",
          severity: "warning",
          node_path: node.node_path,
          title: `Inefficient Index Scan on '${node.relation_name || node.alias}' (${(ratio * 100).toFixed(0)}% rows removed post-index)`,
          explanation: `Index scan on '${node.relation_name || "table"}' using index '${node.index_name || "index"}' fetched rows from heap, but then discarded ${node.rows_removed_by_filter.toLocaleString()} rows (${(ratio * 100).toFixed(1)}%) via secondary filter: ${node.filter || "predicate"}.`,
          suggestion: `Create a composite multi-column index that includes both the index condition and the filtered columns to filter directly in the b-tree.`,
          suggested_ddl: suggestIndex(node.relation_name || node.alias || "", `${node.index_cond || ""} AND ${node.filter || ""}`),
        });
      }
    }
  }

  // Sort critical first, then warning, then info
  const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return findings;
}

/**
 * Public Parser Entry Point
 */
export function parsePlanJson(input: string): PlanAnalysis {
  let parsed: any;
  try {
    parsed = JSON.parse(input);
  } catch (e: any) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }

  let rootRaw: Record<string, any> | null = null;
  let planningTime: number | undefined;
  let executionTime: number | undefined;

  if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    if (first && typeof first === "object") {
      rootRaw = first["Plan"] || first;
      planningTime = first["Planning Time"] !== undefined ? Number(first["Planning Time"]) : undefined;
      executionTime = first["Execution Time"] !== undefined ? Number(first["Execution Time"]) : undefined;
    }
  } else if (parsed && typeof parsed === "object") {
    rootRaw = parsed["Plan"] || parsed;
    planningTime = parsed["Planning Time"] !== undefined ? Number(parsed["Planning Time"]) : undefined;
    executionTime = parsed["Execution Time"] !== undefined ? Number(parsed["Execution Time"]) : undefined;
  }

  if (!rootRaw || !rootRaw["Node Type"]) {
    throw new Error("Could not find a valid 'Plan' object or 'Node Type' in the provided JSON.");
  }

  const root = parseRawNode(rootRaw, "0");
  const allNodes = flattenPlanTree(root);
  const totalCost = root.total_cost;
  const totalTime = executionTime !== undefined ? executionTime : root.total_actual_time;

  const findings = runRules(root, totalTime);

  return {
    root,
    planning_time_ms: planningTime,
    execution_time_ms: executionTime,
    findings,
    total_cost: totalCost,
    total_time_ms: totalTime,
    node_count: allNodes.length,
  };
}

/**
 * Formats analysis as a Markdown report for exporting or sharing.
 */
export function formatMarkdownReport(analysis: PlanAnalysis, queryText?: string): string {
  const criticals = analysis.findings.filter((f) => f.severity === "critical").length;
  const warnings = analysis.findings.filter((f) => f.severity === "warning").length;
  const infos = analysis.findings.filter((f) => f.severity === "info").length;

  let md = `# Slowgres Analysis Report\n\n`;
  md += `> A slow-query analyzer for PostgreSQL. Find out why it's slow.\n\n`;

  if (queryText) {
    md += `### Query SQL\n\`\`\`sql\n${queryText.trim()}\n\`\`\`\n\n`;
  }

  md += `### Execution Metrics\n`;
  md += `- **Total Execution Time:** ${analysis.total_time_ms.toFixed(2)} ms\n`;
  if (analysis.planning_time_ms !== undefined) {
    md += `- **Planning Time:** ${analysis.planning_time_ms.toFixed(2)} ms\n`;
  }
  md += `- **Total Estimated Cost:** ${analysis.total_cost.toLocaleString()}\n`;
  md += `- **Total Plan Nodes:** ${analysis.node_count}\n`;
  md += `- **Summary:** ${criticals} Critical, ${warnings} Warning, ${infos} Info\n\n`;

  md += `### Performance Findings & Suggestions\n\n`;
  if (analysis.findings.length === 0) {
    md += `*No performance anti-patterns detected in this query plan!*\n\n`;
  } else {
    analysis.findings.forEach((f, idx) => {
      md += `#### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n`;
      md += `- **Node Path:** \`${f.node_path}\`\n`;
      md += `- **Rule ID:** \`${f.rule_id}\`\n`;
      md += `- **Explanation:** ${f.explanation}\n`;
      md += `- **Suggestion:** ${f.suggestion}\n`;
      if (f.suggested_ddl) {
        md += `\n\`\`\`sql\n${f.suggested_ddl}\n\`\`\`\n`;
      }
      md += `\n`;
    });
  }

  return md;
}

/**
 * Searches the plan tree to find a node by its node_path.
 */
export function findNodeByPath(root: PlanNodeData, path: string): PlanNodeData | null {
  if (root.node_path === path) return root;
  if (root.plans) {
    for (const child of root.plans) {
      const found = findNodeByPath(child, path);
      if (found) return found;
    }
  }
  return null;
}
