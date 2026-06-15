const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

const PROJECT_REF = "pxfzqynjrbrvhsrnajiu"
const DB_PASSWORD = process.argv[2]

if (!DB_PASSWORD) {
  console.error("Usage: node scripts/setup-db.cjs <database-password>")
  console.error("")
  console.error("Get the database password from Supabase Dashboard:")
  console.error("  Project Settings > Database > Connection string")
  console.error("  (the password in postgresql://postgres:[PASSWORD]@db...)")
  console.error("")
  console.error("Alternative: Run SQL files manually in Supabase SQL Editor:")
  console.error("  1. supabase/migrations/001_create_tables.sql")
  console.error("  2. supabase/migrations/002_rls_policies.sql")
  process.exit(1)
}

async function run() {
  const client = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })

  try {
    console.log("Connecting to Supabase PostgreSQL...")
    await client.connect()
    console.log("Connected successfully\n")

    const migrationsDir = path.resolve(__dirname, "..", "supabase", "migrations")
    const files = fs.readdirSync(migrationsDir).sort()

    for (const file of files) {
      if (!file.endsWith(".sql")) continue
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8")
      console.log(`Applying: ${file}`)
      await client.query(sql)
      console.log(`  Done: ${file}`)
    }

    console.log("\n=== Migration Complete ===")
    console.log("Created tables: profiles, plans, analyses, interviews, bookmarks, achievements, activity_events")
    console.log("RLS policies configured for all tables")
  } catch (err) {
    console.error("\nMigration failed:", err.message)
    console.error("\nIf connection fails, run SQL files manually in Supabase SQL Editor.")
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
