import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { hashPassword, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "请输入账号和密码" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: "账号长度需在 3-20 位之间" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码长度不能少于 6 位" }, { status: 400 });
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
    const result = await db.execute({
      sql: "INSERT INTO users (username, password_hash, credits) VALUES (?, ?, ?)",
      args: [username, hash, 3],
    });

    const userId = Number(result.lastInsertRowid);
    const token = await createToken(userId, "user");

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username,
        credits: 3,
        role: "user",
      },
    });

    response.cookies.set("mr_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
