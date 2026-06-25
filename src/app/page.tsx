"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/Button";

export default function Home() {
return (
<main className="flex flex-1 w-full flex-col items-center justify-center px-6 py-24">
<motion.div
initial={{ opacity: 0, y: 12 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4, ease: "easeOut" }}
className="max-w-2xl text-center"
>
<h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
Найдите нужный код Национального Центра Тестирования
</h1>
<p className="mt-4 text-lg text-text-secondary">
Опишите ситуацию простыми словами — система подберёт наиболее подходящий
код и объяснит, почему он выбран.
</p>
<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
<Link href="/onboarding">
<Button size="lg">Начать анализ</Button>
</Link>
</div>
</motion.div>
</main>
);
}