"use client"

import { create } from "zustand"

export interface ReplyTarget {
  messageId: string
  senderName: string
  preview: string
}

interface ReplyState {
  reply: ReplyTarget | null
  setReply: (target: ReplyTarget) => void
  clearReply: () => void
}

export const useReplyStore = create<ReplyState>((set) => ({
  reply: null,
  setReply: (target) => set({ reply: target }),
  clearReply: () => set({ reply: null }),
}))
