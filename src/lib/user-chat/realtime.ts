"use client"

import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { MessageRecord } from "./types"

type MessageChangeHandler = (msg: MessageRecord) => void
type PresenceHandler = (userId: string, online: boolean) => void
type TypingHandler = (
  conversationId: string,
  userId: string,
  username: string,
  isTyping: boolean,
) => void

export class UserChatRealtime {
  private channel: RealtimeChannel | null = null
  private subscribed = false
  private userId: string | null = null
  private conversationId: string | null = null
  private onMessage: MessageChangeHandler | null = null
  private onPresence: PresenceHandler | null = null
  private onTyping: TypingHandler | null = null

  connect(
    userId: string,
    conversationId: string,
    handlers: {
      onMessage: MessageChangeHandler
      onPresence?: PresenceHandler
      onTyping?: TypingHandler
      onSubscribed?: () => void
    },
  ) {
    this.disconnect()
    this.userId = userId
    this.conversationId = conversationId
    this.onMessage = handlers.onMessage
    this.onPresence = handlers.onPresence ?? null
    this.onTyping = handlers.onTyping ?? null

    const supabase = createClient()

    this.channel = supabase.channel(`user-chat:${conversationId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    this.channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessageRecord>) => {
          const record = payload.new as MessageRecord
          if (record.sender_id !== userId) {
            this.onMessage?.(record)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessageRecord>) => {
          const record = payload.new as MessageRecord
          if (record.sender_id !== userId) {
            this.onMessage?.(record)
          }
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = this.channel?.presenceState() ?? {}
        for (const [key, presence] of Object.entries(state)) {
          const isOnline = Array.isArray(presence) && presence.length > 0
          this.onPresence?.(key, isOnline)
        }
      })
      .on("presence", { event: "join" }, ({ key }) => {
        this.onPresence?.(key, true)
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        this.onPresence?.(key, false)
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { user_id, username, is_typing } = payload as {
          user_id: string
          username: string
          is_typing?: boolean
        }
        if (user_id !== userId) {
          this.onTyping?.(conversationId, user_id, username, is_typing !== false)
        }
      })
      .subscribe(async (status) => {
        this.subscribed = status === "SUBSCRIBED"
        if (status === "SUBSCRIBED") {
          await this.channel?.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
          handlers.onSubscribed?.()
        }
      })
  }

  disconnect() {
    if (this.channel) {
      void this.channel.unsubscribe()
      this.channel = null
    }
    this.subscribed = false
    this.conversationId = null
  }

  sendTyping(username: string, isTyping: boolean) {
    if (!this.channel || !this.userId || !this.subscribed) return
    void this.channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: this.userId,
        username,
        is_typing: isTyping,
      },
    })
  }

  isConnected(): boolean {
    return this.subscribed
  }
}

export const userChatRealtime = new UserChatRealtime()
