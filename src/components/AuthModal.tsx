import React, { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { UserAccount } from "../types/engine";
import { signInWithGoogleFirebase, syncUserProfile } from "../lib/firebase";

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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectGoogle = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const fbUser = await signInWithGoogleFirebase();
      const { user } = await syncUserProfile(fbUser);
      onLoginSuccess(user);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setErrorMessage("Sign-in popup was closed before completing.");
      } else if (err?.code === "auth/cancelled-popup-request") {
        // cancelled
      } else {
        setErrorMessage(
          err?.message || "Failed to sign in with Google. Please try again."
        );
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        id="auth-modal-card"
        className="bg-[var(--bg)] border border-[var(--border)] rounded-[8px] shadow-xl max-w-sm w-full p-6 text-[13px] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-semibold text-[var(--text)] tracking-tight font-display">
              {initialMode === "login" ? "Sign in to Slowgres" : "Create your account"}
            </h2>
            <p className="text-[13px] text-[var(--muted)] mt-1 leading-relaxed">
              Sign in with your Google account to sync query plan analyses and quota across devices.
            </p>
          </div>
          <button
            id="close-auth-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits list */}
        <div className="p-3 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] space-y-1.5 text-[12px] text-[var(--muted)]">
          <div className="flex items-center gap-2 text-[var(--text)] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>25 daily query analyses (vs 10 for guests)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
            <span>Cloud Firestore history sync across devices</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
            <span>30-day analysis retention</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-[6px] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[12px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google sign-in button */}
        <button
          type="button"
          id="google-auth-btn"
          onClick={handleConnectGoogle}
          disabled={isSubmitting}
          className="w-full h-[40px] px-4 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg)] text-[var(--text)] hover:border-[var(--text)] font-medium text-[13px] flex items-center justify-center gap-2.5 cursor-pointer transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isSubmitting ? "Connecting to Google…" : "Continue with Google"}</span>
        </button>

        <p className="text-[11px] text-[var(--muted)] text-center">
          Secured with Google Sign-in and Firebase Authentication.
        </p>
      </div>
    </div>
  );
};
