"use client";

import { useEffect, useState } from "react";
import { api, type ScoringConfig } from "@/lib/api";

export default function SettingsPage() {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.scoringConfig().then(setConfig).catch((e) => setError(e.message));
  }, []);

  const advertiser = config?.factors.filter((f) => f.target === "advertiser") || [];
  const product = config?.factors.filter((f) => f.target === "ad_product") || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings · 스코어링 가중치</h1>
      <p className="text-sm text-slate-500 mt-1">
        광고주·광고상품 적합도 평가 항목과 배점(합계 100). 버전{" "}
        <span className="font-medium text-slate-700">{config?.version}</span> ·{" "}
        <span className="text-emerald-600">{config?.status}</span>
      </p>

      {error && <div className="mt-4 text-sm text-danger">{error}</div>}

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <FactorTable title="광고주 적합도 평가" factors={advertiser} />
        <FactorTable title="광고상품 추천 평가" factors={product} />
      </div>

      <p className="mt-4 text-xs text-slate-400">
        * 가중치는 코드가 아닌 ScoringConfig(DB)로 관리되며 버전 태깅으로 재현 가능합니다.
        편집·재계산 UI는 후속 제공 예정.
      </p>
    </div>
  );
}

function FactorTable({
  title,
  factors,
}: {
  title: string;
  factors: { factor_code: string; label: string; max_score: number; weight: number }[];
}) {
  const total = factors.reduce((s, f) => s + f.max_score, 0);
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        <span className="text-sm text-slate-500">합계 {total}점</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {factors.map((f) => (
            <tr key={f.factor_code} className="border-t border-slate-50">
              <td className="px-5 py-2.5 text-slate-700">{f.label}</td>
              <td className="px-5 py-2.5 text-right text-slate-500 w-24">
                <span className="font-medium text-slate-800">{f.max_score}</span>점
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
