import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl border font-display font-medium tracking-[0.01em] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
          size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2.5 text-sm",
          variant === "primary" &&
            "btn-sheen relative overflow-hidden border-purple-400/40 bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--cyan)))] text-white shadow-[0_2px_18px_rgba(168,85,247,0.25),inset_0_1px_0_rgba(255,255,255,0.28)] hover:border-purple-300/60 hover:shadow-[0_2px_28px_rgba(168,85,247,0.42),inset_0_1px_0_rgba(255,255,255,0.34)] hover:brightness-110",
          variant === "secondary" &&
            "border-white/10 bg-white/[0.04] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur hover:border-cyan/40 hover:bg-white/[0.07] hover:text-foreground hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]",
          variant === "ghost" &&
            "border-transparent bg-transparent text-muted hover:border-white/10 hover:bg-white/[0.05] hover:text-foreground",
          variant === "danger" &&
            "border-magenta/30 bg-magenta/10 text-magenta hover:border-magenta/50 hover:bg-magenta/20 hover:shadow-[0_0_22px_rgba(244,63,94,0.18)]",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";