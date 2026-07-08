"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BentoGrid } from "@/components/BentoGrid";
import { BentoCard } from "@/components/BentoCard";
import { CategoryCard } from "@/components/CategoryCard";
import { Button } from "@/components/Button";
import { CATEGORIES } from "@/constants/categories";
import { persistCategories, useCategoryStore } from "@/stores/category-store";
import { hydrateOnboardingStore, useOnboardingStore } from "@/stores/onboarding-store";
import { Sparkles, GitCompare, BookOpen, Plus, X } from "lucide-react";
import type { Category } from "@/types/categories";
import { logActivityEvent } from "@/lib/activity-logger";

export default function CategoriesPage() {
  const router = useRouter();
  const selected = useCategoryStore((s) => s.selected);
  const toggle = useCategoryStore((s) => s.toggle);
  const addCustom = useCategoryStore((s) => s.addCustom);
  const onboardingLoaded = useOnboardingStore((s) => s._loaded);
  const [showModal, setShowModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  useEffect(() => {
    hydrateOnboardingStore();
  }, []);

  const allCategories = [...CATEGORIES, ...customCategories];

  const handleAddCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const id = `custom-${Date.now()}`;
    const description = customDesc.trim() || "Пользовательское направление";
    const newCat: Category = {
      id,
      name: trimmed,
      description,
      icon: Plus,
      custom: true,
    };
    setCustomCategories((prev) => [...prev, newCat]);
    addCustom({ id, name: trimmed, description });
    logActivityEvent("choose_category", `Добавлено направление: ${trimmed}`);
    setCustomName("");
    setCustomDesc("");
    setShowModal(false);
  };

  const handleContinue = () => {
    if (selected.length > 0) {
      const interestNames = selected
        .map((id) => allCategories.find((c) => c.id === id))
        .filter(Boolean)
        .map((c) => c!.name)
      persistCategories()
      useOnboardingStore.getState().setInterests(interestNames)
      logActivityEvent("open_app", `Запуск анализа для ${selected.length} направлений`);
      router.push("/analyze");
    }
  };

  if (!onboardingLoaded) {
    return (
      <main className="flex min-h-[60vh] flex-1 items-center justify-center px-6 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Выберите направления
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Можно выбрать несколько. Это поможет точнее подобрать специальности НЦТ.
          </p>
        </motion.div>

        <BentoGrid cols={4}>
          {allCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              selected={selected.includes(category.id)}
              onClick={() => {
                const isSelecting = !selected.includes(category.id)
                toggle(category.id)
                logActivityEvent("choose_category", `${isSelecting ? "Выбрано" : "Убрано"}: ${category.name}`)
              }}
            />
          ))}
          <motion.button
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-border p-6 text-center hover:border-primary hover:bg-primary-light"
          >
            <Plus className="h-8 w-8 text-text-muted" />
            <span className="font-medium text-foreground">Добавить направление</span>
          </motion.button>
        </BentoGrid>

        <div className="mt-8 flex justify-center">
          <Button size="lg" disabled={selected.length === 0} onClick={handleContinue}>
            Продолжить {selected.length > 0 && `(${selected.length})`}
          </Button>
        </div>

        <div className="mt-20">
          <BentoGrid cols={3}>
            <BentoCard span={1}>
              <div className="flex flex-col gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Как это работает</h3>
                <p className="text-sm text-text-secondary">
                  Система анализирует ваш выбор и сопоставляет его с базой кодов НЦТ.
                </p>
              </div>
            </BentoCard>
            <BentoCard span={1}>
              <div className="flex flex-col gap-3">
                <GitCompare className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Преимущества</h3>
                <p className="text-sm text-text-secondary">
                  Ранжирование по релевантности, объяснения выбора и университеты.
                </p>
              </div>
            </BentoCard>
            <BentoCard span={1}>
              <div className="flex flex-col gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Без регистрации</h3>
                <p className="text-sm text-text-secondary">
                  Получите полный результат сразу, регистрация нужна только для сохранения.
                </p>
              </div>
            </BentoCard>
          </BentoGrid>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md rounded-[20px] bg-card-bg p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Новое направление</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-1 hover:bg-foreground/5"
                >
                  <X className="h-5 w-5 text-text-secondary" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Название</label>
                  <input
                    autoFocus
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Например, Робототехника"
                    className="h-11 rounded-[14px] border border-border bg-background px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Описание (необязательно)</label>
                  <input
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="Кратко о направлении"
                    className="h-11 rounded-[14px] border border-border bg-background px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <Button
                  onClick={handleAddCustom}
                  disabled={!customName.trim()}
                  className="mt-2"
                >
                  Добавить
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
