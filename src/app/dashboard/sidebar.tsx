"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, ClipboardList, GraduationCap, History, Mic, Bookmark, Activity, Award, Menu, X, ArrowLeft,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/dashboard/plans", label: "Планы", icon: ClipboardList },
  { href: "/coach", label: "Coach", icon: GraduationCap },
  { href: "/dashboard/history", label: "История", icon: History },
  { href: "/dashboard/interviews", label: "Интервью", icon: Mic },
  { href: "/dashboard/bookmarks", label: "Закладки", icon: Bookmark },
  { href: "/dashboard/activity", label: "Активность", icon: Activity },
  { href: "/dashboard/achievements", label: "Достижения", icon: Award },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg md:hidden"
        aria-label="Меню"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-card-bg
          transition-transform duration-200
          md:relative md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-full p-1 md:hidden" aria-label="Закрыть">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors
                  ${isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-foreground/5 hover:text-foreground"}
                `}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
