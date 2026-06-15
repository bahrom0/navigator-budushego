"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ChevronLeft } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
          <RefreshCw className="h-7 w-7 text-error" />
        </div>
        <p className="mt-4 text-sm font-medium text-error">Что-то пошло не так</p>
        <p className="mt-2 text-sm text-text-secondary">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-base font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-6 text-base font-medium text-text-secondary transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            На главную
          </button>
        </div>
      </motion.div>
    </main>
  );
}
