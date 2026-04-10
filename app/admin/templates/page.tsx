import Link from "next/link";
import React from "react";
import { prisma } from "@/app/_lib/prisma";
import { isAuthenticated } from "@/app/_lib/auth";
import PasswordGate from "@/app/_components/PasswordGate";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

export default async function AdminTemplatesPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <PasswordGate redirectTo="/admin/templates" />;
  }

  const templates = await prisma.template.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, canvasWidth: true, canvasHeight: true, updatedAt: true },
  });

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-zinc-900">海报模板</div>
            <div className="mt-1 text-sm text-zinc-500">管理模板并生成多张海报</div>
          </div>
          <Link
            href="/templates/new"
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            新建模板
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{t.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    画布：{t.canvasWidth} x {t.canvasHeight}
                  </div>
                  <div className="mt-2 text-[11px] text-zinc-400">
                    更新：{formatDate(t.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/templates/${t.id}/edit`}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  修改模板
                </Link>
                <Link
                  href={`/templates/${t.id}/generate`}
                  className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800"
                >
                  生成海报
                </Link>
              </div>
            </div>
          ))}

          {templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 md:col-span-2">
              暂无模板，点击"新建模板"开始配置。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
