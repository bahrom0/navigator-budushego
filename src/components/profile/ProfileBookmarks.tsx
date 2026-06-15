"use client"

import Link from "next/link"
import { useProfileStore } from "@/stores/profile-store"
import { Bookmark, ArrowRight } from "lucide-react"

export function ProfileBookmarksList() {
  const bookmarks = useProfileStore((s) => s.bookmarks)

  if (bookmarks.length === 0) {
    return (
      <div className="rounded-[16px] border border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bookmark className="h-4 w-4 text-primary" />
          Закладки
        </div>
        <p className="text-sm text-text-muted">Сохраняйте коды НЦТ, чтобы быстро возвращаться к ним.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[16px] border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bookmark className="h-4 w-4 text-primary" />
          Закладки
        </div>
        <Link
          href="/dashboard/bookmarks"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
        >
          Все закладки
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {bookmarks.slice(0, 8).map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-[12px] bg-card-bg px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{item.nctTitle}</span>
              <span className="text-xs text-text-muted">{item.nctCode}</span>
            </div>
            {item.city && <span className="text-xs text-text-muted">{item.city}</span>}
          </div>
        ))}
      </div>
      {bookmarks.length > 8 && (
        <p className="mt-2 text-xs text-text-muted">+ ещё {bookmarks.length - 8} закладок</p>
      )}
    </div>
  )
}
