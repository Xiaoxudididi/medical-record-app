"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "history" | "password">("info");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const router = useRouter();

  // Edit form state
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ real_name: "", phone: "", hospital: "", department: "", grade: "" });
  const [editMsg, setEditMsg] = useState("");

  // Password form state
  const [pwData, setPwData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/login");
        } else {
          setUser(data);
          setFormData({
            real_name: data.real_name || "",
            phone: data.phone || "",
            hospital: data.hospital || "",
            department: data.department || "",
            grade: data.grade || "",
          });
        }
      })
      .catch(() => router.push("/login"));

    fetch("/api/records?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleSaveProfile = async () => {
    setEditMsg("");
    const res = await fetch("/api/user/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (res.ok) {
      setEditMsg(data.message);
      setEditMode(false);
      setUser({ ...user, ...formData });
    } else {
      setEditMsg(data.error);
    }
  };

  const handleChangePassword = async () => {
    setPwMsg("");
    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwMsg("两次输入的新密码不一致");
      return;
    }
    if (pwData.newPassword.length < 6) {
      setPwMsg("新密码长度不能少于 6 位");
      return;
    }
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: pwData.oldPassword, newPassword: pwData.newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg(data.message);
      setPwData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPwMsg(data.error);
    }
  };

  const viewRecord = async (id: number) => {
    const res = await fetch(`/api/records/${id}`);
    const data = await res.json();
    if (!data.error) {
      setSelectedRecord(data);
    }
  };

  const handleLogout = () => {
    document.cookie = "mr_token=; path=/; max-age=0";
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">个人中心</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:text-blue-800">
              返回首页
            </button>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
              退出登录
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-gray-200 pb-2">
          {(["info", "history", "password"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium transition border-b-2 -mb-[2px] ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "info" ? "个人信息" : tab === "history" ? "病历历史" : "修改密码"}
            </button>
          ))}
        </div>

        {/* Tab: Personal Info */}
        {activeTab === "info" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{user.username}</h2>
                <p className="text-sm text-gray-500">{user.role === "admin" ? "管理员" : "普通用户"}</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{user.credits}</div>
                <div className="text-xs text-gray-400">剩余次数</div>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <FormField label="真实姓名" value={formData.real_name} onChange={(v) => setFormData({ ...formData, real_name: v })} />
                <FormField label="手机号" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />
                <FormField label="医院" value={formData.hospital} onChange={(v) => setFormData({ ...formData, hospital: v })} />
                <FormField label="科室" value={formData.department} onChange={(v) => setFormData({ ...formData, department: v })} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年级/身份</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="">请选择</option>
                    <option value="大四见习">大四见习</option>
                    <option value="大五实习">大五实习</option>
                    <option value="规培生">规培生</option>
                    <option value="住院医师">住院医师</option>
                    <option value="主治医师">主治医师</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                {editMsg && (
                  <div className={`text-sm ${editMsg.includes("成功") || editMsg.includes("已更新") ? "text-green-600" : "text-red-600"}`}>
                    {editMsg}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleSaveProfile} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">保存</button>
                  <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">取消</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <InfoRow label="真实姓名" value={user.real_name || "未填写"} />
                <InfoRow label="手机号" value={user.phone || "未填写"} />
                <InfoRow label="医院" value={user.hospital || "未填写"} />
                <InfoRow label="科室" value={user.department || "未填写"} />
                <InfoRow label="年级/身份" value={user.grade || "未填写"} />
                <button onClick={() => setEditMode(true)} className="mt-4 px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                  编辑资料
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: History */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">病历历史</h3>
            {loading ? (
              <div className="text-gray-400 text-sm">加载中...</div>
            ) : records.length === 0 ? (
              <div className="text-gray-400 text-sm">暂无记录</div>
            ) : (
              <div className="space-y-2">
                {records.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => viewRecord(r.id)}
                    className="w-full text-left flex items-center justify-between py-3 px-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded transition"
                  >
                    <div>
                      <div className="text-sm text-gray-700 truncate max-w-md">{r.preview}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.created_at}</div>
                    </div>
                    <span className="text-xs text-gray-400">查看 →</span>
                  </button>
                ))}
              </div>
            )}

            {/* Record Detail Modal */}
            {selectedRecord && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRecord(null)}>
                <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">病历详情</h3>
                    <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                  </div>
                  <div className="text-xs text-gray-400 mb-4">生成时间：{selectedRecord.created_at}</div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans bg-gray-50 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
                    {selectedRecord.generated_result}
                  </pre>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedRecord.generated_result);
                        alert("已复制到剪贴板");
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      复制全文
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([selectedRecord.generated_result], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `病历_${selectedRecord.created_at.slice(0, 10)}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                    >
                      下载文本
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Change Password */}
        {activeTab === "password" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-md">
            <h3 className="text-base font-semibold text-gray-800 mb-4">修改密码</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">旧密码</label>
                <input
                  type="password"
                  value={pwData.oldPassword}
                  onChange={(e) => setPwData({ ...pwData, oldPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <input
                  type="password"
                  value={pwData.newPassword}
                  onChange={(e) => setPwData({ ...pwData, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={pwData.confirmPassword}
                  onChange={(e) => setPwData({ ...pwData, confirmPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              {pwMsg && (
                <div className={`text-sm ${pwMsg.includes("成功") ? "text-green-600" : "text-red-600"}`}>
                  {pwMsg}
                </div>
              )}
              <button onClick={handleChangePassword} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                确认修改
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
