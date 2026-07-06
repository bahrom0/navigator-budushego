"use client"

import { PanelLeftClose, MessageSquare, Plus } from "lucide-react"
import type { ChatHistoryGroup } from "@/types/chat"

interface ChatSidebarProps {
  groups: ChatHistoryGroup[]
  activeSessionId: string | null
  collapsed: boolean
  onToggle: () => void
  onSessionSelect: (id: string) => void
  onNewChat: () => void
}

export function ChatSidebar({
  groups,
  activeSessionId,
  collapsed,
  onToggle,
  onSessionSelect,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div
      className={`h-full flex-shrink-0 overflow-hidden border-r border-border bg-card-bg/86 backdrop-blur transition-[width] duration-200 ${
        collapsed ? "w-0" : "w-[260px]"
      }`}
    >
      <div className="flex h-full w-[260px] flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            История AI Chat
          </span>
          <button
            onClick={onToggle}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label="Свернуть историю AI Chat"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 px-3 pt-3">
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Plus className="h-4 w-4" />
            Новый разбор
          </button>
        </div>

        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-widest text-text-muted">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.sessions.map((session) => {
                  const isActive = session.id === activeSessionId
                  return (
                    <button
                      key={session.id}
                      onClick={() => onSessionSelect(session.id)}
                      className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-border/50 font-medium text-foreground"
                          : "text-text-secondary hover:bg-foreground/5 hover:text-foreground"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
                      <span className="truncate">{session.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
