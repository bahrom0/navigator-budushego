"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { StartSelectionButton } from "@/components/marketing/StartSelectionButton";
import {
  MarketingCtaCard,
  MarketingPageShell,
  SectionIntro,
  SectionReveal,
} from "@/components/marketing/marketing-shell";
import {
  landingDescription,
  landingEyebrow,
  landingFeatures,
  landingTitle,
  primaryCta,
  processSteps,
  secondaryCta,
} from "@/lib/marketing-content";

export default function Home() {
  return (
    <MarketingPageShell>
      <main className="px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <section className="relative overflow-hidden rounded-[2.75rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] px-6 py-12 shadow-[0_34px_110px_rgba(30,24,19,0.08)] backdrop-blur-xl sm:px-10 lg:px-14 lg:py-16 dark:shadow-[0_34px_110px_rgba(0,0,0,0.35)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.62),transparent_72%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_72%)]" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="relative mx-auto max-w-4xl text-center"
            >
              <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-soft)] px-4 py-2 text-xs font-medium text-[var(--marketing-muted)] shadow-[0_12px_30px_rgba(31,27,22,0.05)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--marketing-accent)]" />
                {landingEyebrow}
              </p>

              <h1 className="mt-8 text-4xl font-semibold tracking-[-0.06em] text-[var(--marketing-foreground)] sm:text-5xl lg:text-7xl">
                {landingTitle}
              </h1>

              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[var(--marketing-muted)] sm:text-xl">
                {landingDescription}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {["Учусь в 11 классе", "Интересуюсь IT и технологиями", "Хочу поступить в сильный вуз"].map(
                  (signal) => (
                    <span
                      key={signal}
                      className="rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] px-4 py-2 text-sm text-[var(--marketing-muted)] shadow-[0_8px_24px_rgba(31,27,22,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                    >
                      {signal}
                    </span>
                  ),
                )}
              </div>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <StartSelectionButton
                  size="lg"
                  showArrow
                  className="w-full rounded-2xl bg-[var(--marketing-foreground)] px-7 text-base text-white hover:bg-[var(--marketing-accent)] sm:w-auto"
                >
                  {primaryCta.label}
                </StartSelectionButton>

                <Link href={secondaryCta.href}>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full rounded-2xl border-[var(--marketing-border)] bg-[var(--marketing-surface-strong)] text-base text-[var(--marketing-foreground)] hover:border-[var(--marketing-border-strong)] sm:w-auto"
                  >
                    {secondaryCta.label}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </section>

          <section id="about" className="grid gap-5 lg:grid-cols-3">
            {landingFeatures.map((feature, index) => (
              <SectionReveal key={feature.title} delay={index * 0.05}>
                <motion.article
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="h-full rounded-[2rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-6 shadow-[0_24px_70px_rgba(31,27,22,0.05)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-soft)] text-[var(--marketing-foreground)]">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  {feature.eyebrow ? (
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--marketing-muted)]">
                      {feature.eyebrow}
                    </p>
                  ) : null}
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--marketing-foreground)]">
                    {feature.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)] sm:text-base">
                    {feature.description}
                  </p>
                  {feature.href ? (
                    <Link
                      href={feature.href}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--marketing-foreground)] transition-colors hover:text-[var(--marketing-accent)]"
                    >
                      Подробнее
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </motion.article>
              </SectionReveal>
            ))}
          </section>

          <section className="rounded-[2.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] px-6 py-10 shadow-[0_24px_80px_rgba(31,27,22,0.06)] sm:px-10 dark:shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <SectionIntro
              eyebrow="Просто и понятно"
              title="Как это работает"
              description="Вы не получаете сухой список кодов. Сервис помогает собрать контекст, объяснить выбор и перейти к следующему шагу без перегруза."
            />

            <div className="mt-10 grid gap-4 xl:grid-cols-4">
              {processSteps.map((step, index) => (
                <SectionReveal key={step.number} delay={index * 0.05}>
                  <div className="flex h-full gap-4 rounded-[1.75rem] border border-[var(--marketing-border)] bg-[var(--marketing-soft)] p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-surface-contrast)] text-sm font-semibold text-[var(--marketing-foreground)]">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--marketing-foreground)]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </section>

          <MarketingCtaCard
            title="Готовы начать свой путь?"
            description="Создайте профиль и получите персональные рекомендации уже сегодня. Всё аккуратно, минималистично и без перегруженных шагов."
          />
        </div>
      </main>
    </MarketingPageShell>
  );
}
