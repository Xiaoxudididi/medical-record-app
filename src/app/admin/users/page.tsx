"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", credits: 3 });
  const [msg, setMsg] = useState("");
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
    setUsers(data.users);
    setLoading(false);
  };

  const toggleUser = async (userId: number, isActive: boolean) => {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive: !isActive }),
    });
    if (res.ok) loadUsers();
  };

  const createUser = async () => {
    setMsg("");
    if (!newUser.username || !newUser.password) {
      setMsg("请填写完整信息");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(data.message);
      setNewUser({ username: "", password: "", credits: 3 });
      setShowCreate(false);
      loadUsers();
    } else {
      setMsg(data.error);
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">用户管理</h2>
          <button
            onClick={() => { setShowCreate(!showCreate); setMsg(""); }}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {showCreate ? "取消" : "新建用户"}
          </button>
        </div>

        {/* Create User Form */}
        {showCreate && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
            <h3 className="text-base font-semibold text-gray-800 mb-4">新建用户</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="用户名"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 outline-none"
              />
              <input
                type="password"
                placeholder="密码"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 outline-none"
              />
              <input
                type="number"
                placeholder="初始额度"
                value={newUser.credits}
                onChange={(e) => setNewUser({ ...newUser, credits: parseInt(e.target.value) || 0 })}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 outline-none"
              />
            </div>
            {msg && (
              <div className={`mt-3 text-sm ${msg.includes("成功") ? "text-green-600" : "text-red-600"}`}>
                {msg}
              </div>
            )}
            <button
              onClick={createUser}
              className="mt-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              确认创建
            </button>
          </div>
        )}

        {/* User List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">用户名</th>
                <th className="px-6 py-3 font-medium">角色</th>
                <th className="px-6 py-3 font-medium">额度</th>
                <th className="px-6 py-3 font-medium">状态</th>
                <th className="px-6 py-3 font-medium">注册时间</th>
                <th className="px-6 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{u.username}</td>
                  <td className="px-6 py-3">
                    {u.role === "admin" ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">管理员</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">用户</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`font-medium ${u.credits <= 0 ? "text-red-500" : "text-gray-700"}`}>
                      {u.credits}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.is_active ? "正常" : "停用"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{u.created_at}</td>
                  <td className="px-6 py-3">
                    {u.role !== "admin" && (
                      <button
                        onClick={() => toggleUser(u.id, u.is_active)}
                        className={`text-xs px-3 py-1 rounded ${
                          u.is_active
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {u.is_active ? "停用" : "启用"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <button onClick={() => router.push("/admin/users")} className="text-sm pb-1 border-b-2 border-blue-600 text-blue-600 font-medium">用户管理</button>
          <button onClick={() => router.push("/admin/recharge")} className="text-sm text-gray-500 hover:text-gray-700">充值管理</button>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:text-blue-800">返回首页</button>
      </div>
    </nav>
  );
}
