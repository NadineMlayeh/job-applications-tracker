import { ApplicationStatus, STATUS_LABELS } from "@/lib/types";
import clsx from "clsx";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  wishlist: "text-muted border-white/10 bg-white/[0.03]",
  applied: "text-purple-300 border-purple-400/35 bg-purple-500/10 shadow-[0_0_18px_rgba(168,85,247,0.18)]",
  oa_test: "text-cyan-300 border-cyan-400/35 bg-cyan-500/10 shadow-[0_0_18px_rgba(34,211,238,0.18)]",
  interview: "text-amber-300 border-amber-400/35 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.16)]",
  offer: "text-emerald-300 border-emerald-400/35 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.18)]",
  rejected: "text-rose-300 border-rose-400/35 bg-rose-500/10 shadow-[0_0_18px_rgba(244,63,94,0.16)]",
  withdrawn: "text-muted border-white/10 bg-white/[0.03]",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] backdrop-blur",
        STATUS_STYLES[status]
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full bg-current", status !== "wishlist" && status !== "withdrawn" && "animate-pulse-glow")} />
      {STATUS_LABELS[status]}
    </span>
  );
}