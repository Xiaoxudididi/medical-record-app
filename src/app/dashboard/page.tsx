"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string; credits: number; role: string } | null>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [streamedResult, setStreamedResult] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/login");
        } else {
          setUser(data);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!text.trim() && images.length === 0) return;

    setGenerating(true);
    setStreamedResult("");
    setShowResult(true);
    setStartTime(Date.now());

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, images }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "生成失败");
        setGenerating(false);
        setShowResult(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setGenerating(false);
        setShowResult(false);
        return;
      }

      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setStreamedResult(result);
      }

      // Refresh user credits
      const userRes = await fetch("/api/user/me");
      const userData = await userRes.json();
      if (userData.id) setUser(userData);
    } catch {
      alert("生成失败，请稍后重试");
      setShowResult(false);
    } finally {
      setGenerating(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(streamedResult);
    alert("已复制到剪贴板");
  };

  const downloadResult = () => {
    const blob = new Blob([streamedResult], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `病历_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
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
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">病历通</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              剩余额度：<span className="font-bold text-blue-600">{user.credits}</span> 次
            </span>
            <button
              onClick={() => router.push("/profile")}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {user.username}
            </button>
            {user.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                管理后台
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700"
            >
              退出
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4">
        {!showResult ? (
          /* Input View */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Text Input */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">
                患者信息（文字输入）
              </h2>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"例：\n患者男性，45岁，因\"胸痛3天，加重1小时\"入院。\n3天前无明显诱因出现胸骨后压榨性疼痛，每次持续约5-10分钟，休息后可缓解。近1小时胸痛加重，持续不缓解...\n既往高血压病史10年，吸烟20年，每天1包..."}
                rows={14}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-2">
                可自由输入或粘贴患者信息，AI会自动整理成完整大病历格式。
              </p>
            </div>

            {/* Image Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">
                检查报告 / 拍照上传
              </h2>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-400 transition">
                <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-sm text-gray-500">点击上传图片</span>
                <span className="text-xs text-gray-400 mt-1">支持拍照或从相册选取</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img}
                        alt={`上传图片 ${i + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="lg:col-span-2 flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={generating || (!text.trim() && images.length === 0)}
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-base"
              >
                {generating ? "生成中..." : "生成病历"}
              </button>
            </div>
          </div>
        ) : (
          /* Result View */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowResult(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← 返回修改
                </button>
              </div>
              <div className="flex items-center gap-3">
                {startTime > 0 && !generating && (
                  <span className="text-xs text-gray-400">
                    生成耗时：{((Date.now() - startTime) / 1000).toFixed(1)}s
                  </span>
                )}
                <button
                  onClick={copyResult}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  复制全文
                </button>
                <button
                  onClick={downloadResult}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  下载文本
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {generating && !streamedResult ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  正在生成病历...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
                  {streamedResult || "暂无内容"}
                </pre>
              )}
              {generating && streamedResult && (
                <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
