"use client"

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, PanelLeft, Sparkles, Target, Route } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { useTeacherStore } from "@/stores/teacher-store"
import { useProfileStore } from "@/stores/profile-store"
import { logActivityEvent } from "@/lib/activity-logger"
import { fetchActiveGoalBundle } from "@/lib/active-goal-bundle-client"
import { buildTeacherBundleContext } from "@/lib/ai/teacher-bundle-context"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatComposer } from "@/components/chat/chat-composer"
import { SidebarSkeleton, ChatAreaSkeleton } from "@/components/chat/chat-skeleton"
import { useChatSync } from "@/lib/chat/use-chat-sync"
import { saveMessage } from "@/lib/chat/db"
import type { ActiveGoalBundle } from "@/types/admission"
import type { TeacherMessage, TeacherChatApiResponse, TeacherEntryContext } from "@/types/teacher"
import type { ChatHistoryGroup, ChatSession, ChatSessionRecord } from "@/types/chat"

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function groupSessions(sessions: ChatSessionRecord[]): ChatHistoryGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const groups: Record<"Today" | "Yesterday" | "Earlier", ChatSession[]> = {
    Today: [], Yesterday: [], Earlier: [],
  }

  for (const s of sessions) {
    const ts = new Date(s.updated_at ?? s.created_at).getTime()
    groups[
      ts >= today ? "Today" : ts >= yesterday ? "Yesterday" : "Earlier"
    ].push({
      id: s.id,
      title: s.title,
      timestamp: ts,
      created_at: s.created_at,
      updated_at: s.updated_at,
    })
  }

  return ([
    { label: "Сегодня", sessions: groups.Today },
    { label: "Вчера", sessions: groups.Yesterday },
    { label: "Давно", sessions: groups.Earlier },
  ] as ChatHistoryGroup[]).filter((g) => g.sessions.length > 0)
}

function truncateHistory(messages: TeacherMessage[], maxExchanges = 10): TeacherMessage[] {
  const exchangeCount = messages.filter((m) => m.role === "user").length
  if (exchangeCount <= maxExchanges) return messages
  const keepFrom = messages.length - (maxExchanges * 2)
  return messages.slice(Math.max(0, keepFrom))
}

