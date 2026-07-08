"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ChevronRight,
  Info,
  LayoutGrid,
  Menu,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { StartSelectionButton } from "@/components/marketing/StartSelectionButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  brandName,
  brandTagline,
  footerCaption,
  footerLinks,
  marketingNavLinks,
  primaryCta,
} from "@/lib/marketing-content";

type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "center" | "left";
};

type MarketingPageShellProps = {
  children: React.ReactNode;
};

const mobileNavIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/#about": Info,
  "/how-it-works": Workflow,
  "/features": LayoutGrid,
};

export function MarketingPageShell({ children }: MarketingPageShellProps) {
  return (
    <div className="relative isolate overflow-hidden bg-[var(--marketing-bg)] text-[var(--marketing-foreground)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(236,227,215,0.7),transparent_56%)] dark:bg-[radial-gradient(circle_at_top,rgba(88,99,125,0.18),transparent_56%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgba(91,78,64,0.08)_1px,transparent_0)] [background-size:22px_22px] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(221,216,209,0.08)_1px,transparent_0)]" />
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.78),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(109,122,146,0.16),transparent_70%)]" />
      <MarketingHeader />
      <div className="pt-24 sm:pt-28 lg:pt-0">{children}</div>
      <MarketingFooter />
    </div>
  );
}

export function MarketingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-[60] px-4 pt-4 sm:px-6 lg:sticky lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative z-50 overflow-hidden rounded-[1.9rem] border border-[var(--marketing-border)] bg-[var(--marketing-header-bg)] px-4 py-3 shadow-[0_24px_80px_rgba(28,24,18,0.14)] ring-1 ring-[rgba(255,255,255,0.28)] backdrop-blur-[22px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_45%)] after:pointer-events-none after:absolute after:inset-0 after:opacity-45 after:[background-image:radial-gradient(circle_at_1px_1px,rgba(78,66,52,0.08)_1px,transparent_0)] after:[background-size:16px_16px] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] dark:ring-[rgba(255,255,255,0.08)] dark:before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_45%)] dark:after:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)]">
          <div className="relative flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-sm font-semibold tracking-[-0.02em] text-[var(--marketing-foreground)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-surface)] shadow-[0_12px_30px_rgba(32,28,24,0.1)] backdrop-blur-xl dark:shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
                <Sparkles className="h-4 w-4 text-[var(--marketing-accent)]" />
              </span>
              <span className="hidden sm:inline">{brandName}</span>
              <span className="sm:hidden">NCT</span>
            </Link>

            <nav className="hidden items-center gap-7 text-sm text-[var(--marketing-muted)] lg:flex">
              {marketingNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors duration-200 hover:text-[var(--marketing-foreground)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <ThemeToggle variant="marketing" />
              <StartSelectionButton
                size="md"
                className="rounded-2xl bg-[var(--marketing-foreground)] px-5 text-sm text-white hover:bg-[var(--marketing-accent)]"
              >
                {primaryCta.label}
              </StartSelectionButton>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle variant="marketing" />
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
                onClick={() => setIsOpen((value) => !value)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-surface)] text-[var(--marketing-foreground)] shadow-[0_10px_24px_rgba(32,28,24,0.09)] backdrop-blur-xl transition duration-200 hover:scale-[1.02] hover:border-[var(--marketing-border-strong)] dark:shadow-[0_10px_24px_rgba(0,0,0,0.32)]"
              >
                {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-40 bg-[var(--marketing-mobile-overlay)] backdrop-blur-[10px] lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.96, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(8px)" }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-[60] mx-auto mt-3 max-w-7xl lg:hidden"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-[var(--marketing-border-strong)] bg-[var(--marketing-header-panel-bg)] p-4 shadow-[0_34px_80px_rgba(26,22,18,0.2)] ring-1 ring-[rgba(255,255,255,0.56)] backdrop-blur-[30px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.42),transparent_44%)] after:pointer-events-none after:absolute after:inset-0 after:opacity-28 after:[background-image:radial-gradient(circle_at_1px_1px,rgba(78,66,52,0.06)_1px,transparent_0)] after:[background-size:16px_16px]">
                <nav className="relative flex flex-col gap-2">
                  {marketingNavLinks.map((link, index) => {
                    const Icon = mobileNavIcons[link.href] ?? Sparkles;

                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{
                          duration: 0.2,
                          delay: 0.04 + index * 0.04,
                          ease: "easeOut",
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className="group flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-[var(--marketing-muted)] transition duration-200 hover:bg-[var(--marketing-nav-chip-hover)] hover:text-[var(--marketing-foreground)]"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-nav-chip)] shadow-[0_10px_20px_rgba(32,28,24,0.06)] backdrop-blur-xl">
                              <Icon className="h-4 w-4 text-[var(--marketing-foreground)]" />
                            </span>
                            <span>{link.label}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <div className="relative mt-4 block" onClick={() => setIsOpen(false)}>
                  <StartSelectionButton
                    size="md"
                    className="h-12 w-full rounded-[1.2rem] bg-[var(--marketing-cta-bg)] text-sm font-semibold text-white shadow-[0_18px_40px_rgba(48,99,232,0.3)] hover:bg-[var(--marketing-cta-hover)]"
                  >
                    {primaryCta.label}
                  </StartSelectionButton>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--marketing-border)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-[var(--marketing-muted)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="inline-flex items-center gap-3 font-medium text-[var(--marketing-foreground)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-surface)]">
              <Sparkles className="h-4 w-4 text-[var(--marketing-accent)]" />
            </span>
            {brandName}
          </div>
          <p className="max-w-xl text-sm leading-6">{footerCaption}</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[var(--marketing-foreground)]"
            >
              {link.label}
            </Link>
          ))}
          <span>В© 2026 {brandName}</span>
        </div>
      </div>
    </footer>
  );
}

export function SectionReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  align = "center",
}: SectionIntroProps) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-3xl text-center"
          : "max-w-3xl text-left"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--marketing-muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--marketing-foreground)] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[var(--marketing-muted)] sm:text-lg">
        {description}
      </p>
    </div>
  );
}

export function MarketingCtaCard({
  title,
  description,
  primaryLabel = primaryCta.label,
  primaryHref = primaryCta.href,
}: {
  title: string;
  description: string;
  primaryLabel?: string;
  primaryHref?: string;
}) {
  return (
    <SectionReveal>
      <section className="overflow-hidden rounded-[2rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface-strong)] px-6 py-10 shadow-[0_30px_90px_rgba(30,24,19,0.08)] sm:px-10 sm:py-12 dark:shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
        <div className="absolute" />
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--marketing-foreground)]">
            {title}
          </h3>
          <p className="mt-4 text-base leading-7 text-[var(--marketing-muted)]">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StartSelectionButton
              size="lg"
              showArrow
              className="w-full rounded-2xl bg-[var(--marketing-foreground)] px-7 text-base text-white hover:bg-[var(--marketing-accent)] sm:w-auto"
            >
              {primaryLabel}
            </StartSelectionButton>
            <p className="text-sm text-[var(--marketing-muted)]">{brandTagline}</p>
          </div>
        </div>
      </section>
    </SectionReveal>
  );
}
