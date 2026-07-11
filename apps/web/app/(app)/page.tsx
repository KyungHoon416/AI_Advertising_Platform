"use client";

import { useEffect, useState } from "react";
import { api, type Kpis } from "@/lib/api";

const CARDS: { key: keyof Kpis; label: string }[] = [
  { key: "total_advertisers", label: "전체 광고주" },
  { key: "discovered_advertisers", label: "AI 발굴 광고주" },
  { key: "high_score_advertisers", label: "High Score(S·A)" },
  { key: "scored_advertisers", label: "점수 산출 완료" },
  { key: "proposals", label: "생성된 제안서" },
  { key: "competitors", label: "분석 경쟁사" },
  { key: "campaigns", label: "광고 캠페인" },
];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.kpis().then(setKpis).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
      <p className="text-sm text-slate-500 mt-1">AI 기반 광고 유치·운영 현황</p>

      {error && <div className="mt-6 text-sm text-danger">{error}</div>}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((c) => (
          <div key={c.key} className="card p-5">
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {kpis ? kpis[c.key] : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
