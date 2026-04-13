"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";

type Template = {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: Date;
  updatedAt: Date;
};

function formatDate(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

type Props = {
  publicMode?: boolean;
  pageSize?: number;
};

export default function TemplatesListView({ publicMode = false, pageSize = 10 }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        orderBy: "createdAt",
        order: "desc",
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/templates?${params}`);
      if (!res.ok) throw new Error("获取模板列表失败");
      const data = await res.json();
      setTemplates(data.templates);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 搜索时重置到第一页
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-zinc-900">
              {publicMode ? "选择模板生成海报" : "海报模板管理"}
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              {publicMode ? "选择模板进入生成海报" : `共 ${total} 个模板`}
            </div>
          </div>
          {!publicMode && (
            <Link
              href="/templates/new"
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              新建模板
            </Link>
          )}
        </div>

        {/* 搜索框 */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索模板名称..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        {/* 模板列表 */}
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              加载中...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              {search ? "未找到匹配的模板" : (publicMode ? "暂无可用模板" : "暂无模板，点击「新建模板」开始配置。")}
            </div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-zinc-900">{t.name}</div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-zinc-500">
                    <span>画布：{t.canvasWidth} × {t.canvasHeight}</span>
                    {!publicMode && (
                      <>
                        <span>创建：{formatDate(t.createdAt)}</span>
                        <span>更新：{formatDate(t.updatedAt)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex shrink-0 gap-2">
                  {!publicMode && (
                    <Link
                      href={`/templates/${t.id}/edit`}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      修改
                    </Link>
                  )}
                  <Link
                    href={`/templates/${t.id}/generate`}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    生成海报
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页 */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 text-sm text-zinc-600">
            <span className="font-medium">{page}</span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
