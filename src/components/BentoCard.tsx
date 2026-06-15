"use client";

import { motion } from "framer-motion";

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  span?: 1 | 2 | 3;
}

export function BentoCard({ children, className = "", span = 1 }: BentoCardProps) {
  const spanMap: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-1 md:col-span-2",
    3: "col-span-1 md:col-span-2 xl:col-span-3",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={`
        bg-card-bg border border-border rounded-[20px]
        shadow-[0_1px_3px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.06)]
        transition-shadow duration-200
        p-6
        ${spanMap[span]}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}