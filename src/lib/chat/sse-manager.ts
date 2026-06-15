const HEARTBEAT_INTERVAL = 30_000

interface Connection {
  id: string
  userId: string
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
}

class SSEManager {
  private connections = new Map<string, Connection>()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  register(
    userId: string,
    controller: ReadableStreamDefaultController,
  ): string {
    const connectionId = crypto.randomUUID()
    const encoder = new TextEncoder()

    this.connections.set(connectionId, {
      id: connectionId,
      userId,
      controller,
      encoder,
    })

    this.ensureHeartbeat()

    return connectionId
  }

  unregister(connectionId: string): void {
    this.connections.delete(connectionId)
    if (this.connections.size === 0) {
      this.stopHeartbeat()
    }
  }

  broadcast(userId: string, event: string, data: object, cursor?: string): void {
    const payload = this.formatEvent(event, data, cursor)
    for (const conn of this.connections.values()) {
      if (conn.userId !== userId) continue
      try {
        conn.controller.enqueue(conn.encoder.encode(payload))
      } catch {
        this.unregister(conn.id)
      }
    }
  }

  private formatEvent(event: string, data: object, cursor?: string): string {
    const lines: string[] = []
    if (cursor) lines.push(`id: ${cursor}`)
    lines.push(`event: ${event}`)
    lines.push(`data: ${JSON.stringify(data)}`)
    return lines.join("\n") + "\n\n"
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatTimer) return
    this.heartbeatTimer = setInterval(() => {
      const comment = `: heartbeat ${Date.now()}\n\n`
      const encoder = new TextEncoder()
      for (const conn of this.connections.values()) {
        try {
          conn.controller.enqueue(encoder.encode(comment))
        } catch {
          this.unregister(conn.id)
        }
      }
      if (this.connections.size === 0) {
        this.stopHeartbeat()
      }
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}

export const sseManager = new SSEManager()
