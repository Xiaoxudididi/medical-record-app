import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    real_name: user.real_name,
    phone: user.phone,
    hospital: user.hospital,
    department: user.department,
    grade: user.grade,
    credits: user.credits,
    role: user.role,
  });
}

// PUT - Update profile
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { real_name, phone, hospital, department, grade } = await req.json();

    if (!real_name || !real_name.trim()) {
      return NextResponse.json({ error: "请输入真实姓名" }, { status: 400 });
    }
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "请输入正确的手机号" }, { status: 400 });
    }

    const db = await ensureDb();

    // Check phone uniqueness
    const checkResult = await db.execute({
      sql: "SELECT id FROM users WHERE phone = ? AND id != ?",
      args: [phone, user.id],
    });
    if (checkResult.rows.length > 0) {
      return NextResponse.json({ error: "该手机号已被其他用户使用" }, { status: 400 });
    }

    await db.execute({
      sql: "UPDATE users SET real_name = ?, phone = ?, hospital = ?, department = ?, grade = ? WHERE id = ?",
      args: [real_name.trim(), phone, hospital?.trim() || "", department?.trim() || "", grade?.trim() || "", user.id],
    });

    return NextResponse.json({ success: true, message: "个人信息已更新" });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// PATCH - Change password
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "请填写旧密码和新密码" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码长度不能少于 6 位" }, { status: 400 });
    }

    const db = await ensureDb();
    const result = await db.execute({
      sql: "SELECT password_hash FROM users WHERE id = ?",
      args: [user.id],
    });
    const currentUser = result.rows[0] as unknown as { password_hash: string };

    const valid = await verifyPassword(oldPassword, currentUser.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "旧密码不正确" }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [newHash, user.id],
    });

    return NextResponse.json({ success: true, message: "密码修改成功" });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "密码修改失败" }, { status: 500 });
  }
}
