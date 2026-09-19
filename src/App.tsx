import React, { useState, useEffect } from "react";
import {
  Zap,
  Clock,
  Layers,
  Download,
  Share2,
  FileText,
  RotateCcw,
  CheckCircle2,
  Database,
  ShieldCheck,
  Code2,
  Mail,
} from "lucide-react";
import { Header } from "./components/Header";
import { PlanInput } from "./components/PlanInput";
import { PlanTree } from "./components/PlanTree";
import { FindingsList } from "./components/FindingsList";
import { NodeDetailModal } from "./components/NodeDetailModal";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { UpgradeModal } from "./components/UpgradeModal";
import { LegalModal, LegalDocType } from "./components/LegalViews";
import { AdSlot } from "./components/AdSlot";
import { AuthModal } from "./components/AuthModal";
import {
  Entitlements,
  PlanAnalysis,
  PlanNodeData,
  SavedAnalysis,
  UserAccount,
} from "./types/engine";
import { formatMarkdownReport, parsePlanJson, findNodeByPath } from "./lib/engine";
import { SAMPLE_PLANS } from "./lib/samplePlans";

const LOCAL_STORAGE_HISTORY_KEY = "slowgres_analyses_v1";
const LOCAL_STORAGE_QUOTA_KEY = "slowgres_quota_v1";
const LOCAL_STORAGE_THEME_KEY = "slowgres_theme_v1";
const LOCAL_STORAGE_USER_KEY = "slowgres_user_session_v1";

