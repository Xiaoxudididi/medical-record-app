import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const db = await ensureDb();

  const [totalUsersRes, todayRecordsRes, monthlyRecordsRes, totalRechargedRes, dailyUsageRes, recentRechargesRes] =
    await Promise.all([
      db.execute("SELECT COUNT(*) as count FROM users"),
      db.execute("SELECT COUNT(*) as count FROM records WHERE date(created_at) = date('now')"),
      db.execute(
        "SELECT COUNT(*) as count FROM records WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
      ),
      db.execute("SELECT COALESCE(SUM(credits_added), 0) as total FROM recharge_logs"),
      db.execute(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM records
         WHERE created_at >= datetime('now', '-7 days')
         GROUP BY date(created_at)
         ORDER BY date(created_at) ASC`
      ),
      db.execute(
        `SELECT r.id, r.credits_added, r.package_name, r.note, r.created_at,
                u.username as admin_name, u2.username as user_name
         FROM recharge_logs r
         JOIN users u ON r.admin_id = u.id
         JOIN users u2 ON r.user_id = u2.id
         ORDER BY r.created_at DESC
         LIMIT 20`
      ),
    ]);

  return NextResponse.json({
    totalUsers: (totalUsersRes.rows[0] as any).count,
    todayRecords: (todayRecordsRes.rows[0] as any).count,
    monthlyRecords: (monthlyRecordsRes.rows[0] as any).count,
    totalRecharged: (totalRechargedRes.rows[0] as any).total,
    dailyUsage: dailyUsageRes.rows,
    recentRecharges: recentRechargesRes.rows,
  });
}
