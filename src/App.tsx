import React, { useState, useEffect } from "react";
import {
  Finding,
  PlanAnalysis,
  PlanNodeData,
  SavedAnalysis,
  Entitlements,
  UserAccount,
} from "./types/engine";
import { parsePlanJson, formatMarkdownReport, findNodeByPath } from "./lib/engine";
import {
  auth,
  testFirestoreConnection,
  syncUserProfile,
  updateUserQuotaInFirestore,
  updateUserPlanInFirestore,
  saveAnalysisToFirestore,
  deleteAnalysisFromFirestore,
  clearAllAnalysesFromFirestore,
  subscribeToUserAnalyses,
  signOutFirebase,
} from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Header } from "./components/Header";
import { PlanInput } from "./components/PlanInput";
import { PlanTree } from "./components/PlanTree";
import { FindingsList } from "./components/FindingsList";
import { NodeDetailModal } from "./components/NodeDetailModal";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { UpgradeModal } from "./components/UpgradeModal";
import { LegalModal, LegalDocType } from "./components/LegalViews";
import { AuthModal } from "./components/AuthModal";

// Local storage keys for offline/guest fallback
const LOCAL_STORAGE_THEME_KEY = "slowgres_theme_v1";
const LOCAL_STORAGE_HISTORY_KEY = "slowgres_analyses_v1";
const LOCAL_STORAGE_QUOTA_KEY = "slowgres_quota_v1";
const LOCAL_STORAGE_USER_KEY = "slowgres_user_v1";

