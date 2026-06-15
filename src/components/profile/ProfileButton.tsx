"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export function ProfileButton() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const userName = user?.user_metadata?.name as string | undefined
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      aria-label="Профиль"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profile:open"));
        }
      }}
    >
      {isAuthenticated && initials ? (
        <span className="text-xs font-semibold">{initials}</span>
      ) : (
        <User className="h-4 w-4" />
      )}
    </motion.button>
  );
}
