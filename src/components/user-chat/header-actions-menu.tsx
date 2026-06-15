"use client"

import { motion } from "framer-motion"
import { BellOff, Eraser, ShieldAlert } from "lucide-react"

interface HeaderActionsMenuProps {
  onClose: () => void
  onMute: () => void
  onClear: () => void
  onBlock: () => void
}

export function HeaderActionsMenu({
  onMute,
  onClear,
  onBlock,
}: HeaderActionsMenuProps) {
  return (
    <motion.div
      role="menu"
      initial={{ opacity: 0, y: -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-border bg-card-bg/95 py-1 shadow-lg backdrop-blur"
    >
      <ActionItem
        icon={<BellOff className="h-4 w-4" />}
        label="Отключить уведомления"
        onClick={onMute}
      />
      <ActionItem
        icon={<Eraser className="h-4 w-4" />}
        label="Очистить историю"
        onClick={onClear}
      />
      <div className="my-1 border-t border-border/60" />
      <ActionItem
        icon={<ShieldAlert className="h-4 w-4" />}
        label="Заблокировать"
        danger
        onClick={onBlock}
      />
    </motion.div>
  )
}

interface ActionItemProps {
  icon: React.ReactNode
  label: string
  danger?: boolean
  onClick: () => void
}

function ActionItem({ icon, label, danger = false, onClick }: ActionItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
        danger
          ? "text-error hover:bg-error/5"
          : "text-text-secondary hover:bg-border/40 hover:text-foreground"
      }`}
    >
      <span className={danger ? "text-error" : "text-text-muted"}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
