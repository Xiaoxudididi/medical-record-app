import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT id, input_text, generated_result, tokens_input, tokens_output, created_at FROM records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    args: [user.id, limit, offset],
  });

  const countResult = await db.execute({
    sql: "SELECT COUNT(*) as count FROM records WHERE user_id = ?",
    args: [user.id],
  });
  const total = (countResult.rows[0] as any).count as number;

  const list = result.rows.map((r: any) => ({
    id: r.id,
    preview: r.generated_result
      ?.match(/主诉.*?\n/)?.[0]
      ?.trim()
      ?.substring(0, 60) || "无预览",
    tokens_input: r.tokens_input,
    tokens_output: r.tokens_output,
    created_at: r.created_at,
  }));

  return NextResponse.json({
    records: list,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
