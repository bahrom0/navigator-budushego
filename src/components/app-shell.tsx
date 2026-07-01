"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bot, GraduationCap, MessageCircle } from "lucide-react";
import { ProfileButton, ProfileDrawer } from "@/components/profile";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuthStore } from "@/stores/auth-store";
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
  const showBackButton = isChatRoute && !!activeConversationId;

  return (
    <>
      <ThemeSync />
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
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
                href="/teacher"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                aria-label="AI Teacher"
              >
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline">AI Teacher</span>
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/chat"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                aria-label="User Chat"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/coach"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                aria-label="AI Coach"
              >
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Coach</span>
              </Link>
            )}
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
