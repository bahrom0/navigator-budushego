"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Search, ExternalLink, Trash2, Bookmark } from "lucide-react"
import Link from "next/link"
import { useProfileStore } from "@/stores/profile-store"

export default function DashboardBookmarks() {
  const bookmarks = useProfileStore((s) => s.bookmarks)
  const removeBookmark = useProfileStore((s) => s.removeBookmark)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return bookmarks
    return bookmarks.filter(
      (b) =>
        b.nctTitle.toLowerCase().includes(q) ||
        b.nctCode.toLowerCase().includes(q) ||
        (b.institution || "").toLowerCase().includes(q) ||
        (b.city || "").toLowerCase().includes(q)
    )
  }, [bookmarks, search])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Закладки</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {bookmarks.length === 0
            ? "У вас пока нет сохранённых кодов"
            : `${bookmarks.length} закладок`}
        </p>
      </motion.div>

      {bookmarks.length > 0 && (
        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, коду, вузу или городу..."
              className="h-10 w-full rounded-[12px] border border-border bg-card-bg pl-9 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {bookmarks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-[18px] border border-border bg-background p-12 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <Bookmark className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">Список закладок пуст</p>
          <p className="mt-1 text-sm text-text-secondary">
            Сохраняйте коды НЦТ из рекомендаций, чтобы они появились здесь.
          </p>
        </motion.div>
      )}

      {filtered.length === 0 && bookmarks.length > 0 && (
        <div className="mt-8 rounded-[18px] border border-border bg-background p-8 text-center">
          <p className="text-sm text-text-muted">Ничего не найдено. Попробуйте изменить запрос.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {filtered.map((bookmark, i) => (
          <motion.div
            key={bookmark.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="group rounded-[18px] border border-border bg-card-bg px-5 py-4 transition-colors hover:bg-background"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold tracking-wide text-primary">
                    {bookmark.nctCode}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground truncate">
                  {bookmark.nctTitle}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                  {bookmark.institution && <span>{bookmark.institution}</span>}
                  {bookmark.city && <span>{bookmark.city}</span>}
                  <span>
                    {new Date(bookmark.savedAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex shrink-0 gap-1">
                <Link
                  href={`/recommendations?code=${encodeURIComponent(bookmark.nctCode)}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label="Открыть"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => removeBookmark(bookmark.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-error/10 hover:text-error"
                  aria-label="Удалить закладку"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
