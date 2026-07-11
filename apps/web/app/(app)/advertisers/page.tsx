"use client";

import { useEffect, useState } from "react";
import {
  api,
  type Advertiser,
  type Proposal,
  type Recommendation,
  type ScoreRead,
} from "@/lib/api";

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`grade-${grade} rounded px-2 py-0.5 text-xs font-bold`}>{grade}등급</span>
  );
}

export default function AdvertisersPage() {
  const [rows, setRows] = useState<Advertiser[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Advertiser | null>(null);

  async function load() {
    const page = await api.advertisers({ size: "50", ...(q ? { q } : {}) });
    setRows(page.items);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">AI 광고주 추천</h1>
      <p className="text-sm text-slate-500 mt-1">
        광고주를 선택해 적합도 점수·근거·광고상품 추천·제안서를 확인하세요.
      </p>

      <div className="mt-5 flex gap-2">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64"
          placeholder="광고주 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn-ghost" onClick={load}>
          검색
        </button>
      </div>

      <div className="mt-4 card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">광고주</th>
              <th className="text-left px-4 py-3 font-medium">지역</th>
              <th className="text-left px-4 py-3 font-medium">규모</th>
              <th className="text-left px-4 py-3 font-medium">출처</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                <td className="px-4 py-3 text-slate-500">{a.region || "-"}</td>
                <td className="px-4 py-3 text-slate-500">{a.size || "-"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {a.source === "discovery" ? "AI 발굴" : "수동"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-primary" onClick={() => setSelected(a)}>
                    분석
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  광고주가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <AnalysisDrawer advertiser={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AnalysisDrawer({ advertiser, onClose }: { advertiser: Advertiser; onClose: () => void }) {
  const [tab, setTab] = useState<"score" | "recommend" | "proposal">("score");
  const [score, setScore] = useState<ScoreRead | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(kind: string, fn: () => Promise<void>) {
    setError(null);
    setLoading(kind);
    fn().catch((e) => setError(e.message)).finally(() => setLoading(null));
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-slate-900">{advertiser.name}</div>
            <div className="text-xs text-slate-400">
              {advertiser.region || "-"} · {advertiser.size || "-"}
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-2">
          {[
            ["score", "적합도 점수"],
            ["recommend", "광고상품 추천"],
            ["proposal", "제안서"],
          ].map(([k, label]) => (
            <button
              key={k}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                tab === k ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setTab(k as any)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && <div className="mb-4 text-sm text-danger">{error}</div>}

          {tab === "score" && (
            <div>
              <button
                className="btn-primary mb-4"
                disabled={loading === "score"}
                onClick={() =>
                  run("score", async () => setScore(await api.computeScore(advertiser.id)))
                }
              >
                {loading === "score" ? "산출 중..." : "AI 적합도 점수 산출"}
              </button>
              {score && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-4xl font-bold text-slate-900">{score.total_score}</div>
                    <GradeBadge grade={score.grade} />
                    <span className="text-xs text-slate-400">신뢰도 {score.confidence}%</span>
                  </div>
                  <div className="space-y-2">
                    {score.factors.map((f) => (
                      <div key={f.code} className="card p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-700">{f.label}</span>
                          <span className="text-sm text-slate-500">
                            {f.score}/{f.max_score}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-slate-100 rounded">
                          <div
                            className="h-1.5 rounded bg-primary"
                            style={{ width: `${(f.score / f.max_score) * 100}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              f.is_inference ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {f.is_inference ? "추론" : "사실"}
                          </span>
                          <span className="text-xs text-slate-500">{f.rationale}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "recommend" && (
            <div>
              <button
                className="btn-primary mb-4"
                disabled={loading === "rec"}
                onClick={() =>
                  run("rec", async () =>
                    setRec(await api.recommend(advertiser.id, "예약 전환", 20000000))
                  )
                }
              >
                {loading === "rec" ? "분석 중..." : "AI 광고상품 추천"}
              </button>
              {rec && (
                <div>
                  {rec.combo && (
                    <div className="card p-3 mb-3">
                      <div className="text-sm font-semibold text-slate-800">
                        추천 조합: {rec.combo.name}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {rec.items.map((it) => (
                      <div key={it.ad_product_id} className="card p-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            {it.rank ? `${it.rank}순위 · ` : ""}
                            {it.product_code}
                          </span>
                          <span className="text-sm text-primary font-semibold">
                            {it.fit_score}점
                          </span>
                        </div>
                        {it.reason && <div className="text-xs text-slate-500 mt-1">{it.reason}</div>}
                        {it.est_metrics && (
                          <div className="text-xs text-slate-400 mt-1">
                            예상(가정) ROI {it.est_metrics.roi}% · 전환 {it.est_metrics.conversions}건
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "proposal" && (
            <div>
              <button
                className="btn-primary mb-4"
                disabled={loading === "prop"}
                onClick={() =>
                  run("prop", async () =>
                    setProposal(await api.generateProposal(advertiser.id, "예약 전환", 20000000))
                  )
                }
              >
                {loading === "prop" ? "생성 중..." : "AI 제안서 생성"}
              </button>
              {proposal && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">
                    생성: {proposal.generated_by} · v{proposal.version}
                  </div>
                  <div className="space-y-3">
                    {proposal.content.sections?.map((s: any) => (
                      <div key={s.key} className="card p-3">
                        <div className="text-sm font-semibold text-slate-800">{s.title}</div>
                        {s.body && <p className="text-sm text-slate-600 mt-1">{s.body}</p>}
                        {s.metrics && (
                          <div className="text-xs text-slate-500 mt-1">
                            예상(가정): ROI {s.metrics.roi}% · 전환 {s.metrics.conversions}건 · 매출{" "}
                            {s.metrics.revenue?.toLocaleString?.()}원
                          </div>
                        )}
                        {s.products && (
                          <ul className="text-xs text-slate-500 mt-1 list-disc pl-4">
                            {s.products.slice(0, 4).map((p: any, i: number) => (
                              <li key={i}>
                                {p.product_code} · {p.fit_score}점
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
