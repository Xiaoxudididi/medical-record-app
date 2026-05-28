import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";
import { getDeepSeekClient, SYSTEM_PROMPT } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (user.credits <= 0) {
    return NextResponse.json({ error: "额度不足，请联系管理员充值" }, { status: 402 });
  }

  try {
    const { text, images } = await req.json();

    if (!text && (!images || images.length === 0)) {
      return NextResponse.json({ error: "请输入患者信息或上传图片" }, { status: 400 });
    }

    // Build user message with text and optional images
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    if (text) {
      userContent.push({
        type: "text",
        text: `请根据以下患者信息，撰写一份完整的住院大病历（入院记录+首次病程记录）：\n\n${text}`,
      });
    }

    if (images && images.length > 0) {
      userContent.push({
        type: "text",
        text: "\n\n以下是患者的相关检查报告/病历资料图片，请从中提取有用信息：",
      });
      for (const img of images) {
        userContent.push({
          type: "image_url",
          image_url: { url: img },
        });
      }
    }

    if (!text) {
      userContent.unshift({
        type: "text",
        text: "请根据以下图片中的患者信息，撰写一份完整的住院大病历（入院记录+首次病程记录）。",
      });
    }

    const client = getDeepSeekClient();

    // Use streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await client.chat.completions.create({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent as any },
            ],
            stream: true,
            max_tokens: 8192,
          });

          let fullResponse = "";
          let inputTokens = 0;
          let outputTokens = 0;

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
              fullResponse += delta;
              controller.enqueue(new TextEncoder().encode(delta));
            }
            // Track token usage from the last chunk
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || 0;
              outputTokens = chunk.usage.completion_tokens || 0;
            }
          }

          // Deduct credit on success
          const db = await ensureDb();
          await db.execute({
            sql: "UPDATE users SET credits = credits - 1 WHERE id = ?",
            args: [user.id],
          });
          await db.execute({
            sql: "INSERT INTO records (user_id, input_text, input_images, generated_result, tokens_input, tokens_output) VALUES (?, ?, ?, ?, ?, ?)",
            args: [user.id, text || "", JSON.stringify(images || []), fullResponse, inputTokens, outputTokens],
          });

          controller.close();
        } catch (err: any) {
          console.error("DeepSeek API error:", err);
          const errorMsg = err?.message || "AI生成失败";
          controller.enqueue(new TextEncoder().encode(`\n\n[生成失败: ${errorMsg}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "生成失败，请稍后重试" }, { status: 500 });
  }
}
