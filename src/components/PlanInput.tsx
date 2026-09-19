import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  FileCode,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Code2,
  Trash2,
  Wand2,
  Zap,
  Sparkles,
  Command,
} from "lucide-react";
import { SAMPLE_PLANS, SamplePlan } from "../lib/samplePlans";

interface PlanInputProps {
  onAnalyze: (jsonInput: string, querySql?: string) => void;
  isLoading: boolean;
  error?: string | null;
  initialJson?: string;
  initialSql?: string;
  onClearError?: () => void;
}

export const PlanInput: React.FC<PlanInputProps> = ({
  onAnalyze,
  isLoading,
  error,
  initialJson,
  initialSql,
  onClearError,
}) => {
  const [jsonContent, setJsonContent] = useState<string>(initialJson || SAMPLE_PLANS[0].json);
  const [querySql, setQuerySql] = useState<string>(initialSql || SAMPLE_PLANS[0].query);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    initialJson ? "custom" : SAMPLE_PLANS[0].id
  );
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [copiedFormat, setCopiedFormat] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
      setCopiedFormat(true);
      setTimeout(() => setCopiedFormat(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setJsonContent("");
    setQuerySql("");
    setSelectedSampleId("custom");
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

  return (
    <div id="plan-input-container" className="space-y-6">
      {/* Sample presets bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-display">
              Pre-Engineered Bottleneck Scenarios
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
              7 Test Plans
            </span>
          </div>
          <span className="text-xs text-zinc-400 hidden sm:inline font-sans">
            Click to load realistic production workloads
          </span>
        </div>

        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-7 gap-2 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-none snap-x">
          {SAMPLE_PLANS.map((sample) => {
            const isSelected = selectedSampleId === sample.id;
            const isOptimal = sample.category === "optimized";

            return (
              <button
                key={sample.id}
                id={`sample-plan-btn-${sample.id}`}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 text-xs flex flex-col justify-between relative group cursor-pointer shadow-2xs active:scale-98 min-w-[170px] sm:min-w-0 snap-start shrink-0 sm:shrink ${
                  isSelected
                    ? "border-amber-500 dark:border-amber-400 bg-amber-500/10 dark:bg-amber-400/10 ring-2 ring-amber-500/20 dark:ring-amber-400/20 text-zinc-900 dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <div>
                  <div className="font-semibold line-clamp-1 text-xs mb-1 font-display">
                    {sample.name.split("(")[0]}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans line-clamp-1">
                    {sample.description.split(",")[0]}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${
                      isOptimal
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOptimal ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {isOptimal ? "Optimal" : "Bottleneck"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main input card */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm shadow-zinc-200/50 dark:shadow-none transition-all">
          {/* SQL Query input bar (optional) */}
          <div className="p-3 sm:p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <div className="p-1 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <FileCode className="w-3.5 h-3.5" />
                </div>
                <label
                  htmlFor="query-sql-input"
                  className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 font-display"
                >
                  Original SQL Statement
                </label>
                <span className="text-[10px] sm:text-[11px] text-zinc-400 font-normal font-sans">
                  (optional, used for index correlation)
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 hidden md:inline">
                SELECT / UPDATE / DELETE
              </span>
            </div>
            <input
              id="query-sql-input"
              type="text"
              value={querySql}
              onChange={(e) => setQuerySql(e.target.value)}
              placeholder="e.g. SELECT * FROM orders WHERE status = 'pending' AND created_at >= '2024-01-01' ORDER BY id DESC;"
              className="w-full px-3 sm:px-3.5 py-2 text-xs font-mono bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 focus:border-amber-500 dark:focus:border-amber-400 transition-all"
            />
          </div>

          {/* JSON Textarea with drag & drop */}
          <div
            className={`relative p-3 sm:p-4 transition-all duration-200 ${
              dragOver
                ? "bg-amber-500/5 dark:bg-amber-500/10 border-2 border-dashed border-amber-500"
                : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <label
                  htmlFor="plan-json-input"
                  className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 font-display flex items-center gap-1.5 truncate"
                >
                  <span className="hidden sm:inline">EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) Output</span>
                  <span className="sm:hidden">EXPLAIN JSON Output</span>
                </label>
                {charCount > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
                    {lineCount} lines • {(charCount / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {jsonContent && (
                  <>
                    <button
                      type="button"
                      onClick={handleFormatJson}
                      className="px-2 py-1 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Format JSON structure"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span className="hidden sm:inline">{copiedFormat ? "Formatted!" : "Format"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-2 py-1 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Clear editor"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 sm:px-2.5 py-1 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-zinc-500" />
                  <span className="hidden sm:inline">Upload .json</span>
                  <span className="sm:hidden">Upload</span>
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

            <div className="relative">
              <textarea
                id="plan-json-input"
                rows={9}
                value={jsonContent}
                onChange={(e) => {
                  setJsonContent(e.target.value);
                  setSelectedSampleId("custom");
                  if (onClearError) onClearError();
                }}
                placeholder={`Paste PostgreSQL EXPLAIN output here, e.g.:\n[\n  {\n    "Plan": {\n      "Node Type": "Seq Scan",\n      "Relation Name": "users",\n      "Actual Total Time": 42.1,\n      "Actual Rows": 100000,\n      "Filter": "(status = 'active'::text)",\n      "Rows Removed by Filter": 99500\n    }\n  }\n]`}
                className="w-full p-3 sm:p-3.5 font-mono text-xs bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 focus:border-amber-500 dark:focus:border-amber-400 resize-y leading-relaxed transition-all shadow-inner-xs"
              />
            </div>
          </div>

          {/* Action bar */}
          <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-sans">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Zero data retention: Execution plans are parsed privately in your browser session.</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="analyze-plan-btn"
                type="submit"
                disabled={isLoading || !jsonContent.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-98 disabled:opacity-50 cursor-pointer font-display"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Plan...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Analyze Query Plan</span>
                    <span className="hidden sm:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.2 rounded bg-white/20 dark:bg-zinc-800 text-[10px] font-mono text-zinc-300 dark:text-zinc-600">
                      ⌘↵
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            id="plan-parse-error-alert"
            className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-3 shadow-2xs"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold font-display text-red-900 dark:text-red-200">
                Failed to parse EXPLAIN plan
              </div>
              <div className="text-red-700 dark:text-red-400 font-mono text-[11px] leading-relaxed">
                {error}
              </div>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/80 font-sans">
                Make sure your input is valid JSON produced by <code className="font-mono font-semibold">EXPLAIN (ANALYZE, FORMAT JSON)</code> or select one of the pre-engineered test cases above.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
