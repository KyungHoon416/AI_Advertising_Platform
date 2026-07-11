"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setToken, type UserMe } from "@/lib/api";

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/advertisers", label: "AI 광고주 추천" },
  { href: "/research", label: "시장조사 · 경쟁사" },
  { href: "/operations", label: "운영 · ROI · 재계약" },
  { href: "/prompts", label: "Prompt Library" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<UserMe | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        setMe(u);
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="font-bold text-slate-900">놀이의발견</div>
          <div className="text-xs text-slate-400">AI Advertising Platform</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-blue-50 text-primary font-medium" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="text-sm font-medium text-slate-700">{me?.name}</div>
          <div className="text-xs text-slate-400">{me?.roles.join(", ")}</div>
          <button
            className="mt-2 text-xs text-slate-400 hover:text-danger"
            onClick={() => {
              setToken(null);
              router.replace("/login");
            }}
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}
