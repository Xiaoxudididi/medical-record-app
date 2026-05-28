import { createClient, type Client } from "@libsql/client";
import bcrypt from "bcryptjs";

let client: Client | null = null;
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || "file:./data/app.db";

    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Start async initialization
    initPromise = initDb();
  }

  return client;
}

export async function ensureDb(): Promise<Client> {
  const db = getDb();
  if (initPromise) {
    await initPromise;
    initPromise = null;
  }
  return db;
}

async function initDb() {
  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      real_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      hospital TEXT DEFAULT '',
      department TEXT DEFAULT '',
      grade TEXT DEFAULT '',
      credits INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      input_text TEXT,
      input_images TEXT,
      generated_result TEXT,
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS recharge_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credits_added INTEGER NOT NULL,
      package_name TEXT,
      admin_id INTEGER NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );
  `);

  // Seed admin user
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: ["admin"],
  });
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await db.execute({
      sql: "INSERT INTO users (username, password_hash, real_name, credits, role) VALUES (?, ?, ?, ?, ?)",
      args: ["admin", hash, "管理员", 9999, "admin"],
    });
  }
}
