export type Severity = "critical" | "warning" | "info";

export interface PlanNodeData {
  node_type: string;
  relation_name?: string;
  schema?: string;
  alias?: string;
  startup_cost: number;
  total_cost: number;
  plan_rows: number;
  plan_width?: number;
  actual_startup_time?: number;
  actual_total_time?: number;
  actual_rows?: number;
  actual_loops: number;
  total_actual_rows: number;
  total_actual_time: number;
  self_time: number;
  filter?: string;
  rows_removed_by_filter?: number;
  index_name?: string;
  index_cond?: string;
  hash_cond?: string;
  join_type?: string;
  sort_key?: string[];
  sort_method?: string;
  sort_space_used?: number;
  sort_space_type?: string;
  hash_batches?: number;
  hash_buckets?: number;
  shared_hit_blocks?: number;
  shared_read_blocks?: number;
  shared_dirtied_blocks?: number;
  shared_written_blocks?: number;
  node_path: string;
  plans?: PlanNodeData[];
  raw: Record<string, any>;
}

export interface Finding {
  rule_id: string;
  severity: Severity;
  node_path: string;
  title: string;
  explanation: string;
  suggestion: string;
  suggested_ddl?: string;
}

export interface PlanAnalysis {
  root: PlanNodeData;
  planning_time_ms?: number;
  execution_time_ms?: number;
  findings: Finding[];
  total_cost: number;
  total_time_ms: number;
  node_count: number;
}

export interface SavedAnalysis {
  id: string;
  created_at: string;
  title: string;
  query_text?: string;
  total_time_ms: number;
  planning_time_ms?: number;
  findings_count: number;
  critical_count: number;
  analysis: PlanAnalysis;
}

export interface Entitlements {
  plan: "free" | "premium";
  daily_limit: number;
  daily_used: number;
  history_retention_days: number;
  can_export: boolean;
  show_ads: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: "google" | "email";
  created_at: string;
  is_verified: boolean;
  plan: "free" | "premium";
  analyses_performed?: number;
}
