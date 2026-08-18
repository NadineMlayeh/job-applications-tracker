"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    const user = result.data.user;
    if (mode === "signup" && user) {
      const seed = await supabase.rpc("seed_default_fields", { p_user_id: user.id });
      if (seed.error) setError(seed.error.message);
    }

    router.replace("/");
    router.refresh();
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

        <label className="mb-4 block text-sm">
          <span className="mono-eyebrow mb-2 block text-[10px] text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[rgba(8,3,20,0.55)] px-3 py-2.5 text-sm outline-none transition hover:border-purple-400/35 focus:border-cyan/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.1)]"
          />
        </label>

        <label className="mb-5 block text-sm">
          <span className="mono-eyebrow mb-2 block text-[10px] text-muted">Password</span>
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
