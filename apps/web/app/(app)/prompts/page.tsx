"use client";

import { useEffect, useState } from "react";
import { api, type Prompt } from "@/lib/api";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.prompts().then(setPrompts).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Prompt Library</h1>
      <p className="text-sm text-slate-500 mt-1">
        AI 에이전트가 사용하는 표준 프롬프트 템플릿과 버전을 관리합니다.
      </p>

      {error && <div className="mt-4 text-sm text-danger">{error}</div>}

      <div className="mt-6 space-y-3">
        {prompts.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-primary font-medium">
                  {p.category}
                </span>
                <span className="ml-2 font-semibold text-slate-800">{p.name}</span>
              </div>
              {p.latest && (
                <div className="text-xs text-slate-400">
                  v{p.latest.version} · {p.latest.model} ·{" "}
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      p.latest.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.latest.status}
                  </span>
                </div>
              )}
            </div>
            {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}
            {p.latest && (
              <pre className="mt-3 text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap text-slate-600">
                {p.latest.template}
              </pre>
            )}
          </div>
        ))}
        {prompts.length === 0 && !error && (
          <div className="card p-10 text-center text-slate-400">프롬프트가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
