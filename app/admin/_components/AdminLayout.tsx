"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Type, LayoutGrid, ChevronRight } from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    id: "templates",
    label: "模板/海报管理",
    href: "/admin/templates",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    id: "fonts",
    label: "字体管理",
    href: "/admin/fonts",
    icon: <Type className="h-4 w-4" />,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* 左侧导航栏 */}
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white">
        {/* 头部标题 */}
        <div className="border-b border-zinc-200 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-white">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900">管理后台</div>
              <div className="text-xs text-zinc-500">海报生成系统</div>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-zinc-100 font-medium text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                ].join(" ")}
              >
                <span className={isActive ? "text-zinc-900" : "text-zinc-400"}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 text-zinc-400" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
