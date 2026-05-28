import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const db = await ensureDb();
  const result = await db.execute({
    sql: "SELECT id, input_text, input_images, generated_result, tokens_input, tokens_output, created_at FROM records WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });

  const record = result.rows[0] as Record<string, unknown> | undefined;
  if (!record) {
    return NextResponse.json({ error: "病历不存在" }, { status: 404 });
  }

  return NextResponse.json({
    id: record.id,
    input_text: record.input_text,
    input_images: record.input_images ? JSON.parse(record.input_images as string) : [],
    generated_result: record.generated_result,
    tokens_input: record.tokens_input,
    tokens_output: record.tokens_output,
    created_at: record.created_at,
  });
}
