"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  CornerUpLeft,
  Copy,
  Pencil,
  Trash2,
  Share2,
  Info,
} from "lucide-react"

export interface MessageActions {
  onReply: () => void
  onCopy: () => void
  onEdit?: () => void
  onDelete?: () => void
  onForward: () => void
  onInfo: () => void
}

interface MessageActionsMenuProps extends MessageActions {
  own: boolean
  anchorRef: HTMLElement
  onClose: () => void
}

interface Position {
  top: number
  left: number
  placement: "top" | "bottom"
}

const MENU_WIDTH = 208
const MENU_ESTIMATED_HEIGHT = 280
const GAP = 6
const EDGE_PADDING = 8

function computePosition(
  anchorRect: DOMRect,
  viewport: { w: number; h: number },
  menuHeight: number,
): Position {
  const spaceBelow = viewport.h - anchorRect.bottom
  const spaceAbove = anchorRect.top
  const shouldFlip =
    spaceBelow < menuHeight + GAP && spaceAbove > spaceBelow

  const placement: "top" | "bottom" = shouldFlip ? "top" : "bottom"
  const top = shouldFlip
    ? Math.max(EDGE_PADDING, anchorRect.top - menuHeight - GAP)
    : Math.min(
        viewport.h - menuHeight - EDGE_PADDING,
        anchorRect.bottom + GAP,
      )

  const horizontalCenter = anchorRect.left + anchorRect.width / 2
  const isLeftAligned = horizontalCenter < viewport.w / 2

  const left = isLeftAligned
    ? Math.max(
        EDGE_PADDING,
        Math.min(anchorRect.left, viewport.w - MENU_WIDTH - EDGE_PADDING),
      )
    : Math.max(
        EDGE_PADDING,
        Math.min(
          anchorRect.right - MENU_WIDTH,
          viewport.w - MENU_WIDTH - EDGE_PADDING,
        ),
      )

  return { top, left, placement }
}

export function MessageActionsMenu({
  own,
  anchorRef,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onForward,
  onInfo,
}: MessageActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Position | null>(null)

  useLayoutEffect(() => {
    const rect = anchorRef.getBoundingClientRect()
    const viewport = { w: window.innerWidth, h: window.innerHeight }
    setPos(computePosition(rect, viewport, MENU_ESTIMATED_HEIGHT))
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!menuRef.current) return
    const measured = menuRef.current.offsetHeight
    if (measured <= 0) return
    const rect = anchorRef.getBoundingClientRect()
    const viewport = { w: window.innerWidth, h: window.innerHeight }
    setPos((current) => {
      if (!current) return current
      const reflowed = computePosition(rect, viewport, measured)
      if (
        Math.abs(reflowed.top - current.top) < 2 &&
        Math.abs(reflowed.left - current.left) < 2 &&
        reflowed.placement === current.placement
      ) {
        return current
      }
      return reflowed
    })
  }, [anchorRef, pos?.placement])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (
        !menuRef.current.contains(e.target as Node) &&
        !anchorRef.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const onResize = () => {
      const rect = anchorRef.getBoundingClientRect()
      const measured = menuRef.current?.offsetHeight ?? MENU_ESTIMATED_HEIGHT
      setPos(computePosition(rect, { w: window.innerWidth, h: window.innerHeight }, measured))
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, true)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize, true)
    }
  }, [onClose, anchorRef])

  if (!pos) return null

  return (
    <motion.div
      ref={menuRef}
      role="menu"
      initial={{ opacity: 0, y: pos.placement === "top" ? 4 : -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: pos.placement === "top" ? 4 : -4, scale: 0.96 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed z-50 w-[208px] rounded-xl border border-border bg-card-bg/95 py-1 shadow-lg backdrop-blur"
      style={{
        top: pos.top,
        left: pos.left,
        transformOrigin: pos.placement === "top" ? "bottom left" : "top left",
      }}
    >
      <ActionItem
        icon={<CornerUpLeft className="h-4 w-4" />}
        label="Ответить"
        onClick={() => {
          onReply()
          onClose()
        }}
      />
      <ActionItem
        icon={<Copy className="h-4 w-4" />}
        label="Копировать"
        onClick={() => {
          onCopy()
          onClose()
        }}
      />
      <ActionItem
        icon={<Share2 className="h-4 w-4" />}
        label="Переслать"
        onClick={() => {
          onForward()
          onClose()
        }}
      />
      {own && onEdit ? (
        <ActionItem
          icon={<Pencil className="h-4 w-4" />}
          label="Редактировать"
          onClick={() => {
            onEdit()
            onClose()
          }}
        />
      ) : null}
      {own && onDelete ? (
        <ActionItem
          icon={<Trash2 className="h-4 w-4" />}
          label="Удалить"
          danger
          onClick={() => {
            onDelete()
            onClose()
          }}
        />
      ) : null}
      <div className="my-1 border-t border-border/60" />
      <ActionItem
        icon={<Info className="h-4 w-4" />}
        label="Информация"
        onClick={() => {
          onInfo()
          onClose()
        }}
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
