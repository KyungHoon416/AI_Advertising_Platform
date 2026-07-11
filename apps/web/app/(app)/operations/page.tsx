"use client";

import { useEffect, useState } from "react";
import { api, type Campaign, type Performance, type Renewal } from "@/lib/api";

const LIKELIHOOD_STYLE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-200 text-slate-600",
};

export default function OperationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.campaigns().then(setCampaigns).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">광고 운영 · ROI · 재계약</h1>
      <p className="text-sm text-slate-500 mt-1">
        집행 캠페인의 성과를 진단하고 ROI·재계약/업셀링을 AI로 분석합니다.
      </p>
      {error && <div className="mt-4 text-sm text-danger">{error}</div>}

      <div className="mt-6 space-y-4">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
        {campaigns.length === 0 && !error && (
          <div className="card p-10 text-center text-slate-400">캠페인이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [perf, setPerf] = useState<Performance>(campaign.performances[0]);
  const [renewal, setRenewal] = useState<Renewal | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(kind: string, fn: () => Promise<void>) {
    setError(null);
    setLoading(kind);
    fn().catch((e) => setError(e.message)).finally(() => setLoading(null));
  }

  const won = (n?: number | null) => `${(n || 0).toLocaleString()}원`;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-slate-800">{campaign.name}</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">
            {campaign.status}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {campaign.period_start} ~ {campaign.period_end} · 계약 {won(campaign.contract_amount)}
        </span>
      </div>

      {perf && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3 border-y border-slate-100 py-3">
          <Metric label="노출" value={(perf.impressions || 0).toLocaleString()} />
          <Metric label="클릭" value={(perf.clicks || 0).toLocaleString()} />
          <Metric label="전환" value={(perf.conversions || 0).toLocaleString()} />
          <Metric label="CTR" value={perf.ctr != null ? `${perf.ctr}%` : "-"} />
          <Metric label="ROAS" value={perf.roas != null ? `${perf.roas}%` : "-"} />
          <Metric label="ROI" value={perf.roi != null ? `${perf.roi}%` : "-"} />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          className="btn-primary"
          disabled={loading === "perf"}
          onClick={() => run("perf", async () => setPerf(await api.analyzePerformance(perf.id)))}
        >
          {loading === "perf" ? "분석 중..." : "AI 성과 분석"}
        </button>
        <button
          className="btn-ghost"
          disabled={loading === "renew"}
          onClick={() => run("renew", async () => setRenewal(await api.recommendRenewal(campaign.id)))}
        >
          {loading === "renew" ? "분석 중..." : "재계약 · 업셀링 추천"}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-danger">{error}</div>}

      {perf?.analysis && (
        <div className="mt-4 card p-4 bg-slate-50 border-slate-100">
          <div className="text-sm font-semibold text-slate-800">AI 성과 진단</div>
          <div className="text-sm text-slate-600 mt-1">{perf.analysis.summary}</div>
          {perf.analysis.achievement != null && (
            <div className="text-xs text-slate-500 mt-1">목표 달성률 {perf.analysis.achievement}%</div>
          )}
          {perf.analysis.improvements && (
            <ul className="mt-2 text-sm text-slate-600 list-disc pl-5 space-y-0.5">
              {perf.analysis.improvements.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {renewal && (
        <div className="mt-3 card p-4 bg-slate-50 border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">재계약 가능성</span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold ${
                LIKELIHOOD_STYLE[renewal.likelihood] || "bg-slate-100"
              }`}
            >
              {renewal.likelihood.toUpperCase()} · {renewal.score}점
            </span>
          </div>
          {renewal.rationale && <div className="text-sm text-slate-600 mt-1">{renewal.rationale}</div>}
          {renewal.upsell_product_code && (
            <div className="mt-2 text-sm text-primary">
              ⬆ 업셀 추천: {renewal.upsell_product_code}
              {renewal.upsell_reason ? ` — ${renewal.upsell_reason}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
