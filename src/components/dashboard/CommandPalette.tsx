"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Search, X } from "lucide-react";

export function CommandPalette({
  open,
  actions,
  onClose,
}: {
  open: boolean;
  actions: { label: string; run: () => void }[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!open) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => (index + 1) % filtered.length);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => (index - 1 + filtered.length) % filtered.length);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const action = filtered[active];
        if (action) {
          action.run();
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const filtered = actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.section
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            className="cyber-panel w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
              <Search size={17} className="text-cyan-300" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                placeholder="Type a command…"
                className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted/70"
              />
              <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</kbd>
            </div>
            <div className="p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center font-mono text-sm text-muted">No commands match “{query}”</p>
              ) : (
                <AnimatePresence initial={false}>
                  {filtered.map((action, index) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.16, delay: index * 0.03 }}
                      onClick={() => {
                        action.run();
                        onClose();
                        setQuery("");
                      }}
                      onMouseEnter={() => setActive(index)}
                      className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                        index === active ? "bg-purple-500/15 text-foreground shadow-[inset_0_0_0_1px_rgba(168,85,247,0.25)]" : "text-muted hover:bg-white/[0.04] hover:text-foreground"
                      }`}
                    >
                      {action.label}
                      <ArrowUpRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
