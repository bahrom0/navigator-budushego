"use client"

import { useState, useMemo, useCallback } from "react"
import { useCoachStore } from "@/stores/coach-store"
import { useProfileStore } from "@/stores/profile-store"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatComposer } from "@/components/chat/chat-composer"
import { CoachChatHistory } from "./CoachChatHistory"
import { CoachMiniTest } from "./CoachMiniTest"
import type { CoachMessage } from "@/types/coach"
import type { TeacherMessage } from "@/types/teacher"

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface MiniTestData {
  questions: Array<{ question: string; options?: string[]; explanation?: string; correctIndex?: number }>
  subject?: string
}

export function CoachChat() {
  const {
    messages,
    addMessage,
    goal,
    plan,
    roadmap,
    dayPlan,
    dailyHistory,
    diagnostics,
    miniTests,
    addMiniTest,
    setMiniTestResult,
    progress,
    isLoading,
    setLoading,
    error,
    setError,
  } = useCoachStore()
  const profileGoal = useProfileStore((s) => s.activeGoal)
  const resolvedGoal = goal ?? profileGoal

  const [input, setInput] = useState("")
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [activeMiniTest, setActiveMiniTest] = useState<MiniTestData & { id?: string } | null>(null)
  const [miniTestMsgId, setMiniTestMsgId] = useState<string | null>(null)

  const chatMessages = useMemo<TeacherMessage[]>(
    () =>
      messages.map((m: CoachMessage) => ({
        id: m.id,
        role: m.role === "coach" ? "assistant" : "user",
        content: m.content,
        timestamp: m.timestamp,
      })),
    [messages],
  )

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput("")
    setStreamingId(null)

    const userMsg: CoachMessage = {
      id: generateId(),
      role: "user",
      content: text,
      type: "text",
      timestamp: Date.now(),
    }
    addMessage(userMsg)

    setLoading(true)
    setError(null)

    const allHistory = messages.slice(0, -1).map((m) => ({
      role: (m.role === "coach" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    }))
    const history = allHistory.length > 20 ? allHistory.slice(-20) : allHistory

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          goal: resolvedGoal,
          plan,
          roadmap,
          dayPlan,
          dailyHistory,
          diagnostics,
          miniTests,
          progress,
        }),
      })

      const result = await res.json()

      if (result.status === "error") {
        setError(result.error ?? "Ошибка при получении ответа")
        return
      }

      const reply = result.data?.reply?.trim()
      if (!reply) {
        setError(result.error ?? "Coach временно не отвечает. Попробуйте ещё раз.")
        return
      }

      const msgId = generateId()
      const msgType = result.data?.type ?? "text"
      const coachMsg: CoachMessage = {
        id: msgId,
        role: "coach",
        content: reply,
        type: msgType,
        timestamp: Date.now(),
      }
      addMessage(coachMsg)
      setStreamingId(msgId)

      if (msgType === "mini_test" && result.data?.questions?.length) {
        const questions = result.data.questions.map((q: any) => {
          let ci = q.correctIndex
          if (ci == null && q.correct_answer != null) {
            const idx = (q.options as string[])?.indexOf(q.correct_answer)
            ci = idx >= 0 ? idx : 0
          }
          return {
            question: q.question,
            options: q.options,
            explanation: q.explanation,
            correctIndex: ci ?? 0,
          }
        })
        const testId = generateId()
        setActiveMiniTest({ id: testId, questions, subject: result.data.subject })
        setMiniTestMsgId(msgId)
        addMiniTest({
          id: testId,
          subject: result.data.subject ?? "",
          questions: questions.map((q: any) => ({
            id: generateId(),
            question: q.question,
            options: q.options ?? [],
            correctIndex: q.correctIndex ?? 0,
            explanation: q.explanation ?? "",
          })),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети")
    } finally {
      setLoading(false)
    }
  }, [input, isLoading, messages, addMessage, setLoading, setError, resolvedGoal, plan, roadmap, dayPlan, dailyHistory, diagnostics, miniTests, progress])

  const handleMiniTestComplete = useCallback(
    (results: { correct: number; total: number }) => {
      if (activeMiniTest?.id) {
        setMiniTestResult(activeMiniTest.id, {
          totalQuestions: results.total,
          correctAnswers: results.correct,
          subject: activeMiniTest.subject ?? "",
          takenAt: Date.now(),
        })
      }
    },
    [activeMiniTest?.id, activeMiniTest?.subject, setMiniTestResult],
  )

  const regenerateMessage = useCallback(
    (messageId: string) => {
      const messageIndex = chatMessages.findIndex((m) => m.id === messageId)
      const previousUserMessage = chatMessages
        .slice(0, messageIndex)
        .reverse()
        .find((m) => m.role === "user")
      if (previousUserMessage) {
        setInput(previousUserMessage.content)
        handleSend()
      }
    },
    [chatMessages, handleSend],
  )

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatMessages
          messages={chatMessages}
          isLoading={isLoading}
          error={error}
          streamingId={streamingId}
          onRegenerate={regenerateMessage}
          renderAfterMessage={(msgId) =>
            activeMiniTest && msgId === miniTestMsgId
              ? (
                <div className="mx-auto w-full max-w-[760px] sm:px-6">
                  <CoachMiniTest
                    questions={activeMiniTest.questions}
                    subject={activeMiniTest.subject}
                    onComplete={handleMiniTestComplete}
                  />
                </div>
              )
              : null
          }
        />
        <div className="z-20 shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-4">
          <ChatComposer
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
          />
        </div>
      </div>
      <CoachChatHistory />
    </div>
  )
}
