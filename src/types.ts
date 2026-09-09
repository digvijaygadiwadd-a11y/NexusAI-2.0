export type DataType = 'integer' | 'float' | 'currency' | 'percentage' | 'date' | 'categorical' | 'text' | 'boolean' | 'id';

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'histogram';

export interface ColumnSchema {
  name: string;
  type: DataType;
  nullable: boolean;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  sampleValues: (string | number | boolean)[];
  isMetricCandidate: boolean;
  isDimensionCandidate: boolean;
  isTimeCandidate: boolean;
  stats?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    stdDev?: number;
    q1?: number;
    q3?: number;
    iqr?: number;
    outlierCount?: number;
  };
}

export interface DataProfile {
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  totalMissingCells: number;
  healthScore: number; // 0 - 100
  columns: ColumnSchema[];
  dataQualityIssues: {
    column?: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }[];
}

export interface KpiMetric {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  unit: string;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendDelta?: string;
  column?: string;
  aggregation?: string;
  dimension?: string;
  calculationDescription?: string;
  confidence?: number;
  category: 'financial' | 'operational' | 'customer' | 'volume' | string;
}

export interface BusinessProblem {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'critical' | 'warning' | 'info';
  category?: string;
  metric?: string;
  impactScore: number | string; // 0 - 100 or formatted string
  currentValue?: string;
  benchmarkValue?: string;
  description: string;
  evidence: any[];
  suggestedAction?: string;
  recommendedAction?: string;
  potentialUpside?: string;
}

export interface AiRecommendation {
  id: string;
  title: string;
  strategicArea: 'Revenue Optimization' | 'Cost Reduction' | 'Retention & Churn' | 'Inventory & Operations' | 'Product Mix' | string;
  summary: string;
  evidencePoints: string[];
  impactEstimate: string;
  effortLevel: 'Low' | 'Medium' | 'High' | string;
  priority: 'Immediate' | 'Short-Term' | 'Strategic' | string;
  suggestedSql?: string;
}

export interface ChartRecommendation {
  chartType: ChartType;
  title: string;
  xAxis: string;
  yAxis: string;
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  reasoning: string;
}

export interface ForecastPoint {
  period: string;
  actual?: number | null;
  projected?: number;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  isProjected?: boolean;
}

export interface WhatIfScenario {
  priceChangePct: number;
  volumeChangePct: number;
  costChangePct: number;
  churnChangePct: number;
  baselineRevenue?: number;
  baselineProfit?: number;
  baselineMarginPct?: number;
  projectedRevenue: number;
  projectedProfit: number;
  projectedMargin?: number;
  projectedMarginPct?: number;
  deltaRevenue?: number;
  deltaProfit?: number;
  revenueDeltaPct?: number;
  profitDeltaPct?: number;
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  executionTimeMs: number;
  rowCount: number;
  query: string;
  error?: string;
}

export type UserRole = 'Admin' | 'Analyst' | 'Manager';

export interface UserSession {
  username: string;
  role: UserRole;
  token: string;
  permissions: {
    canUpload: boolean;
    canRunRawSql: boolean;
    canChangeParameters: boolean;
    canExportReports: boolean;
    canViewLineage: boolean;
  };
}

export interface DatasetMeta {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  sourceType: 'csv' | 'xlsx' | 'json' | 'sql' | 'preset' | 'api';
  uploadedAt: string;
  tableName: string;
}
