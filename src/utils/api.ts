import { DataProfile, KpiMetric, BusinessProblem, AiRecommendation, ChartRecommendation, ForecastPoint, WhatIfScenario, SqlQueryResult, UserSession, DatasetMeta } from '../types.js';

const TOKEN_KEY = 'nexusai_auth_token';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      inMemoryToken = saved;
      return saved;
    }
  }
  return null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err: any) {
    throw new Error(`Network request to ${url} failed: ${err.message}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    if (contentType.includes('application/json')) {
      try {
        const body = await res.json();
        errorMsg = body.error || errorMsg;
      } catch {
        // ignore json parse error on error response
      }
    } else {
      try {
        const text = await res.text();
        if (text && text.length < 200 && !text.includes('<!DOCTYPE')) {
          errorMsg = text;
        }
      } catch {
        // ignore
      }
    }
    throw new Error(errorMsg);
  }

  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Invalid response format from ${url} (received ${contentType || 'non-JSON'}). Server may still be starting.`);
  }

  return res.json();
}

export const api = {
  async getHealth() {
    return fetchJson<{
      status: string;
      database: { engine: string; isProductionReady: boolean };
      uptimeSeconds: number;
      activeDataset: { id: string; rowCount: number; columnCount: number; healthScore: number };
      memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
      hasGeminiApiKey: boolean;
    }>('/api/health');
  },

  async getDatasets(): Promise<{ activeId: string; datasets: DatasetMeta[] }> {
    return fetchJson<{ activeId: string; datasets: DatasetMeta[] }>('/api/datasets');
  },

  async selectDataset(id: string): Promise<{ success: boolean; meta: DatasetMeta }> {
    return fetchJson<{ success: boolean; meta: DatasetMeta }>('/api/datasets/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  },

  async uploadData(payload: {
    fileName?: string;
    fileContent?: string;
    fileType?: string;
    rawText?: string;
  }): Promise<{
    success: boolean;
    meta: DatasetMeta;
    profile: DataProfile;
    kpis: KpiMetric[];
    problems: BusinessProblem[];
  }> {
    return fetchJson('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async getProfile(): Promise<{ meta: DatasetMeta; profile: DataProfile }> {
    return fetchJson<{ meta: DatasetMeta; profile: DataProfile }>('/api/profile');
  },

  async getKpis(): Promise<{ kpis: KpiMetric[] }> {
    return fetchJson<{ kpis: KpiMetric[] }>('/api/kpis');
  },

  async getProblems(): Promise<{ problems: BusinessProblem[] }> {
    return fetchJson<{ problems: BusinessProblem[] }>('/api/problems');
  },

  async getDataSample(limit = 100): Promise<{ total: number; rows: Record<string, any>[] }> {
    return fetchJson<{ total: number; rows: Record<string, any>[] }>(`/api/data/sample?limit=${limit}`);
  },

  async analyzeWithAi(): Promise<{
    executiveSummary: string;
    keyDrivers: string[];
    riskFactors: string[];
    recommendations: AiRecommendation[];
    chartRecommendations: ChartRecommendation[];
  }> {
    return fetchJson('/api/ai/analyze', { method: 'POST' });
  },

  async askAi(question: string): Promise<{
    answer: string;
    evidenceData: any[];
    confidence: number;
    suggestedSql?: string;
  }> {
    return fetchJson('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
  },

  async aiNlToSql(question: string): Promise<{
    question: string;
    sql: string;
    explanation: string;
    recommendedChart: ChartRecommendation;
    result: SqlQueryResult;
  }> {
    return fetchJson('/api/ai/nl-to-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
  },

  async executeSql(query: string): Promise<SqlQueryResult> {
    return fetchJson<SqlQueryResult>('/api/sql/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
  },

  async getForecast(metric?: string, timeDimension?: string, periodsAhead = 4): Promise<{ forecast: ForecastPoint[] }> {
    return fetchJson<{ forecast: ForecastPoint[] }>('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric, timeDimension, periodsAhead })
    });
  },

  async calculateWhatIf(params: {
    priceChangePct: number;
    volumeChangePct: number;
    costChangePct: number;
    churnChangePct: number;
  }): Promise<WhatIfScenario> {
    return fetchJson<WhatIfScenario>('/api/what-if', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  },

  async getPowerBiMetadata(): Promise<{
    datasetName: string;
    endpointUrl: string;
    powerBiWebUrl: string;
    mCode: string;
    daxMeasures: { name: string; formula: string; description: string }[];
    instructions: string[];
  }> {
    return fetchJson('/api/powerbi/metadata');
  },

  async getLineage(): Promise<{ nodes: any[]; edges: any[] }> {
    return fetchJson<{ nodes: any[]; edges: any[] }>('/api/lineage');
  },

  async setSession(role: string, username?: string): Promise<UserSession> {
    return fetchJson<UserSession>('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, username })
    });
  },

  async getSystemLogs(): Promise<{ logs: any[] }> {
    return fetchJson<{ logs: any[] }>('/api/system/logs');
  }
};
