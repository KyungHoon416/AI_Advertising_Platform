"use client";

// Typed API client for the Internal AI Advertising Platform backend.
// Same-origin ("/api/..") via Next.js rewrite proxy.

export type Grade = "S" | "A" | "B" | "C" | "D";

export interface Tokens {
  access_token: string;
  refresh_token: string;
}
export interface UserMe {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}
export interface Advertiser {
  id: string;
  name: string;
  brand?: string | null;
  region?: string | null;
  size?: string | null;
  budget_band?: string | null;
  status: string;
  source: string;
  primary_category_id?: string | null;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
export interface ScoreFactor {
  code: string;
  label: string;
  score: number;
  max_score: number;
  rationale: string;
  is_inference: boolean;
  confidence: number;
}
export interface ScoreRead {
  id: string;
  advertiser_id: string;
  total_score: number;
  grade: Grade;
  confidence: number;
  factors: ScoreFactor[];
}
export interface RecItem {
  ad_product_id: string;
  product_code?: string | null;
  rank?: number | null;
  fit_score: number;
  reason?: string | null;
  role?: string | null;
  est_metrics?: Record<string, number> | null;
}
export interface Recommendation {
  id: string;
  advertiser_id: string;
  purpose?: string | null;
  budget?: number | null;
  combo?: { name: string; product_codes: string[]; roles: Record<string, string> } | null;
  confidence?: number | null;
  items: RecItem[];
}
export interface Proposal {
  id: string;
  advertiser_id: string;
  title: string;
  status: string;
  version: number;
  generated_by: string;
  content: any;
}
export interface Kpis {
  total_advertisers: number;
  discovered_advertisers: number;
  high_score_advertisers: number;
  scored_advertisers: number;
  proposals: number;
  competitors: number;
  campaigns: number;
}
export interface Category {
  id: string;
  name: string;
  level: string;
  parent_id?: string | null;
}
export interface MarketResearch {
  id: string;
  category_id: string;
  market_size?: string | null;
  growth_rate?: string | null;
  trends?: { items?: string[] } | null;
  consumer_traits?: { items?: string[] } | null;
  opportunities?: { items?: string[] } | null;
  risks?: { items?: string[] } | null;
  confidence?: number | null;
}
export interface Competitor {
  id: string;
  category_id: string;
  company: string;
  brand?: string | null;
  type: string;
}
export interface ScoringConfigFactor {
  target: string;
  factor_code: string;
  label: string;
  max_score: number;
  weight: number;
}
export interface ScoringConfig {
  version: string;
  status: string;
  factors: ScoringConfigFactor[];
}
export interface PromptVersion {
  version: number;
  template: string;
  model?: string | null;
  status: string;
}
export interface Prompt {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  latest?: PromptVersion | null;
}

const TOKEN_KEY = "nolbal_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) window.localStorage.setItem(TOKEN_KEY, t);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    req<Tokens>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req<UserMe>("/auth/me"),
  kpis: () => req<Kpis>("/dashboard/kpis"),
  advertisers: (params: Record<string, string> = {}) =>
    req<Page<Advertiser>>(`/advertisers?${new URLSearchParams(params)}`),
  computeScore: (id: string) =>
    req<ScoreRead>(`/scoring/advertisers/${id}`, { method: "POST" }),
  latestScore: (id: string) => req<ScoreRead>(`/scoring/advertisers/${id}`),
  recommend: (advertiser_id: string, purpose?: string, budget?: number) =>
    req<Recommendation>("/recommendations/ad-products", {
      method: "POST",
      body: JSON.stringify({ advertiser_id, purpose, budget }),
    }),
  generateProposal: (advertiser_id: string, purpose?: string, budget?: number) =>
    req<Proposal>("/proposals/generate", {
      method: "POST",
      body: JSON.stringify({ advertiser_id, purpose, budget }),
    }),
  categories: (params: Record<string, string> = {}) =>
    req<Page<Category>>(`/categories?${new URLSearchParams(params)}`),
  runMarketResearch: (category_id: string) =>
    req<MarketResearch>("/market-research/run", {
      method: "POST",
      body: JSON.stringify({ category_id }),
    }),
  discoverCompetitors: (category_id: string) =>
    req<Competitor[]>("/competitors/discover", {
      method: "POST",
      body: JSON.stringify({ category_id }),
    }),
  scoringConfig: () => req<ScoringConfig>("/scoring/config"),
  prompts: () => req<Prompt[]>("/prompts"),
};
