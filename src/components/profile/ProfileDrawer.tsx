"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutDashboard, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ProfileStats,
  ProfileActivity,
  ProfileAchievementsList,
  ProfileBookmarksList,
  ProfilePlansList,
  ProfileInterviewsList,
} from "@/components/profile";
import { SyncAccountFlow } from "@/features/auth/SyncAccountFlow";
import { cacheRemove } from "@/lib/cache";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CoachOverviewCard } from "@/components/coach/CoachOverviewCard";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const router = useRouter();

  const handleDashboard = () => {
    onClose();
    router.push("/dashboard");
  };

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    onClose();
    router.push("/");
  };

  const handleReset = () => {
    cacheRemove("profile");
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("session_id");
    }
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.6, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 80 || info.velocity.x > 200) {
                onClose();
              }
            }}
            className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-card-bg shadow-2xl sm:w-[420px]"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex flex-col">
                <span className="text-base font-semibold text-foreground">
                  Профиль
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {isAuthenticated && authUser ? authUser.email : "Анонимный"}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDashboard}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    aria-label="Дешборд"
                  >
                    <LayoutDashboard className="h-3 w-3" />
                    Дешборд
                  </motion.button>
                  <ThemeToggle />
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-foreground/5"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4 text-text-secondary" />
              </button>
            </div>
            <div className="flex flex-col gap-6 p-5">
              <ProfileStats />
              <CoachOverviewCard compact />
              <ProfileActivity />
              <ProfileAchievementsList />
              <ProfileBookmarksList />
              <ProfilePlansList />
              <ProfileInterviewsList />
              <SyncAccountFlow />
              <button
                type="button"
                onClick={handleReset}
                className="rounded-[14px] border border-border bg-card-bg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                Сбросить профиль
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-error/30 bg-error/5 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </button>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
