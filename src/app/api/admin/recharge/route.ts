import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { userId, credits, packageName, note } = await req.json();

    if (!userId || !credits || credits <= 0) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const db = await ensureDb();

    await db.execute({
      sql: "UPDATE users SET credits = credits + ? WHERE id = ?",
      args: [credits, userId],
    });

    await db.execute({
      sql: "INSERT INTO recharge_logs (user_id, credits_added, package_name, admin_id, note) VALUES (?, ?, ?, ?, ?)",
      args: [userId, credits, packageName || "手动充值", admin.id, note || ""],
    });

    const result = await db.execute({
      sql: "SELECT id, username, credits FROM users WHERE id = ?",
      args: [userId],
    });
    const updatedUser = result.rows[0] as unknown as { id: number; username: string; credits: number };

    return NextResponse.json({
      success: true,
      message: `已为 ${updatedUser.username} 充值 ${credits} 次额度`,
      updatedCredits: updatedUser.credits,
    });
  } catch (err) {
    console.error("Recharge error:", err);
    return NextResponse.json({ error: "充值失败" }, { status: 500 });
  }
}
