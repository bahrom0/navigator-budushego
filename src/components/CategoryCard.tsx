"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import type { Category } from "@/types/categories";

interface CategoryCardProps {
  category: Category;
  selected: boolean;
  onClick: () => void;
}

export function CategoryCard({ category, selected, onClick }: CategoryCardProps) {
  const Icon = category.icon;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      animate={
        selected
          ? { borderColor: "var(--primary)", backgroundColor: "var(--primary-light)" }
          : { borderColor: "var(--border)", backgroundColor: "var(--card-bg)" }
      }
      className="relative flex flex-col items-center gap-2 rounded-[20px] border p-4 text-center"
    >
      <AnimatePresence>
        {selected && (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-2 right-2 text-primary"
          >
            <Check className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
      {Icon && (
        <Icon
          className={`h-6 w-6 shrink-0 ${selected ? "text-primary" : "text-text-secondary"}`}
        />
      )}
      <span className="text-sm font-medium text-foreground line-clamp-1">{category.name}</span>
      <span className="text-xs text-text-muted line-clamp-2 leading-snug">{category.description}</span>
    </motion.button>
  );
}
