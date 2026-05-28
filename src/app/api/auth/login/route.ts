import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "请输入账号和密码" }, { status: 400 });
    }

    const db = await ensureDb();
    const result = await db.execute({
      sql: "SELECT id, username, password_hash, credits, role, is_active FROM users WHERE username = ?",
      args: [username],
    });

    const user = result.rows[0] as Record<string, unknown> | undefined;

    if (!user) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "账号已被停用，请联系管理员" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const token = await createToken(user.id as number, user.role as string);

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        credits: user.credits,
        role: user.role,
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
    console.error("Login error:", err);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
