"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("notice") === "verify-failed"
      ? "That verification link is invalid or expired. Enter your email below and we'll send a fresh one."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const redirectTo = `${window.location.origin}/auth/callback`;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });

    if (result.error) {
      if (isUnconfirmedError(result.error)) {
        setNotice(`Your email hasn't been verified yet. Check your inbox for the confirmation link we sent to ${email}.`);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
      return;
    }

    const user = result.data.user;

    if (mode === "signup") {
      if (user) {
        const seed = await supabase.rpc("seed_default_fields", { p_user_id: user.id });
        if (seed.error) setError(seed.error.message);
      }
      if (!result.data.session) {
        setNotice(`We sent a verification link to ${email}. Open it to activate your account, then sign in.`);
        setLoading(false);
        return;
      }
    }

    router.replace("/");
    router.refresh();
  }

  async function resend() {
    setResending(true);
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setResending(false);
    if (error) {
      setError(error.message);
    } else {
      setNotice(`A new verification link was sent to ${email}.`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <motion.form
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={onSubmit}
        className="cyber-panel w-full max-w-md p-8"
      >
        <div className="mb-8">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-cyan/80">Job Tracker</p>
          <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your tracker"}</h1>
          <p className="mt-0.5 text-sm text-muted">AI-assisted application tracking.</p>
        </div>

        {notice ? (
          <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-200">
            <div className="flex items-start gap-2">
              <MailCheck size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1">{notice}</div>
            </div>
            <button
              type="button"
              onClick={resend}
              disabled={resending || !email}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 underline-offset-4 transition-colors hover:text-amber-200 hover:underline disabled:opacity-50"
            >
              {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Resend verification email
            </button>
          </div>
        ) : null}

        <label className="mb-4 block text-sm">
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[rgba(8,3,20,0.55)] px-3 py-2.5 text-sm outline-none transition hover:border-purple-400/35 focus:border-cyan/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.1)]"
          />
        </label>

        <label className="mb-5 block text-sm">
          <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[rgba(8,3,20,0.55)] px-3 py-2.5 text-sm outline-none transition hover:border-purple-400/35 focus:border-cyan/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.1)]"
          />
        </label>

        {error ? <p className="mb-4 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {mode === "login" ? "Sign in" : "Sign up"}
        </Button>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <Link className="text-purple-300 transition-colors hover:text-cyan-300" href={mode === "login" ? "/signup" : "/login"}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </motion.form>
    </main>
  );
}

function isUnconfirmedError(error: { code?: string; message?: string }) {
  return (
    error?.code === "email_not_confirmed" ||
    /not confirmed|verify (your )?(e-?mail|account)|e-?mail.*(confirm|verify)/i.test(error?.message ?? "")
  );
}