function TeacherPageContent() {
  const searchParams = useSearchParams()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authLoading = useAuthStore((s) => s.isLoading)
  const hydrateAuth = useAuthStore((s) => s.hydrate)
  const activeGoal = useProfileStore((s) => s.activeGoal)
  const activePlanId = useProfileStore((s) => s.activePlanId)
  const plans = useProfileStore((s) => s.plans)
  const {
    messages, isLoading, error,
    addMessage, setLoading, setError,
    hydrate, reset,
    sessions, activeSessionId,
    setActiveSession, setSessions, setSessionsLoading,
    loadSessionMessages, createSession, renameSession,
  } = useTeacherStore()

  const [input, setInput] = useState("")
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [bundle, setBundle] = useState<ActiveGoalBundle | null>(null)
  const namingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAppliedPromptRef = useRef<string | null>(null)

  useEffect(() => {
    hydrateAuth()
    hydrate()
    setMounted(true)
  }, [hydrateAuth, hydrate])

  useChatSync()

  const activePlan = useMemo(() => {
    if (!activePlanId) return null
    return plans.find((plan) => plan.id === activePlanId) ?? null
  }, [activePlanId, plans])

  const bundleContext = useMemo(() => buildTeacherBundleContext(bundle), [bundle])
  const bundleGoal = bundle?.goal ?? null
  const bundlePlan = bundle?.generalPlan ?? null
  const bundleActiveWeek = useMemo(
    () => bundle?.roadmap?.weeks.find((week) => week.status === "active") ?? bundle?.roadmap?.weeks[0] ?? null,
    [bundle],
  )

  const entryContext = useMemo<TeacherEntryContext | null>(() => {
    const source = searchParams.get("source")
    const question = searchParams.get("prompt")?.trim() || undefined
    const topic = searchParams.get("topic")?.trim() || undefined
    const stageTitle = searchParams.get("stageTitle")?.trim() || undefined
    const taskTitle = searchParams.get("taskTitle")?.trim() || undefined
    const taskType = searchParams.get("taskType")?.trim() || undefined
    const weekTitle = searchParams.get("weekTitle")?.trim() || undefined
    const weekNumberRaw = searchParams.get("weekNumber")?.trim()
    const weekNumber = weekNumberRaw ? Number(weekNumberRaw) : undefined

    const validSource = source === "plan" || source === "coach_today" || source === "coach_task" || source === "coach_roadmap" || source === "teacher_home"
      ? source
      : undefined

    if (!validSource && !question && !topic && !stageTitle && !taskTitle && !taskType && !weekTitle) {
      return null
    }

    return {
      source: validSource ?? "teacher_home",
      question,
      topic,
      stageTitle,
      taskTitle,
      taskType,
      weekTitle,
      weekNumber: typeof weekNumber === "number" && Number.isFinite(weekNumber) ? weekNumber : undefined,
    }
  }, [searchParams])

  useEffect(() => {
    if (!mounted || !isAuthenticated) return
    let cancelled = false

    async function loadBundle() {
      try {
        const nextBundle = await fetchActiveGoalBundle()
        if (!cancelled) {
          setBundle(nextBundle)
        }
      } catch {
        if (!cancelled) {
          setBundle(null)
        }
      }
    }

    void loadBundle()
    return () => {
      cancelled = true
    }
  }, [mounted, isAuthenticated])

  useEffect(() => {
    const prompt = searchParams.get("prompt")?.trim()
    if (!prompt) {
      lastAppliedPromptRef.current = null
      return
    }

    if (lastAppliedPromptRef.current === prompt) return

    setInput(prompt)
    lastAppliedPromptRef.current = prompt
  }, [searchParams])

  useEffect(() => {
    if (!mounted || !isAuthenticated || initialLoadDone) return
    setInitialLoadDone(true)
    setSessionsLoading(true)
    fetch("/api/chat/sessions")
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success" && Array.isArray(json.data)) {
          const records = json.data as ChatSessionRecord[]
          setSessions(records)
          if (records.length > 0) {
            const active = activeSessionId ?? records[0].id
            setActiveSession(active)
            return loadSessionMessages(active)
          }
        }
      })
      .catch(() => {})
      .finally(() => setSessionsLoading(false))
  }, [mounted, isAuthenticated, initialLoadDone])

  const saveMessageToApi = useCallback(async (sessionId: string, msg: TeacherMessage) => {
    if (!msg.content) return
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          type: msg.type ?? "text",
        }),
      })
      const json = await res.json()
      if (json.status === "success") {
        useTeacherStore.getState().updateMessageStatus(msg.id, "sent")
      }
    } catch {}
  }, [])

  const autoNameSession = useCallback(async (sessionId: string, msgs: TeacherMessage[]) => {
    const history = msgs.map((m) => ({ role: m.role, content: m.content }))
    try {
      const res = await fetch("/api/chat/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })
      const json = await res.json()
      if (json.status === "success" && json.data?.title) {
        await renameSession(sessionId, json.data.title)
      }
    } catch {}
  }, [renameSession])

  const sendMessage = useCallback(async (messageText?: string) => {
    const rawInput = messageText ?? input
    if (rawInput === null || rawInput === undefined) return

    let text: string
    if (typeof rawInput === "string") {
      text = rawInput.trim()
    } else if (typeof rawInput === "object") {
      console.error("Input is an object, not a string.", rawInput)
      text = ""
    } else {
      text = String(rawInput).trim()
    }

    if (!text || isLoading) return
    if (!messageText) setInput("")
    setStreamingId(null)

    let sessionId = activeSessionId
    if (!sessionId) {
      const newId = await createSession()
      if (!newId) {
        setError("Не удалось создать сессию")
        return
      }
      sessionId = newId
    }

    const userMsg: TeacherMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
      status: "sending",
    }
    addMessage(userMsg)
    saveMessage({
      id: userMsg.id,
      session_id: sessionId,
      role: userMsg.role,
      content: userMsg.content,
      type: userMsg.type ?? "text",
      created_at: new Date(userMsg.timestamp).toISOString(),
    })
    saveMessageToApi(sessionId, userMsg)
    setLoading(true)
    setError(null)

    const history = truncateHistory(messages).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const profile = useProfileStore.getState()
    const activePlan = profile.activePlanId
      ? profile.plans.find((p) => p.id === profile.activePlanId) ?? null
      : null

    try {
      const res = await fetch("/api/teacher/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          profile: {
            sessionId: profile.sessionId,
            level: profile.level,
            activeGoalId: profile.activeGoalId,
            activeGoal: profile.activeGoal,
            lastNctCodes: profile.lastNctCodes,
            activityLog: profile.activityLog,
            achievements: profile.achievements,
            bookmarks: profile.bookmarks,
            plans: profile.plans,
            interviews: profile.interviews,
            activePlanId: profile.activePlanId,
            goalHistory: profile.goalHistory,
            recommendations: profile.recommendations,
            savedCodes: profile.savedCodes,
            deletedBookmarkCodes: profile.deletedBookmarkCodes,
          },
          activePlan: (bundlePlan ?? activePlan) ?? undefined,
          bundleContext: bundleContext ?? undefined,
          context: entryContext ?? undefined,
        }),
      })

      const result: TeacherChatApiResponse = await res.json()
      if (!res.ok || result.status === "error") {
        console.error("[/api/teacher/chat] response:", result, "http:", res.status)
      }

      if (result.status === "error") {
        setError(result.error ?? "Ошибка при получении ответа")
        return
      }

      const reply = result.data?.reply?.trim()
      if (!reply) {
        setError(result.error ?? "AI Chat временно не отвечает. Попробуйте ещё раз.")
        return
      }

      const msgId = generateId()
      const assistantMsg: TeacherMessage = {
        id: msgId,
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
        type: result.data?.type ?? "text",
        status: "sending",
      }
      addMessage(assistantMsg)
      saveMessage({
        id: assistantMsg.id,
        session_id: sessionId,
        role: assistantMsg.role,
        content: assistantMsg.content,
        type: assistantMsg.type ?? "text",
        created_at: new Date(assistantMsg.timestamp).toISOString(),
      })
      saveMessageToApi(sessionId, assistantMsg)
      setStreamingId(msgId)
      logActivityEvent("use_teacher", "Использование AI Chat")

      if (namingTimerRef.current) clearTimeout(namingTimerRef.current)
      const storeState = useTeacherStore.getState()
      const currentSessions = storeState.sessions
      const currentTitle = currentSessions.find((s) => s.id === sessionId)?.title
      if (!currentTitle || currentTitle === "Новый чат") {
        namingTimerRef.current = setTimeout(() => {
          autoNameSession(sessionId, storeState.messages)
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети")
    } finally {
      setLoading(false)
    }
  }, [input, isLoading, messages, activeSessionId, addMessage, setLoading, setError, createSession, saveMessageToApi, autoNameSession, renameSession, activePlan, bundleContext, bundlePlan, entryContext])

  const startNewChat = useCallback(async () => {
    reset()
    setStreamingId(null)
    setInput("")
    setMobileSidebarOpen(false)
    const newId = await createSession()
    if (newId) setActiveSession(newId)
  }, [reset, createSession, setActiveSession])

  const handleSessionSelect = useCallback((id: string) => {
    if (id === activeSessionId) return
    setActiveSession(id)
    setSessionLoading(true)
    reset()
    loadSessionMessages(id).finally(() => setSessionLoading(false))
    setMobileSidebarOpen(false)
  }, [activeSessionId, setActiveSession, reset, loadSessionMessages])

  const regenerateMessage = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex((message) => message.id === messageId)
    const previousUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find((message) => message.role === "user")
    if (previousUserMessage) {
      void sendMessage(previousUserMessage.content)
    }
  }, [messages, sendMessage])

  const groups = groupSessions(sessions)
  const groupsWithCurrent = activeSessionId && !groups.some((g) =>
    g.sessions.some((s) => s.id === activeSessionId)
  )
    ? [{ label: "Today" as const, sessions: [{ id: activeSessionId, title: "Новый чат", timestamp: Date.now() }] }, ...groups]
    : groups

  const sessionsLoadingState = useTeacherStore((s) => s.sessionsLoading)
  const quickPrompts = useMemo(() => {
    const prompts: string[] = []

    if (entryContext?.taskTitle) {
      prompts.push(`Помоги разобраться, как выполнить задачу "${entryContext.taskTitle}".`)
    }

    if (entryContext?.stageTitle) {
      prompts.push(`Объясни, зачем нужен этап "${entryContext.stageTitle}" и как к нему подступиться.`)
    }

    if (bundleGoal ?? activeGoal) {
      const goal = bundleGoal ?? activeGoal
      prompts.push(`Какие темы особенно важны для цели ${goal?.nctCode} и почему?`)
    }

    if (bundlePlan?.stages[0] ?? activePlan?.stages[0]) {
      const firstStage = bundlePlan?.stages[0] ?? activePlan?.stages[0]
      prompts.push(`Разбери первый этап плана "${firstStage?.title}" простыми шагами.`)
    }

    if (bundleActiveWeek) {
      prompts.push(`Объясни, зачем нужна неделя ${bundleActiveWeek.number} "${bundleActiveWeek.title}" и как к ней подступиться.`)
    }

    prompts.push("Объясни непонятную тему простыми словами и без лишней воды.")

    return Array.from(new Set(prompts)).slice(0, 4)
  }, [entryContext, activeGoal, activePlan, bundleActiveWeek, bundleGoal, bundlePlan])

  const entryHeadline = useMemo(() => {
    if (entryContext?.taskTitle) return `Помощь по задаче: ${entryContext.taskTitle}`
    if (entryContext?.weekTitle) return `${entryContext.weekTitle}`
    if (entryContext?.stageTitle) return `Помощь по этапу плана: ${entryContext.stageTitle}`
    if (bundleGoal ?? activeGoal) return `AI Chat рядом с целью ${(bundleGoal ?? activeGoal)?.nctCode}`
    return "AI Chat как вторичный помощник"
  }, [entryContext, activeGoal, bundleGoal])

  const entryDescription = useMemo(() => {
    if (entryContext?.source === "coach_task") {
      return "AI Chat поможет разобрать тему или задачу, но приоритеты и следующий шаг по-прежнему остаются в Coach."
    }

    // if (entryContext?.source === "coach_roadmap") {
    //   return "Используйте AI Chat, чтобы понять смысл текущей недели roadmap, темы и учебные риски, не превращая его в замену Coach."
    // }

    // if (entryContext?.source === "plan") {
    //   return "Используйте AI Chat, чтобы понять этапы общего плана, термины и учебные темы, не превращая его в замену Coach."
    // }

    // return "AI Chat объясняет темы, термины и шаги плана. Он не выбирает цель, не строит roadmap и не ведёт ежедневное выполнение вместо Coach."
  }, [entryContext])

  if (!mounted || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <p className="text-sm text-text-secondary">Доступно только после входа.</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        {sessionsLoadingState ? (
          <SidebarSkeleton collapsed={sidebarCollapsed} />
        ) : (
          <ChatSidebar
            groups={groupsWithCurrent}
            activeSessionId={activeSessionId}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            onSessionSelect={handleSessionSelect}
            onNewChat={startNewChat}
          />
        )}
      </div>

      {/* Desktop expand button */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-3 top-3 z-30 hidden h-11 w-11 items-center justify-center rounded-xl border border-border bg-card-bg text-text-muted shadow-sm transition-colors hover:text-foreground md:flex"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Закрыть историю чатов"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.6, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -200) {
                  setMobileSidebarOpen(false)
                }
              }}
              className="absolute inset-y-0 left-0 z-50 w-[min(84vw,300px)] border-r border-border bg-card-bg shadow-xl"
            >
              {sessionsLoadingState ? (
                <SidebarSkeleton collapsed={false} />
              ) : (
                <ChatSidebar
                  groups={groupsWithCurrent}
                  activeSessionId={activeSessionId}
                  collapsed={false}
                  onToggle={() => setMobileSidebarOpen(false)}
                  onSessionSelect={handleSessionSelect}
                  onNewChat={startNewChat}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile toggle button */}
      {!mobileSidebarOpen && (
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="fixed left-3 top-[4.25rem] z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card-bg/95 shadow-sm backdrop-blur transition-colors hover:text-foreground md:hidden"
          aria-label="Показать историю чатов"
        >
          <PanelLeft className="h-4 w-4 text-text-secondary" />
        </button>
      )}

      <div
        className={`flex min-w-0 flex-1 flex-col ${
          messages.length === 0 && !isLoading && !sessionLoading ? "justify-center" : ""
        }`}
      >
        {sessionLoading || sessionsLoadingState ? (
          <ChatAreaSkeleton />
        ) : (
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            error={error}
            streamingId={streamingId}
            onRegenerate={regenerateMessage}
            loadingText="Думаю"
            emptyState={(
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto flex max-w-3xl flex-col items-center text-center"
              >
                {/* <span className="navigator-kicker navigator-kicker--muted mb-4">Secondary feature · ai study help</span> */}
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
                  <Sparkles className="h-7 w-7 text-primary/40" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{entryHeadline}</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                  {entryDescription}
                </p>

                <div className="mt-5 grid w-full gap-3 text-left sm:grid-cols-2">
                  <div className="navigator-surface p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Target className="h-4 w-4 text-primary" />
                      Контекст цели
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {bundleGoal ?? activeGoal
                        ? `${(bundleGoal ?? activeGoal)?.nctTitle} · ${(bundleGoal ?? activeGoal)?.nctCode}`
                        : "Пока без активной цели. Здесь лучше задавать точечные учебные вопросы."}
                    </p>
                  </div>
                  <div className="navigator-surface p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Route className="h-4 w-4 text-primary" />
                      Граница с Coach
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      Coach ведёт по roadmap и today. AI Chat нужен, чтобы понять материал, шаг или термин по запросу.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex w-full flex-wrap justify-center gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="inline-flex min-h-11 items-center rounded-[12px] border border-border bg-card-bg px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          />
        )}

        <div className="z-20 shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-4">
          <ChatComposer
            input={input}
            onInputChange={setInput}
            onSend={sendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

function TeacherPageSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<TeacherPageSkeleton />}>
      <TeacherPageContent />
    </Suspense>
  )
}
