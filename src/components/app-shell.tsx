"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bot, GraduationCap, MessageCircle } from "lucide-react";
import { ProfileButton, ProfileDrawer } from "@/components/profile";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuthStore } from "@/stores/auth-store";
import { useProfileStore } from "@/stores/profile-store";
import { logActivityEvent } from "@/lib/activity-logger";
import { useProfileSync } from "@/lib/chat/use-profile-sync";
import { useMobileChatNavStore } from "@/stores/mobile-chat-nav-store";
import { useUserChatStore } from "@/lib/user-chat/store";
import { AnimatedShellTitle } from "@/components/animated-shell-title";
import { ThemeSync } from "@/components/theme/ThemeSync";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const activeGoal = useProfileStore((s) => s.activeGoal);
  const pathname = usePathname();
  const activeConversationId = useUserChatStore((s) => s.activeConversationId);
  const openMobileChatNav = useMobileChatNavStore((s) => s.open);

  useProfileSync();

  useEffect(() => {
    hydrate();
    const handler = () => {
      setOpen(true);
      logActivityEvent("open_profile", "Открытие профиля пользователем");
    };
    const onSync = () => setOpen((v) => v);
    window.addEventListener("profile:open", handler as EventListener);
    window.addEventListener("profile:sync", onSync);
    return () => {
      window.removeEventListener("profile:open", handler as EventListener);
      window.removeEventListener("profile:sync", onSync);
    };
  }, [hydrate]);

  const isChatRoute = pathname?.startsWith("/chat");
  const isMarketingRoute =
    pathname === "/" ||
    pathname === "/how-it-works" ||
    pathname === "/features" ||
    pathname === "/onboarding";
  const isCoreFlowRoute =
    pathname?.startsWith("/categories") ||
    pathname?.startsWith("/analyze") ||
    pathname?.startsWith("/recommendations") ||
    pathname?.startsWith("/interview") ||
    pathname?.startsWith("/plan") ||
    pathname?.startsWith("/coach");
  const showBackButton = isChatRoute && !!activeConversationId;

  if (isMarketingRoute) {
    return (
      <>
        <ThemeSync />
        <main className="flex-1">{children}</main>
        <LoginModal />
      </>
    );
  }

  return (
    <>
      <ThemeSync />
      <header className="sticky top-0 z-40 border-b border-border bg-card-bg/78 shadow-[0_1px_0_rgb(255_255_255_/_0.18)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            {showBackButton ? (
              <button
                type="button"
                onClick={openMobileChatNav}
                aria-label="Показать чаты"
                title="Показать чаты"
                className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-border/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            <a
              href="/"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              <AnimatedShellTitle isChat={!!isChatRoute} />
            </a>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Link
                href="/coach"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                aria-label={activeGoal ? "Coach" : "Основной путь"}
              >
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">{activeGoal ? "Учитель" : "Основной путь"}</span>
              </Link>
            )}
            {isAuthenticated && !isCoreFlowRoute ? (
              <>
                <Link
                  href="/teacher"
                  className="hidden h-10 items-center gap-1.5 rounded-full border border-border bg-card-bg px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-foreground sm:inline-flex"
                  aria-label="AI Help"
                >
                  <Bot className="h-4 w-4" />
                  <span className="hidden lg:inline">ИИ чат</span>
                </Link>
                <Link
                  href="/chat"
                  className="hidden h-10 items-center gap-1.5 rounded-full border border-border bg-card-bg px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-foreground sm:inline-flex"
                  aria-label="Community"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden lg:inline">Сообщество</span>
                </Link>
              </>
            ) : null}
            <ProfileButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <ProfileDrawer open={open} onClose={() => setOpen(false)} />
      <LoginModal />
    </>
  );
}
