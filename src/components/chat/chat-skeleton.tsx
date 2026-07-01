"use client"

import { motion } from "framer-motion"

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-border/30 ${className ?? ""}`} />
}

export function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={`h-full flex-shrink-0 overflow-hidden border-r border-border bg-card-bg transition-[width] duration-200 ${
        collapsed ? "w-0" : "w-[260px]"
      }`}
    >
      <div className="flex h-full w-[260px] flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Pulse className="h-4 w-16" />
          <Pulse className="h-8 w-8" />
        </div>
        <div className="shrink-0 px-3 pt-3">
          <Pulse className="h-11 w-full" />
        </div>
        <div className="flex flex-col gap-3 px-3 py-4">
          <Pulse className="h-3 w-12" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-2">
              <Pulse className="h-3.5 w-3.5" />
              <Pulse className="h-4 flex-1" />
            </div>
          ))}
          <div className="mt-2">
            <Pulse className="h-3 w-16" />
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-2">
              <Pulse className="h-3.5 w-3.5" />
              <Pulse className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatAreaSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex w-full max-w-[720px] flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          <Pulse className="h-6 w-6 flex-shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-5/6" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Pulse className="h-6 w-6 flex-shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Pulse className="h-4 w-4/5" />
            <Pulse className="h-4 w-3/4" />
            <Pulse className="h-4 w-2/3" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Pulse className="h-6 w-6 flex-shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-1/2" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