export default function App() {
  // User authentication state
  const [user, setUser] = useState<UserAccount | null>(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Auth modal controls
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    return saved ? saved === "dark" : false;
  });

  // Entitlements & quotas
  const [entitlements, setEntitlements] = useState<Entitlements>(() => {
    const today = new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem(LOCAL_STORAGE_QUOTA_KEY);
    const storedUser = (() => {
      try {
        const u = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    })();
    const baseLimit = storedUser ? 25 : 10;
    const baseRetention = storedUser ? 30 : 7;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === today) {
          return {
            plan: parsed.plan || "free",
            daily_limit: parsed.plan === "premium" ? 999999 : baseLimit,
            daily_used: parsed.used || 0,
            history_retention_days: parsed.plan === "premium" ? 90 : baseRetention,
            can_export: parsed.plan === "premium",
            show_ads: parsed.plan !== "premium",
          };
        }
      } catch (e) {
        // ignore
      }
    }
    return {
      plan: "free",
      daily_limit: baseLimit,
      daily_used: 0,
      history_retention_days: baseRetention,
      can_export: false,
      show_ads: true,
    };
  });

  // Active analysis state
  const [activeAnalysis, setActiveAnalysis] = useState<PlanAnalysis | null>(null);
  const [activeQuerySql, setActiveQuerySql] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Modal / drawer states
  const [selectedNode, setSelectedNode] = useState<PlanNodeData | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);
  const [copiedExport, setCopiedExport] = useState<boolean>(false);

  // History records
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Apply dark mode class to HTML root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, "light");
    }
  }, [darkMode]);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(savedAnalyses));
  }, [savedAnalyses]);

  // Sync quota to localStorage
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(
      LOCAL_STORAGE_QUOTA_KEY,
      JSON.stringify({
        date: today,
        plan: entitlements.plan,
        used: entitlements.daily_used,
      })
    );
  }, [entitlements]);

  // Core analysis runner
  const handleAnalyze = (jsonInput: string, querySql?: string) => {
    setIsLoading(true);
    setParseError(null);

    // Short timeout to allow UI loading state to paint smoothly
    setTimeout(() => {
      try {
        // Enforce quota limit for free tier
        if (entitlements.plan === "free" && entitlements.daily_used >= entitlements.daily_limit) {
          if (!user) {
            handleOpenAuth("signup");
          } else {
            setIsUpgradeOpen(true);
          }
          setIsLoading(false);
          return;
        }

        const analysis = parsePlanJson(jsonInput);
        setActiveAnalysis(analysis);
        setActiveQuerySql(querySql || "");

        // Increment quota
        setEntitlements((prev) => ({
          ...prev,
          daily_used: prev.daily_used + 1,
        }));

        // Save to history
        const criticalCount = analysis.findings.filter((f) => f.severity === "critical").length;
        const newRecord: SavedAnalysis = {
          id: String(Date.now()),
          created_at: new Date().toISOString(),
          title: analysis.root.relation_name
            ? `${analysis.root.node_type} on ${analysis.root.relation_name}`
            : analysis.root.node_type,
          query_text: querySql,
          total_time_ms: analysis.total_time_ms,
          planning_time_ms: analysis.planning_time_ms,
          findings_count: analysis.findings.length,
          critical_count: criticalCount,
          analysis,
        };

        setSavedAnalyses((prev) => [newRecord, ...prev.slice(0, 49)]);
        setIsLoading(false);
      } catch (err: any) {
        setParseError(err.message || "Failed to analyze execution plan.");
        setIsLoading(false);
      }
    }, 150);
  };

  const handleOpenAuth = (mode: "login" | "signup" = "signup") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLoginSuccess = (loggedInUser: UserAccount) => {
    setUser(loggedInUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loggedInUser));
    setEntitlements((prev) => ({
      ...prev,
      daily_limit: prev.plan === "premium" ? 999999 : 25,
      history_retention_days: prev.plan === "premium" ? 90 : 30,
    }));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setEntitlements((prev) => ({
      ...prev,
      daily_limit: prev.plan === "premium" ? 999999 : 10,
      history_retention_days: prev.plan === "premium" ? 90 : 7,
    }));
  };

  const handleUpgrade = () => {
    setEntitlements({
      plan: "premium",
      daily_limit: 999999,
      daily_used: entitlements.daily_used,
      history_retention_days: 90,
      can_export: true,
      show_ads: false,
    });
  };

  const handleExportMarkdown = () => {
    if (!activeAnalysis) return;
    const md = formatMarkdownReport(activeAnalysis, activeQuerySql);
    navigator.clipboard.writeText(md);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleExportJson = () => {
    if (!activeAnalysis) return;
    const blob = new Blob([JSON.stringify(activeAnalysis, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slowgres-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="slowgres-app"
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-900 dark:selection:text-amber-200 transition-colors duration-200"
    >
      {/* Navbar */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        onOpenLegal={(doc) => setLegalDoc(doc)}
        entitlements={entitlements}
        historyCount={savedAnalyses.length}
        user={user}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {!activeAnalysis ? (
          /* Input State View */
          <div className="space-y-6">
            {/* Value Proposition Header */}
            <div className="text-center max-w-3xl mx-auto pt-4 pb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-semibold mb-4 shadow-2xs">
                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500" />
                <span className="font-display">PostgreSQL 12–17 Diagnostic Engine</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 font-display">
                Find out why your query is slow.
              </h1>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans max-w-2xl mx-auto">
                Paste your <code className="font-mono text-xs bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded border border-zinc-300/60 dark:border-zinc-700/60 font-semibold">EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)</code> output to instantly pinpoint sequential scans, row misestimates, and disk spills with executable composite index DDL.
              </p>

              {/* Modern Feature Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Seq Scans & Filter Discards
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Cardinality Misestimates
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  work_mem Disk Spills
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Executable Index DDL
                </span>
              </div>
            </div>

            {/* Guest Connect with Gmail Callout */}
            {!user && (
              <div
                id="guest-auth-prompt"
                className="max-w-2xl mx-auto p-4 rounded-2xl bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-300"
              >
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-900 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 font-display">
                      Connect with Gmail to create an account
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-sans">
                      Get 25 free analyses/day and sync EXPLAIN history across devices.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  id="hero-connect-gmail-btn"
                  onClick={() => handleOpenAuth("signup")}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer font-display shadow-sm active:scale-95"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                  <span>Connect with Gmail</span>
                </button>
              </div>
            )}

            {/* Input component */}
            <PlanInput
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              error={parseError}
            />

            {/* Safe monetization ad placement (public, non-sensitive landing) */}
            <AdSlot placement="landing_bottom" showAds={entitlements.show_ads} />
          </div>
        ) : (
          /* Analysis Results View */
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm shadow-zinc-200/50 dark:shadow-none">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="reset-plan-btn"
                  onClick={() => setActiveAnalysis(null)}
                  className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer font-display active:scale-98"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Analyze Another Plan</span>
                </button>
              </div>

              {/* Export Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="copy-markdown-report-btn"
                  onClick={handleExportMarkdown}
                  className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer font-display shadow-2xs active:scale-98"
                  title="Copy formatted Markdown diagnostic report"
                >
                  {copiedExport ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="hidden sm:inline">Copy Markdown Report</span>
                      <span className="sm:hidden">Markdown</span>
                    </>
                  )}
                </button>

                <button
                  id="export-json-btn"
                  onClick={handleExportJson}
                  className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer font-display shadow-sm active:scale-98"
                  title="Download analysis data as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export JSON</span>
                  <span className="sm:hidden">JSON</span>
                </button>
              </div>
            </div>

            {/* Executive Metrics Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  <span className="truncate">Execution Time</span>
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                </div>
                <div className="text-lg sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 sm:mt-1.5 tracking-tight truncate">
                  {activeAnalysis.total_time_ms.toFixed(2)} <span className="text-xs font-normal text-zinc-400 font-sans">ms</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-400 font-sans mt-0.5 truncate">
                  Actual execution duration
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  <span className="truncate">Planning Time</span>
                  <Zap className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                </div>
                <div className="text-lg sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 sm:mt-1.5 tracking-tight truncate">
                  {activeAnalysis.planning_time_ms !== undefined
                    ? `${activeAnalysis.planning_time_ms.toFixed(2)}`
                    : "N/A"}{" "}
                  <span className="text-xs font-normal text-zinc-400 font-sans">ms</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-400 font-sans mt-0.5 truncate">
                  {activeAnalysis.planning_time_ms !== undefined && activeAnalysis.total_time_ms > 0
                    ? `${((activeAnalysis.planning_time_ms / activeAnalysis.total_time_ms) * 100).toFixed(1)}% of run`
                    : "Planner overhead"}
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  <span className="truncate">Total Cost</span>
                  <Database className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                </div>
                <div className="text-lg sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1 sm:mt-1.5 tracking-tight truncate">
                  {Math.round(activeAnalysis.total_cost).toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-400 font-sans mt-0.5 truncate">
                  Estimated cost units
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  <span className="truncate">Findings</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      activeAnalysis.findings.length > 0 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                </div>
                <div className="text-lg sm:text-2xl font-bold font-mono mt-1 sm:mt-1.5 flex items-baseline gap-1.5 truncate">
                  <span className={activeAnalysis.findings.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                    {activeAnalysis.findings.length}
                  </span>
                  <span className="text-[10px] sm:text-xs font-normal text-zinc-400 font-sans truncate">
                    ({activeAnalysis.findings.filter((f) => f.severity === "critical").length} critical)
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-400 font-sans mt-0.5 truncate">
                  Identified issues
                </div>
              </div>
            </div>

            {/* Optional SQL Query Reference Box */}
            {activeQuerySql && (
              <div className="p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs shadow-2xs">
                <div className="font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2 font-display">
                  <Code2 className="w-4 h-4 text-amber-500" />
                  <span>Referenced SQL Query</span>
                </div>
                <pre className="font-mono text-xs text-zinc-800 dark:text-zinc-200 p-2.5 sm:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {activeQuerySql}
                </pre>
              </div>
            )}

            {/* Performance Findings & Suggestions */}
            <FindingsList
              findings={activeAnalysis.findings}
              onSelectNodePath={(nodePath) => {
                const targetNode = findNodeByPath(activeAnalysis.root, nodePath);
                if (targetNode) {
                  setSelectedNode(targetNode);
                }
              }}
            />

            {/* Hierarchical Plan Tree Visualizer */}
            <PlanTree
              root={activeAnalysis.root}
              totalTimeMs={activeAnalysis.total_time_ms}
              findings={activeAnalysis.findings}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 bg-white dark:bg-zinc-950 transition-colors text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100 font-display">Slowgres</span>
            <span className="font-sans">— PostgreSQL EXPLAIN Diagnostic Engine.</span>
          </div>

          <div className="flex items-center gap-4 font-sans">
            <button
              onClick={() => setLegalDoc("privacy")}
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setLegalDoc("terms")}
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setLegalDoc("refunds")}
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Refund Policy
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <NodeDetailModal
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedAnalyses={savedAnalyses}
        onSelectAnalysis={(item) => {
          setActiveAnalysis(item.analysis);
          setActiveQuerySql(item.query_text || "");
        }}
        onDeleteAnalysis={(id) => {
          setSavedAnalyses((prev) => prev.filter((a) => a.id !== id));
        }}
        onClearHistory={() => setSavedAnalyses([])}
        retentionDays={entitlements.history_retention_days}
      />

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        onUpgrade={handleUpgrade}
        currentEntitlements={entitlements}
      />

      <LegalModal
        activeDoc={legalDoc}
        onClose={() => setLegalDoc(null)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authMode}
      />
    </div>
  );
}
