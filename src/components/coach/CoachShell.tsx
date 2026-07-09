"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Map,
  MessageCircle,
  Settings2,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCoachStore } from "@/stores/coach-store";
import { useProfileStore } from "@/stores/profile-store";
import type { CoachActiveTab } from "@/types/coach";

interface TabConfig {
  id: CoachActiveTab;
  label: string;
  icon: typeof Map;
}

const TABS: TabConfig[] = [
  { id: "roadmap", label: "Roadmap", icon: Map },
  { id: "today", label: "Сегодня", icon: Target },
  { id: "chat", label: "Чат", icon: MessageCircle },
  { id: "progress", label: "Прогресс", icon: TrendingUp },
];

interface CoachShellProps {
  children: ReactNode;
}

export function CoachShell({ children }: CoachShellProps) {
  const goal = useCoachStore((s) => s.goal);
  const profileGoal = useProfileStore((s) => s.activeGoal);
  const streak = useCoachStore((s) => s.progress.currentStreak);
  const activeTab = useCoachStore((s) => s.activeTab);
  const setActiveTab = useCoachStore((s) => s.setActiveTab);
  const archiveGoal = useCoachStore((s) => s.archiveGoal);
  const resolvedGoal = goal ?? profileGoal;

  return (
    <div className={`bg-background ${
      activeTab === "chat" ? "-mt-px h-[calc(100dvh-3.5rem)] flex flex-col" : "-mt-px"
    }`}>
      <header className="sticky top-14 z-30 border-b border-border bg-card-bg/88 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            {/* <span className="navigator-kicker">Main workspace · coach</span> */}
            <p className="mt-2 truncate text-[15px] font-semibold text-foreground">
              {resolvedGoal?.nctTitle ?? "Цель не выбрана"}
            </p>
            <p className="truncate text-xs text-text-secondary">
              {resolvedGoal?.nctCode ? `${resolvedGoal.nctCode} · ` : ""}
              {resolvedGoal?.university ?? "Coach поможет выбрать цель"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StreakBadge value={streak} />
            {/* {resolvedGoal ? (
              <button
                type="button"
                onClick={archiveGoal}
                aria-label="Сменить цель"
                title="Сменить цель"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-border bg-background text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            ) : null} */}
          </div>
        </div>
        <div className="mt-2 hidden md:block">
          <DesktopTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      <main className={`mx-auto w-full ${
        activeTab === "chat"
          ? "flex min-h-0 flex-col flex-1 overflow-hidden"
          : "max-w-3xl px-4 pb-24 pt-5 sm:px-6 md:pb-8"
      }`}>
        {activeTab === "chat" ? (
          children
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        )}
      </main>

      <MobileTabs activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

function StreakBadge({ value }: { value: number }) {
  return (
    <div
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-warning/10 px-3 text-warning"
      aria-label={`Текущая серия: ${value} ${pluralDays(value)}`}
    >
      <Flame className="h-4 w-4" aria-hidden="true" />
      <span className="text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: TabConfig;
  active: boolean;
  onClick: (id: CoachActiveTab) => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onClick(tab.id)}
      className={`relative flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors md:flex-none md:px-4 md:text-sm ${
        active
          ? "text-primary"
          : "text-text-secondary hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{tab.label}</span>
      {active ? (
        <motion.span
          layoutId="coach-tab-underline"
          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary md:inset-x-3"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      ) : null}
    </button>
  );
}

function DesktopTabs({
  activeTab,
  onChange,
}: {
  activeTab: CoachActiveTab;
  onChange: (tab: CoachActiveTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Разделы Coach"
      className="mx-auto flex max-w-3xl items-stretch px-2 sm:px-4"
    >
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          active={activeTab === tab.id}
          onClick={onChange}
        />
      ))}
    </div>
  );
}

function MobileTabs({
  activeTab,
  onChange,
}: {
  activeTab: CoachActiveTab;
  onChange: (tab: CoachActiveTab) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Разделы Coach"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card-bg pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          active={activeTab === tab.id}
          onClick={onChange}
        />
      ))}
    </nav>
  );
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}
