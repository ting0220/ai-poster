"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export default function PasswordGate({
  children,
  redirectTo,
}: {
  children?: React.ReactNode;
  redirectTo: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        if (redirectTo) {
          window.location.href = redirectTo;
        } else {
          window.location.reload();
        }
      } else {
        setError(true);
        setPassword("");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <Lock className="h-6 w-6 text-zinc-600" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-zinc-900">模板定制</h1>
            <p className="mt-1 text-sm text-zinc-500">请输入访问密码</p>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="输入密码"
              className={`w-full rounded-lg border bg-white px-4 py-3 text-center text-sm outline-none ${
                error
                  ? "border-red-400 bg-red-50 text-red-600"
                  : "border-zinc-200 focus:border-zinc-400"
              }`}
              autoFocus
            />

            {error && (
              <p className="mt-2 text-center text-xs text-red-500">密码错误，请重试</p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="mt-4 w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "验证中..." : "确认"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
