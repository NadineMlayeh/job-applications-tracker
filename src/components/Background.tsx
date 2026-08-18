"use client";

import { motion } from "framer-motion";

export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.div
        className="absolute -left-[12%] -top-[18%] h-[46rem] w-[46rem] rounded-full bg-purple-600/20 blur-[130px]"
        animate={{ x: [0, 50, -30, 0], y: [0, -25, 30, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[14%] top-[8%] h-[40rem] w-[40rem] rounded-full bg-cyan-500/14 blur-[130px]"
        animate={{ x: [0, -45, 25, 0], y: [0, 30, -20, 0], scale: [1, 0.95, 1.1, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-22%] left-[30%] h-[38rem] w-[38rem] rounded-full bg-fuchsia-600/12 blur-[140px]"
        animate={{ x: [0, 30, -35, 0], y: [0, -20, 25, 0], scale: [1, 1.1, 0.98, 1] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
