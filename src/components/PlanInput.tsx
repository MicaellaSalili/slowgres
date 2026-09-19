import React, { useState, useRef, useEffect } from "react";
import { Upload, Copy, Check } from "lucide-react";
import { SAMPLE_PLANS, SamplePlan } from "../lib/samplePlans";
import { Entitlements, UserAccount } from "../types/engine";

interface PlanInputProps {
  onAnalyze: (jsonInput: string, querySql?: string) => void;
  isLoading: boolean;
  error?: string | null;
  initialJson?: string;
  initialSql?: string;
  onClearError?: () => void;
  entitlements: Entitlements;
  user: UserAccount | null;
  onOpenUpgrade?: () => void;
}

export const PlanInput: React.FC<PlanInputProps> = ({
  onAnalyze,
  isLoading,
  error,
  initialJson,
  initialSql,
  onClearError,
  entitlements,
  user,
  onOpenUpgrade,
}) => {
  const [jsonContent, setJsonContent] = useState<string>(initialJson || SAMPLE_PLANS[0].json);
  const [querySql, setQuerySql] = useState<string>(initialSql || SAMPLE_PLANS[0].query);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    initialJson ? "custom" : SAMPLE_PLANS[0].id
  );
  const [copiedFormat, setCopiedFormat] = useState<boolean>(false);
  const [copiedCommand, setCopiedCommand] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Platform check for keyboard shortcut
  const isMac =
    typeof navigator !== "undefined" &&
    /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
  const shortcutLabel = isMac ? "⌘↵" : "Ctrl+Enter";

  // Sync if initial props change
  useEffect(() => {
    if (initialJson !== undefined && initialJson !== jsonContent) {
      setJsonContent(initialJson);
      setSelectedSampleId("custom");
    }
  }, [initialJson]);

  useEffect(() => {
    if (initialSql !== undefined && initialSql !== querySql) {
      setQuerySql(initialSql);
    }
  }, [initialSql]);

  const handleSelectSample = (sample: SamplePlan) => {
    setSelectedSampleId(sample.id);
    setJsonContent(sample.json);
    setQuerySql(sample.query);
    if (onClearError) onClearError();
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setJsonContent(text);
        setSelectedSampleId("custom");
        if (onClearError) onClearError();
      }
    };
    reader.readAsText(file);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
      setCopiedFormat(true);
      setTimeout(() => setCopiedFormat(false), 1500);
    } catch {
      // ignore formatting error if invalid json
    }
  };

  const handleClear = () => {
    setJsonContent("");
    setQuerySql("");
    setSelectedSampleId("custom");
    if (onClearError) onClearError();
  };

  const handleCopyExplainCommand = () => {
    navigator.clipboard.writeText("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) <your query>;");
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 1500);
  };

  const handleCopySql = () => {
    if (!querySql.trim()) return;
    navigator.clipboard.writeText(querySql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 1500);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!jsonContent.trim() || isLoading) return;
    onAnalyze(jsonContent, querySql);
  };

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to trigger analysis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jsonContent, querySql, isLoading]);

  const lineCount = jsonContent ? jsonContent.split("\n").length : 0;
  const charCount = jsonContent.length;
  const activeSample = SAMPLE_PLANS.find((s) => s.id === selectedSampleId);
  const isNearLimit = entitlements.daily_used / entitlements.daily_limit >= 0.8;

  return (
    <div id="plan-input-container">
      {/* The input panel is ONE bordered panel (1px border, 8px radius) */}
      <form
        onSubmit={handleSubmit}
        className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] overflow-hidden"
      >
        {/* Section 1: SQL (optional) */}
        {/* DESIGN DECISION: Swapped single-line input for auto-growing textarea to preserve line breaks in real SQL statements while binding same state and handler */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="query-sql-input" className="text-[13px] font-medium text-[var(--text)]">
                SQL (optional)
              </label>
              <span className="text-[12px] text-[var(--muted)]">
                Used to match suggested indexes to your query.
              </span>
            </div>

            <button
              type="button"
              id="copy-sql-btn"
              onClick={handleCopySql}
              disabled={!querySql.trim()}
              className="h-[26px] px-2 text-[12px] rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy SQL query to clipboard"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Copied SQL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>
          <textarea
            id="query-sql-input"
            rows={2}
            value={querySql}
            onChange={(e) => setQuerySql(e.target.value)}
            placeholder="e.g. SELECT * FROM orders WHERE status = 'pending' AND created_at >= '2024-01-01' ORDER BY id DESC;"
            className="w-full px-3 py-2 text-[13px] font-mono bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[var(--text)] placeholder:text-[var(--muted)] resize-y min-h-[56px] max-h-[160px] leading-relaxed focus:border-[var(--accent)]"
          />
        </div>

        {/* Section 2: Query plan (JSON) */}
        <div className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor="plan-json-input" className="text-[13px] font-medium text-[var(--text)]">
                Query plan (JSON)
              </label>
              {activeSample && (
                <span className="text-[12px] text-[var(--muted)]">
                  Example loaded: {activeSample.name}
                </span>
              )}
              {charCount > 0 && (
                <span className="text-[12px] text-[var(--muted)]">
                  · {lineCount} lines · {(charCount / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {/* Toolbar controls */}
            {/* DESIGN DECISION: Replaced large bottleneck cards with compact native select labeled "Load example" inside the toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1">
                <select
                  id="load-example-select"
                  aria-label="Load example query plan"
                  value={selectedSampleId}
                  onChange={(e) => {
                    const found = SAMPLE_PLANS.find((s) => s.id === e.target.value);
                    if (found) {
                      handleSelectSample(found);
                    } else if (e.target.value === "custom") {
                      setSelectedSampleId("custom");
                    }
                  }}
                  className="h-[28px] px-2 text-[12px] rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] cursor-pointer hover:border-[var(--text)]"
                >
                  <option value="custom" disabled={selectedSampleId !== "custom"}>
                    Load example…
                  </option>
                  {SAMPLE_PLANS.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[var(--muted)] hidden sm:inline" title="Hand-written sample plans">
                  Hand-written sample plans
                </span>
              </div>

              {jsonContent && (
                <>
                  <button
                    type="button"
                    onClick={handleFormatJson}
                    className="h-[28px] px-2 text-[12px] rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer"
                  >
                    {copiedFormat ? "Formatted" : "Format"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-[28px] px-2 text-[12px] rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)] cursor-pointer"
                  >
                    Clear
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-[28px] px-2 text-[12px] rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text)] flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Upload .json</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Helper line with Copy button and warning */}
          <div className="space-y-1 text-[12px]">
            <div className="flex items-center gap-2 text-[var(--muted)] flex-wrap">
              <span>Command:</span>
              <code className="font-mono text-[12px] text-[var(--text)] bg-[var(--surface)] px-1.5 py-0.5 rounded-[4px] border border-[var(--border)]">
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) &lt;your query&gt;;
              </code>
              <button
                type="button"
                onClick={handleCopyExplainCommand}
                className="text-[11px] text-[var(--text)] hover:underline cursor-pointer"
              >
                {copiedCommand ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[var(--muted)] text-[12px] m-0">
              EXPLAIN ANALYZE runs the query. For UPDATE or DELETE, wrap it in{" "}
              <code className="font-mono text-[11px] text-[var(--text)]">BEGIN; ... ROLLBACK;</code>.
            </p>
          </div>

          {/* Monospace editor */}
          <div>
            <textarea
              id="plan-json-input"
              rows={12}
              value={jsonContent}
              onChange={(e) => {
                setJsonContent(e.target.value);
                setSelectedSampleId("custom");
                if (onClearError) onClearError();
              }}
              placeholder="Paste PostgreSQL EXPLAIN (FORMAT JSON) output here..."
              className="w-full p-3 font-mono text-[13px] leading-[1.6] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[var(--text)] placeholder:text-[var(--muted)] min-h-[280px] resize-y focus:border-[var(--accent)]"
            />
            {error && (
              <div
                id="plan-parse-error-alert"
                className="mt-2 p-2 rounded-[6px] bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-[13px] font-mono"
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row of the panel */}
        {/* DESIGN DECISION: Accurate privacy line stating browser local storage and deletion capability */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-[13px] text-[var(--muted)]">
            {user
              ? "Analyses are saved to your browser history. You can delete them anytime."
              : "Plans are saved to local browser history. You can delete them anytime."}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <div className="text-[12px] text-[var(--muted)]">
              {entitlements.plan === "premium" ? (
                <span>Unlimited analyses (Pro)</span>
              ) : user ? (
                <span>
                  {Math.max(0, entitlements.daily_limit - entitlements.daily_used)} of{" "}
                  {entitlements.daily_limit} left today
                  {isNearLimit && onOpenUpgrade && (
                    <button
                      type="button"
                      onClick={onOpenUpgrade}
                      className="ml-1.5 text-[var(--accent)] hover:underline cursor-pointer font-medium"
                    >
                      Upgrade
                    </button>
                  )}
                </span>
              ) : (
                <span>
                  {Math.max(0, entitlements.daily_limit - entitlements.daily_used)} of{" "}
                  {entitlements.daily_limit} left today · 25 with an account
                  {isNearLimit && onOpenUpgrade && (
                    <button
                      type="button"
                      onClick={onOpenUpgrade}
                      className="ml-1.5 text-[var(--accent)] hover:underline cursor-pointer font-medium"
                    >
                      Upgrade
                    </button>
                  )}
                </span>
              )}
            </div>

            <button
              id="analyze-plan-btn"
              type="submit"
              disabled={isLoading || !jsonContent.trim()}
              className="h-[36px] px-4 rounded-[6px] bg-[var(--text)] text-[var(--bg)] hover:opacity-90 disabled:opacity-40 transition-opacity text-[13px] font-medium flex items-center gap-2 cursor-pointer shrink-0"
            >
              {isLoading ? (
                <span>Analyzing…</span>
              ) : (
                <>
                  <span>Analyze query plan</span>
                  <kbd className="px-1.5 py-0.5 text-[11px] font-mono border border-[var(--bg)]/20 rounded-[4px] opacity-80">
                    {shortcutLabel}
                  </kbd>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
