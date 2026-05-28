"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PACKAGES = [
  { name: "试用", credits: 3, price: "免费" },
  { name: "月卡", credits: 30, price: "¥15" },
  { name: "季卡", credits: 100, price: "¥40" },
  { name: "年卡", credits: 500, price: "¥150" },
];

export default function AdminRechargePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.error) {
      router.push("/dashboard");
      return;
    }
    setUsers(data.users.filter((u: any) => u.role !== "admin"));
    setLoading(false);
  };

  const handleRecharge = async () => {
    setMsg("");

    const credits = selectedPackage
      ? PACKAGES.find((p) => p.name === selectedPackage)?.credits || 0
      : parseInt(customCredits);

    if (!selectedUser) {
      setMsg("请选择用户");
      return;
    }
    if (!credits || credits <= 0) {
      setMsg("请选择套餐或输入有效次数");
      return;
    }

    const res = await fetch("/api/admin/recharge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: parseInt(selectedUser),
        credits,
        packageName: selectedPackage || "自定义充值",
        note,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMsg(`✓ ${data.message}`);
      setSelectedPackage("");
      setCustomCredits("");
      setNote("");
      loadUsers();
    } else {
      setMsg(`✗ ${data.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav router={router} />

      <div className="max-w-6xl mx-auto p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">充值管理</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recharge Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">手动充值</h3>

            {/* User Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择用户</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
              >
                <option value="">请选择用户</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.username}（余额：{u.credits}次）
                  </option>
                ))}
              </select>
            </div>

            {/* Package Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择套餐</label>
              <div className="grid grid-cols-2 gap-2">
                {PACKAGES.map((pkg) => (
                  <button
                    key={pkg.name}
                    onClick={() => {
                      setSelectedPackage(pkg.name);
                      setCustomCredits("");
                    }}
                    className={`text-left p-3 rounded-lg border text-sm transition ${
                      selectedPackage === pkg.name
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-gray-800">{pkg.name}</div>
                    <div className="text-xs text-gray-500">
                      {pkg.credits}次 · {pkg.price}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Credits */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                自定义次数 {customCredits && `(${customCredits} 次)`}
              </label>
              <input
                type="number"
                value={customCredits}
                onChange={(e) => {
                  setCustomCredits(e.target.value);
                  setSelectedPackage("");
                }}
                placeholder="输入自定义次数"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            {/* Note */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="比如：微信转账"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            {msg && (
              <div className={`mb-4 text-sm ${msg.includes("✓") ? "text-green-600" : "text-red-600"}`}>
                {msg}
              </div>
            )}

            <button
              onClick={handleRecharge}
              className="w-full py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
            >
              确认充值
            </button>
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">用户额度一览</h3>
            <div className="space-y-2">
              {users.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800">{u.username}</span>
                    {!u.is_active && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">已停用</span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${u.credits <= 5 ? "text-red-500" : "text-gray-600"}`}>
                    {u.credits} 次
                  </span>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-sm text-gray-400">暂无用户</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminNav({ router }: { router: any }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-gray-800">管理后台</h1>
          <button onClick={() => router.push("/admin")} className="text-sm text-gray-500 hover:text-gray-700">仪表盘</button>
          <button onClick={() => router.push("/admin/users")} className="text-sm text-gray-500 hover:text-gray-700">用户管理</button>
          <button onClick={() => router.push("/admin/recharge")} className="text-sm pb-1 border-b-2 border-blue-600 text-blue-600 font-medium">充值管理</button>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:text-blue-800">返回首页</button>
      </div>
    </nav>
  );
}
