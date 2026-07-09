"use client";

import { AnimatePresence, motion } from "framer-motion";

interface AnimatedShellTitleProps {
  isChat: boolean;
}

export function AnimatedShellTitle({ isChat }: AnimatedShellTitleProps) {
  const text = isChat ? "Сообщество" : "NCT Navigator";
  return (
    <span className="relative inline-flex h-5 overflow-hidden align-middle">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
