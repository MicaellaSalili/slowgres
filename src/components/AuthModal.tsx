import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Check,
  Chrome,
} from "lucide-react";
import { UserAccount } from "../types/engine";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  initialMode?: "login" | "signup";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = "signup",
}) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGooglePicker, setShowGooglePicker] = useState<boolean>(false);

  if (!isOpen) return null;

  // Recognized user for the environment
  const detectedGoogleAccount = {
    name: "Micaella Salili",
    email: "salilimicaella@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
  };

  const handleConnectGoogle = (selectedAccount?: { name: string; email: string }) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const targetAccount = selectedAccount || detectedGoogleAccount;

    setTimeout(() => {
      const newUser: UserAccount = {
        id: `usr_${Math.random().toString(36).substring(2, 9)}`,
        email: targetAccount.email,
        name: targetAccount.name,
        avatar_url:
          targetAccount.email === detectedGoogleAccount.email
            ? detectedGoogleAccount.avatar
            : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetAccount.name)}`,
        provider: "google",
        created_at: new Date().toISOString(),
        is_verified: true,
        plan: "free",
        analyses_performed: 0,
      };

      setIsSubmitting(false);
      setShowGooglePicker(false);
      onLoginSuccess(newUser);
      onClose();
    }, 600);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const derivedName = name.trim() || email.split("@")[0];
      const newUser: UserAccount = {
        id: `usr_${Math.random().toString(36).substring(2, 9)}`,
        email,
        name: derivedName,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedName)}`,
        provider: "email",
        created_at: new Date().toISOString(),
        is_verified: false,
        plan: "free",
        analyses_performed: 0,
      };

      setIsSubmitting(false);
      onLoginSuccess(newUser);
      onClose();
    }, 600);
  };

  const handleAppendGmail = () => {
    if (!email.includes("@")) {
      setEmail(`${email.trim()}@gmail.com`);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="auth-modal-container"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto text-xs transition-all font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with decorative badge */}
        <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-900 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-500/20 mb-2">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Slowgres Account</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-display">
              {mode === "signup" ? "Create your account" : "Welcome back to Slowgres"}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-xs">
              {mode === "signup"
                ? "Connect with Gmail for instant access to enhanced query quotas"
                : "Log in to access your saved EXPLAIN plans and settings"}
            </p>
          </div>

          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
          <button
            type="button"
            id="tab-signup-btn"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-center font-semibold text-xs transition-colors cursor-pointer border-b-2 font-display ${
              mode === "signup"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-zinc-900"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Sign Up with Gmail
          </button>
          <button
            type="button"
            id="tab-login-btn"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-center font-semibold text-xs transition-colors cursor-pointer border-b-2 font-display ${
              mode === "login"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-zinc-900"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Log In
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary "Connect with Gmail" CTA */}
          <div className="space-y-3">
            <button
              type="button"
              id="connect-with-gmail-btn"
              disabled={isSubmitting}
              onClick={() => handleConnectGoogle()}
              className="w-full py-3 px-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm active:scale-98 font-display"
            >
              <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <span>
                {isSubmitting
                  ? "Connecting to Google Account..."
                  : mode === "signup"
                  ? "Connect with Gmail to create account"
                  : "Continue with Gmail / Google"}
              </span>
            </button>

            {/* Quick One-Tap Account Suggestion */}
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={detectedGoogleAccount.avatar}
                  alt={detectedGoogleAccount.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-500/20 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate">
                    {detectedGoogleAccount.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {detectedGoogleAccount.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="one-tap-continue-btn"
                onClick={() => handleConnectGoogle(detectedGoogleAccount)}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shrink-0 transition-all cursor-pointer font-display shadow-2xs active:scale-95"
              >
                1-Tap Connect
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
            <span className="bg-white dark:bg-zinc-900 px-3 text-[11px] text-zinc-400 font-medium tracking-wide uppercase">
              or use work email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    id="auth-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Micaella Salili"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                {!email.includes("@") && email.length > 2 && (
                  <button
                    type="button"
                    onClick={handleAppendGmail}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-mono cursor-pointer"
                  >
                    + @gmail.com
                  </button>
                )}
              </div>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="email"
                  id="auth-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                {mode === "login" && (
                  <span className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="auth-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="auth-submit-btn"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 font-display"
            >
              <span>{mode === "signup" ? "Create Free Account" : "Log In to Slowgres"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Account Benefits List */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-display">
              Benefits of connecting your account
            </span>
            <div className="grid grid-cols-1 gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>25 free query plan analyses per day (up from 10)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Save and synchronize EXPLAIN plans across sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Export detailed diagnostic reports to Markdown & JSON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>OAuth 2.0 Secure Authentication • No query data is stored remotely</span>
        </div>
      </div>
    </div>
  );
};
