"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";
import {
  MarketingCtaCard,
  MarketingPageShell,
  SectionIntro,
  SectionReveal,
} from "@/components/marketing/marketing-shell";
import {
  comparisonPoints,
  howItWorksDetails,
  processSteps,
  primaryCta,
  workflowMetrics,
} from "@/lib/marketing-content";

export default function HowItWorksPage() {
  return (
    <MarketingPageShell>
      <main className="px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <section className="grid gap-8 rounded-[2.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] px-6 py-10 shadow-[0_30px_90px_rgba(30,24,19,0.08)] backdrop-blur-xl lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-12 dark:shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
            <SectionReveal className="max-w-3xl">
              <p className="inline-flex items-center rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-soft)] px-4 py-2 text-xs font-medium text-[var(--marketing-muted)]">
                Просто и последовательно
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[var(--marketing-foreground)] sm:text-5xl">
                Как работает NCT Navigator
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--marketing-muted)] sm:text-lg">
                Мы убираем лишний шум из процесса поступления: сначала собираем
                ваш контекст, затем показываем подходящие направления и сразу
                переводим выбор в спокойный маршрут подготовки.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryCta.href}>
                  <Button
                    size="lg"
                    className="w-full rounded-2xl bg-[var(--marketing-foreground)] text-base text-white hover:bg-[var(--marketing-accent)] sm:w-auto"
                  >
                    {primaryCta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/features">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full rounded-2xl border-[var(--marketing-border)] bg-[var(--marketing-surface-strong)] text-base text-[var(--marketing-foreground)] hover:border-[var(--marketing-border-strong)] sm:w-auto"
                  >
                    Посмотреть возможности
                  </Button>
                </Link>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.08}>
              <div className="grid gap-4 rounded-[2rem] border border-[var(--marketing-border)] bg-[var(--marketing-soft)] p-4 sm:p-5">
                {workflowMetrics.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: 18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
                    className="rounded-[1.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] p-5 shadow-[0_20px_50px_rgba(31,27,22,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.22)]"
                  >
                    <p className="text-sm font-semibold text-[var(--marketing-foreground)]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </SectionReveal>
          </section>

          <section className="rounded-[2.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] px-6 py-10 shadow-[0_28px_80px_rgba(30,24,19,0.06)] sm:px-10 dark:shadow-[0_28px_80px_rgba(0,0,0,0.24)]">
            <SectionIntro
              eyebrow="Маршрут по шагам"
              title="Понятный путь от первого вопроса до плана подготовки"
              description="Каждый шаг решает отдельную задачу и мягко подводит к следующему действию, чтобы не терялась логика выбора."
            />

            <div className="mt-10 grid gap-5 lg:grid-cols-4">
              {processSteps.map((step, index) => (
                <SectionReveal key={step.number} delay={index * 0.05}>
                  <article className="group h-full rounded-[1.75rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] p-6 transition-transform duration-300 hover:-translate-y-1 dark:shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-surface-contrast)] text-sm font-semibold text-[var(--marketing-foreground)]">
                      {step.number}
                    </div>
                    <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--marketing-foreground)]">
                      {step.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--marketing-muted)]">
                      {step.description}
                    </p>
                  </article>
                </SectionReveal>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            {howItWorksDetails.map((item, index) => (
              <SectionReveal key={item.title} delay={index * 0.05}>
                <article className="h-full rounded-[2rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-6 shadow-[0_24px_60px_rgba(31,27,22,0.05)] sm:p-7 dark:shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-soft)] text-[var(--marketing-foreground)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[var(--marketing-foreground)]">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)] sm:text-base">
                    {item.description}
                  </p>
                </article>
              </SectionReveal>
            ))}
          </section>

          <section className="rounded-[2.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] px-6 py-10 shadow-[0_24px_70px_rgba(31,27,22,0.06)] sm:px-10 dark:shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
            <SectionIntro
              eyebrow="Что это даёт"
              title="Зачем такой сценарий работает лучше"
              description="Вместо резкого перехода между разрозненными инструментами пользователь движется по одному связному сценарию."
              align="left"
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {comparisonPoints.map((point, index) => (
                <SectionReveal key={point} delay={index * 0.05}>
                  <div className="rounded-[1.6rem] border border-[var(--marketing-border)] bg-[var(--marketing-soft)] px-5 py-6 text-sm leading-6 text-[var(--marketing-foreground)]">
                    {point}
                  </div>
                </SectionReveal>
              ))}
            </div>
          </section>

          <MarketingCtaCard
            title="Готовы пройти путь без перегруза?"
            description="Начните с короткого сценария, получите рекомендации и переведите выбор в рабочий план подготовки уже сегодня."
          />
        </div>
      </main>
    </MarketingPageShell>
  );
}
