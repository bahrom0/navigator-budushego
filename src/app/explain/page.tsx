"use client"

import { Suspense } from "react"
import ExplainContent from "./explain-content"

export default function ExplainPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-6 py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
      }
    >
      <ExplainContent />
    </Suspense>
  )
}