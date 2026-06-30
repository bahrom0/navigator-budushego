"use client";

import { Bot, MessageSquare } from "lucide-react";
import { useCoachStore } from "@/stores/coach-store";
import type { CoachMessage } from "@/types/coach";

export function CoachChatHistory() {
  const messages = useCoachStore((s) => s.messages);
  const goal = useCoachStore((s) => s.goal);

  const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="hidden h-full w-[260px] flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card-bg lg:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <MessageSquare className="h-4 w-4 text-text-muted" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            История чата
          </span>
          {goal && (
            <span className="max-w-[180px] truncate text-xs text-text-muted">
              {goal.nctTitle}
            </span>
          )}
        </div>
      </div>

      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        {sorted.length === 0 ? (
          <p className="px-2 text-sm text-text-muted">Сообщений пока нет</p>
        ) : (
          <div className="space-y-1">
            {sorted.map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-border/30"
              >
                <div className="flex items-center gap-1.5">
                  {msg.role === "coach" && (
                    <Bot className="h-3 w-3 text-primary" />
                  )}
                  <span className="text-xs font-medium text-text-muted">
                    {msg.role === "user" ? "Вы" : "Coach"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-foreground">
                  {msg.content.length > 60
                    ? msg.content.slice(0, 60) + "..."
                    : msg.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
