"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminStatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/dashboard");
        } else {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(() => router.push("/dashboard"));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav current="stats" router={router} />

      <div className="max-w-6xl mx-auto p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">仪表盘</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="总用户数" value={stats.totalUsers} color="blue" />
          <StatCard label="今日调用" value={stats.todayRecords} color="green" />
          <StatCard label="本月用量" value={stats.monthlyRecords} color="purple" />
          <StatCard label="总充值次数" value={stats.totalRecharged} color="orange" />
        </div>

        {/* Daily Usage Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">近7天用量</h3>
          {stats.dailyUsage && stats.dailyUsage.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {stats.dailyUsage.map((d: any) => {
                const maxCount = Math.max(...stats.dailyUsage.map((x: any) => x.count), 1);
                const height = (d.count / maxCount) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center">
                    <span className="text-xs font-medium text-gray-700 mb-1">{d.count}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-xs text-gray-400 mt-1">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-400">暂无数据</div>
          )}
        </div>

        {/* Recent Recharges */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">最近充值记录</h3>
          {stats.recentRecharges && stats.recentRecharges.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">用户</th>
                  <th className="pb-2 font-medium">次数</th>
                  <th className="pb-2 font-medium">套餐</th>
                  <th className="pb-2 font-medium">操作人</th>
                  <th className="pb-2 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRecharges.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2">{r.user_name}</td>
                    <td className="py-2 font-medium text-green-600">+{r.credits_added}</td>
                    <td className="py-2 text-gray-500">{r.package_name}</td>
                    <td className="py-2 text-gray-500">{r.admin_name}</td>
                    <td className="py-2 text-gray-500">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-sm text-gray-400">暂无记录</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Navigation for Admin
function AdminNav({ current, router }: { current: string; router: any }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-gray-800">管理后台</h1>
          <NavLink href="/admin" label="仪表盘" active={current === "stats"} router={router} />
          <NavLink href="/admin/users" label="用户管理" active={current === "users"} router={router} />
          <NavLink href="/admin/recharge" label="充值管理" active={current === "recharge"} router={router} />
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          返回首页
        </button>
      </div>
    </nav>
  );
}

function NavLink({ href, label, active, router }: { href: string; label: string; active: boolean; router: any }) {
  return (
    <button
      onClick={() => router.push(href)}
      className={`text-sm pb-1 border-b-2 transition ${
        active
          ? "border-blue-600 text-blue-600 font-medium"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
