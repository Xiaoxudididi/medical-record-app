import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

// GET - List all users
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const db = await ensureDb();
  const result = await db.execute(
    "SELECT id, username, credits, role, is_active, created_at FROM users ORDER BY created_at DESC"
  );

  return NextResponse.json({ users: result.rows });
}

// POST - Create new user
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { username, password, credits = 3, role = "user" } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    const db = await ensureDb();

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
    }

    const hash = await hashPassword(password);
    await db.execute({
      sql: "INSERT INTO users (username, password_hash, credits, role) VALUES (?, ?, ?, ?)",
      args: [username, hash, credits, role],
    });

    return NextResponse.json({ success: true, message: "用户创建成功" });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// PUT - Toggle user active status
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { userId, isActive } = await req.json();

    const db = await ensureDb();
    await db.execute({
      sql: "UPDATE users SET is_active = ? WHERE id = ?",
      args: [isActive ? 1 : 0, userId],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
