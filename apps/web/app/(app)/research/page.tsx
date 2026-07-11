"use client";

import { useEffect, useState } from "react";
import {
  api,
  type Category,
  type Competitor,
  type MarketResearch,
} from "@/lib/api";

export default function ResearchPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [market, setMarket] = useState<MarketResearch | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .categories({ size: "200" })
      .then((p) => {
        setCategories(p.items);
        const wp = p.items.find((c) => c.name === "워터파크") || p.items[0];
        if (wp) setCategoryId(wp.id);
      })
      .catch((e) => setError(e.message));
  }, []);

  function run(kind: string, fn: () => Promise<void>) {
    if (!categoryId) return;
    setError(null);
    setLoading(kind);
    fn().catch((e) => setError(e.message)).finally(() => setLoading(null));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">시장조사 · 경쟁사 분석</h1>
      <p className="text-sm text-slate-500 mt-1">카테고리를 선택해 AI 시장조사·경쟁사 탐색을 실행하세요.</p>

      <div className="mt-5 flex flex-wrap gap-2 items-center">
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level})
            </option>
          ))}
        </select>
        <button
          className="btn-primary"
          disabled={loading === "market"}
          onClick={() => run("market", async () => setMarket(await api.runMarketResearch(categoryId)))}
        >
          {loading === "market" ? "분석 중..." : "AI 시장조사"}
        </button>
        <button
          className="btn-ghost"
          disabled={loading === "comp"}
          onClick={() =>
            run("comp", async () => setCompetitors(await api.discoverCompetitors(categoryId)))
          }
        >
          {loading === "comp" ? "탐색 중..." : "AI 경쟁사 탐색"}
        </button>
      </div>

      {error && <div className="mt-4 text-sm text-danger">{error}</div>}

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {market && (
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-slate-800">시장조사 리포트</h2>
              <span className="text-xs text-slate-400">신뢰도 {market.confidence}%</span>
            </div>
            <dl className="text-sm space-y-2">
              <Row label="시장 규모" value={market.market_size} />
              <Row label="성장률" value={market.growth_rate} />
              <ListRow label="트렌드" items={market.trends?.items} />
              <ListRow label="기회 요인" items={market.opportunities?.items} />
              <ListRow label="위험 요인" items={market.risks?.items} />
            </dl>
          </div>
        )}

        {competitors.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-3">경쟁사 탐색 결과</h2>
            <div className="space-y-2">
              {competitors.map((c) => (
                <div key={c.id} className="flex justify-between border border-slate-100 rounded-lg px-3 py-2">
                  <span className="text-sm text-slate-700">{c.company}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">{c.type}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              * 오프라인 폴백 시 추론 기반 후보(낮은 신뢰도)로 표기됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value || "-"}</dd>
    </div>
  );
}
function ListRow({ label, items }: { label: string; items?: string[] }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-slate-400">{label}</dt>
      <dd className="text-slate-700">
        <ul className="list-disc pl-4 space-y-0.5">
          {(items || []).map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