export const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (saved) return saved === "dark";
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  // User auth state
  const [user, setUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Quota & entitlements state
  const [entitlements, setEntitlements] = useState<Entitlements>(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedQuotaRaw = localStorage.getItem(LOCAL_STORAGE_QUOTA_KEY);
    let dailyUsed = 0;

    if (savedQuotaRaw) {
      try {
        const parsed = JSON.parse(savedQuotaRaw);
        if (parsed.date === today) {
          dailyUsed = parsed.used || 0;
        }
      } catch (e) {
        dailyUsed = 0;
      }
    }

    const savedUserRaw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    const hasUser = !!savedUserRaw;

    return {
      plan: "free",
      daily_limit: hasUser ? 25 : 10,
      daily_used: dailyUsed,
      history_retention_days: hasUser ? 30 : 7,
      can_export: true,
      show_ads: false,
    };
  });

  // Active analysis results
  const [activeAnalysis, setActiveAnalysis] = useState<PlanAnalysis | null>(null);
  const [activeQuerySql, setActiveQuerySql] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState<boolean>(false);

  // Inspector & modal states
  const [selectedNode, setSelectedNode] = useState<PlanNodeData | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);

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

  // Test connection to Firestore on initial boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const { user: syncedUser, entitlements: syncedEntitlements } =
            await syncUserProfile(fbUser);
          setUser(syncedUser);
          setEntitlements(syncedEntitlements);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(syncedUser));
        } catch (err) {
          console.error("Failed to sync Firestore user profile:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        setEntitlements((prev) => ({
          ...prev,
          plan: "free",
          daily_limit: 10,
          history_retention_days: 7,
        }));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Sync real-time analyses from Firestore when user is signed in
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribeFirestore = subscribeToUserAnalyses(
      user.id,
      (remoteAnalyses) => {
        setSavedAnalyses(remoteAnalyses);
        localStorage.setItem(
          LOCAL_STORAGE_HISTORY_KEY,
          JSON.stringify(remoteAnalyses)
        );
      },
      (error) => {
        console.error("Error listening to user analyses from Firestore:", error);
      }
    );

    return () => unsubscribeFirestore();
  }, [user?.id]);

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

  // Sync history to localStorage for guest or cache
  useEffect(() => {
    if (!user) {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(savedAnalyses));
    }
  }, [savedAnalyses, user]);

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

    setTimeout(async () => {
      try {
        // Enforce quota limit for free tier
        if (
          entitlements.plan === "free" &&
          entitlements.daily_used >= entitlements.daily_limit
        ) {
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

        const newUsed = entitlements.daily_used + 1;

        // Increment quota in local state
        setEntitlements((prev) => ({
          ...prev,
          daily_used: newUsed,
        }));

        // Persist quota to Firestore if user is authenticated
        if (user?.id) {
          updateUserQuotaInFirestore(user.id, newUsed).catch((err) =>
            console.error("Failed to update quota in Firestore:", err)
          );
        }

        // Store analysis record
        const criticalCount = analysis.findings.filter(
          (f: Finding) => f.severity === "critical"
        ).length;

        const newRecord: SavedAnalysis = {
          id: `rec_${Date.now()}`,
          created_at: new Date().toISOString(),
          title: analysis.root.relation_name
            ? `${analysis.root.node_type} on ${analysis.root.relation_name}`
            : `${analysis.root.node_type} (${analysis.total_time_ms.toFixed(1)} ms)`,
          query_text: querySql,
          total_time_ms: analysis.total_time_ms,
          planning_time_ms: analysis.planning_time_ms,
          findings_count: analysis.findings.length,
          critical_count: criticalCount,
          analysis,
        };

        // If authenticated, persist to Firestore
        if (user?.id) {
          try {
            await saveAnalysisToFirestore(user.id, newRecord);
          } catch (err) {
            console.error("Failed to save analysis to Firestore:", err);
            // Still update local state as fallback
            setSavedAnalyses((prev) => [newRecord, ...prev.slice(0, 49)]);
          }
        } else {
          setSavedAnalyses((prev) => [newRecord, ...prev.slice(0, 49)]);
        }

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

  const handleLogout = async () => {
    try {
      await signOutFirebase();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setEntitlements((prev) => ({
      ...prev,
      daily_limit: 10,
      history_retention_days: 7,
    }));
  };

  const handleUpgrade = async () => {
    const newEntitlements: Entitlements = {
      plan: "premium",
      daily_limit: 999999,
      daily_used: entitlements.daily_used,
      history_retention_days: 90,
      can_export: true,
      show_ads: false,
    };
    setEntitlements(newEntitlements);

    if (user?.id) {
      try {
        await updateUserPlanInFirestore(user.id, "premium");
        setUser((prev) => (prev ? { ...prev, plan: "premium" } : null));
      } catch (err) {
        console.error("Failed to update plan in Firestore:", err);
      }
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (user?.id) {
      try {
        await deleteAnalysisFromFirestore(user.id, id);
      } catch (err) {
        console.error("Failed to delete analysis from Firestore:", err);
      }
    }
    setSavedAnalyses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearHistory = async () => {
    if (user?.id) {
      try {
        await clearAllAnalysesFromFirestore(user.id);
      } catch (err) {
        console.error("Failed to clear analyses from Firestore:", err);
      }
    }
    setSavedAnalyses([]);
  };

  const handleExportMarkdown = () => {
    if (!activeAnalysis) return;
    const md = formatMarkdownReport(activeAnalysis, activeQuerySql);
    navigator.clipboard.writeText(md);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 1500);
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

  const handleSelectNodePath = (nodePath: string) => {
    if (activeAnalysis) {
      const target = findNodeByPath(activeAnalysis.root, nodePath);
      if (target) {
        setSelectedNode(target);
      }
    }
  };

  return (
    <div
      id="slowgres-app"
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans"
    >
      {/* 1. Header */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        onResetToAnalyzer={() => {}}
        entitlements={entitlements}
        historyCount={savedAnalyses.length}
        user={user}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main container: max-w-[1120px] */}
      <main className="flex-1 max-w-[1120px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 2. Hero section */}
        <section className="mb-6">
          <h1 className="text-[28px] font-semibold text-[var(--text)] tracking-tight font-display">
            Find out why it&apos;s slow.
          </h1>
          <p className="text-[14px] text-[var(--muted)] mt-1.5 leading-relaxed max-w-2xl">
            Paste EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output to see findings, row misestimates, and suggested indexes.
          </p>
        </section>

        {/* 3. Workbench (Desktop: 2 columns; Mobile: stacked) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Input Panel */}
          <div>
            <PlanInput
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              error={parseError}
              onClearError={() => setParseError(null)}
              entitlements={entitlements}
              user={user}
              onOpenUpgrade={() => setIsUpgradeOpen(true)}
            />
          </div>

          {/* Right Column: Results Panel (or empty state) */}
          <div>
            {activeAnalysis ? (
              <div className="space-y-4">
                {/* Results toolbar & executive metrics */}
                <div className="p-3.5 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3 flex-wrap text-[13px]">
                  <div className="flex items-center gap-3.5 flex-wrap">
                    <div>
                      <span className="text-[var(--muted)]">Execution: </span>
                      <span className="font-mono font-medium text-[var(--text)]">
                        {activeAnalysis.total_time_ms.toFixed(2)} ms
                      </span>
                    </div>
                    {activeAnalysis.planning_time_ms !== undefined && (
                      <div>
                        <span className="text-[var(--muted)]">Planning: </span>
                        <span className="font-mono font-medium text-[var(--text)]">
                          {activeAnalysis.planning_time_ms.toFixed(2)} ms
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-[var(--muted)]">Findings: </span>
                      <span className="font-mono font-medium text-[var(--text)]">
                        {activeAnalysis.findings.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      id="copy-markdown-report-btn"
                      onClick={handleExportMarkdown}
                      className="px-2 py-1 text-[12px] rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer transition-colors"
                    >
                      {copiedExport ? "Copied" : "Copy Markdown"}
                    </button>
                    <button
                      type="button"
                      id="export-json-btn"
                      onClick={handleExportJson}
                      className="px-2 py-1 text-[12px] rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--text)] cursor-pointer transition-colors"
                    >
                      Export JSON
                    </button>
                    <button
                      type="button"
                      id="clear-results-btn"
                      onClick={() => setActiveAnalysis(null)}
                      className="px-2 py-1 text-[12px] rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Findings list */}
                <FindingsList
                  findings={activeAnalysis.findings}
                  onSelectNodePath={handleSelectNodePath}
                />

                {/* Plan tree */}
                <PlanTree
                  root={activeAnalysis.root}
                  totalTimeMs={activeAnalysis.total_time_ms}
                  findings={activeAnalysis.findings}
                  onSelectNode={(node) => setSelectedNode(node)}
                />
              </div>
            ) : (
              <div className="h-full min-h-[380px] rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--surface)] flex flex-col items-center justify-center p-8 text-center text-[var(--muted)]">
                <p className="text-[14px] m-0">
                  Results appear here after you run an analysis.
                </p>
                <p className="text-[12px] text-[var(--muted)] mt-1 m-0">
                  Select a sample plan or paste your own EXPLAIN JSON to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border)] py-4">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text)] font-display">Slowgres</span>
            <span className="text-[var(--muted)]">· PostgreSQL EXPLAIN analyzer</span>
          </div>

          <div className="flex items-center gap-4 text-[var(--muted)]">
            <button
              type="button"
              id="footer-privacy-btn"
              onClick={() => setLegalDoc("privacy")}
              className="hover:text-[var(--text)] cursor-pointer transition-colors"
            >
              Privacy
            </button>
            <button
              type="button"
              id="footer-terms-btn"
              onClick={() => setLegalDoc("terms")}
              className="hover:text-[var(--text)] cursor-pointer transition-colors"
            >
              Terms of Service
            </button>
            <button
              type="button"
              id="footer-refunds-btn"
              onClick={() => setLegalDoc("refunds")}
              className="hover:text-[var(--text)] cursor-pointer transition-colors"
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
        onSelectAnalysis={(saved) => {
          setActiveAnalysis(saved.analysis);
          setActiveQuerySql(saved.query_text || "");
        }}
        onDeleteAnalysis={handleDeleteAnalysis}
        onClearHistory={handleClearHistory}
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
};

export default App;
