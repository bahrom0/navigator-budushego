import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { resolve } from "path"
import { Client } from "pg"

const MIGRATIONS = [
  resolve(process.cwd(), "supabase/migrations/001_create_tables.sql"),
  resolve(process.cwd(), "supabase/migrations/002_rls_policies.sql"),
  resolve(process.cwd(), "supabase/migrations/003_chat_sync.sql"),
]

export async function GET() {
  return NextResponse.json({
    status: "ready",
    instructions:
      'Add SUPABASE_DB_PASSWORD to .env.local (from Project Settings > Database > Connection string password), then POST to this endpoint with {"password":"your-password"}',
  })
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: "password is required" }, { status: 400 })
    }

    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.match(
      /https:\/\/(.+)\.supabase\.co/
    )![1]

    const client = new Client({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: "postgres",
      user: "postgres",
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })

    await client.connect()

    const results: { file: string; success: boolean; error?: string }[] = []

    for (const file of MIGRATIONS) {
      try {
        const sql = readFileSync(file, "utf8")
        await client.query(sql)
        results.push({ file: file.split("/").pop()!, success: true })
      } catch (err) {
        results.push({
          file: file.split("/").pop()!,
          success: false,
          error: err instanceof Error ? err.message : "unknown error",
        })
      }
    }

    await client.end()

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setup failed" },
      { status: 500 }
    )
  }
}
