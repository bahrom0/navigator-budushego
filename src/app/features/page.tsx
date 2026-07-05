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
  featureCatalog,
  featurePillars,
  primaryCta,
} from "@/lib/marketing-content";

export default function FeaturesPage() {
  return (
    <MarketingPageShell>
      <main className="px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <section className="rounded-[2.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] px-6 py-10 shadow-[0_30px_90px_rgba(30,24,19,0.08)] sm:px-10 sm:py-12 dark:shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
            <SectionReveal className="max-w-4xl">
              <p className="inline-flex items-center rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-soft)] px-4 py-2 text-xs font-medium text-[var(--marketing-muted)]">
                Возможности платформы
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[var(--marketing-foreground)] sm:text-5xl">
                Всё, что помогает выбрать направление и не потеряться по пути
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--marketing-muted)] sm:text-lg">
                Мы собрали в одном интерфейсе подбор направлений, объяснение
                выбора, сравнение вариантов и подготовку. Всё аккуратно, без
                визуального шума и с фокусом на понятные действия.
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
                <Link href="/how-it-works">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full rounded-2xl border-[var(--marketing-border)] bg-[var(--marketing-surface-strong)] text-base text-[var(--marketing-foreground)] hover:border-[var(--marketing-border-strong)] sm:w-auto"
                  >
                    Как это работает
                  </Button>
                </Link>
              </div>
            </SectionReveal>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureCatalog.map((item, index) => (
              <SectionReveal key={item.title} delay={index * 0.05}>
                <motion.article
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="group h-full rounded-[2rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface-muted)] p-6 shadow-[0_22px_60px_rgba(31,27,22,0.06)] dark:shadow-[0_22px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-soft)] text-[var(--marketing-foreground)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  {item.eyebrow ? (
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--marketing-muted)]">
                      {item.eyebrow}
                    </p>
                  ) : null}
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--marketing-foreground)]">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)] sm:text-base">
                    {item.description}
                  </p>
                </motion.article>
              </SectionReveal>
            ))}
          </section>

          <section className="rounded-[2.5rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] px-6 py-10 shadow-[0_26px_80px_rgba(31,27,22,0.06)] sm:px-10 dark:shadow-[0_26px_80px_rgba(0,0,0,0.22)]">
            <SectionIntro
              eyebrow="Кому подойдёт"
              title="Платформа адаптируется под ваш этап выбора"
              description="Не важно, только начинаете вы разбираться в направлениях или уже хотите выстроить подготовку. Интерфейс подталкивает к следующему ясному шагу."
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {featurePillars.map((item, index) => (
                <SectionReveal key={item.title} delay={index * 0.06}>
                  <article className="h-full rounded-[1.8rem] border border-[var(--marketing-border)] bg-[var(--marketing-soft)] p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-surface-contrast)] text-[var(--marketing-foreground)]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[var(--marketing-foreground)]">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                      {item.description}
                    </p>
                  </article>
                </SectionReveal>
              ))}
            </div>
          </section>

          <MarketingCtaCard
            title="Нужен спокойный и современный старт?"
            description="Откройте платформу, пройдите короткий сценарий и получите аккуратно собранный маршрут без перегруженного интерфейса."
          />
        </div>
      </main>
    </MarketingPageShell>
  );
}
