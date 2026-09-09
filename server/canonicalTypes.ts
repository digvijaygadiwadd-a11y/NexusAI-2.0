export type CanonicalDataType =
  | 'integer'
  | 'float'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'categorical'
  | 'text'
  | 'boolean'
  | 'id';

export interface ColumnMetadata {
  name: string;
  type: CanonicalDataType;
  nullable: boolean;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  isConstant: boolean;
  isHighCardinality: boolean;
  invalidDatesCount: number;
  invalidNumericCount: number;
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
  distribution?: { value: string; count: number; percentage: number }[];
}

export interface DatasetSchema {
  datasetId: string;
  tableName: string;
  columnCount: number;
  columns: ColumnMetadata[];
}

export interface DataProfile {
  datasetId: string;
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  totalMissingCells: number;
  overallMissingPercentage: number;
  healthScore: number; // 0 - 100
  columns: ColumnMetadata[];
  constantColumns: string[];
  highCardinalityColumns: string[];
  dataQualityIssues: {
    column?: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'csv' | 'xlsx' | 'json' | 'sql' | 'postgres' | 'mysql' | 'preset';
  connectionUri?: string;
  createdAt: string;
}

export interface Dataset {
  id: string;
  sourceId?: string;
  name: string;
  description?: string;
  rowCount: number;
  columnCount: number;
  sourceType: 'csv' | 'xlsx' | 'json' | 'sql' | 'postgres' | 'mysql' | 'preset';
  tableName: string;
  createdAt: string;
  updatedAt: string;
}

export interface KPIResult {
  id: string;
  datasetId: string;
  title: string;
  value: number;
  formattedValue: string;
  unit: string;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  calculationDescription: string;
  sourceColumns: string[];
  confidence: number;
  category: 'financial' | 'operational' | 'customer' | 'volume' | string;
}

export interface Evidence {
  id: string;
  datasetId: string;
  metricName: string;
  dataPoint: string | number;
  context?: string;
  sourceColumns: string[];
  calculation?: string;
}

export interface BusinessProblem {
  id: string;
  datasetId: string;
  title: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  metric: string;
  impactScore: number;
  currentValue: string;
  benchmarkValue: string;
  description: string;
  evidence: Evidence[];
  suggestedAction: string;
  recommendedAction: string;
  potentialUpside: string;
  sourceColumns: string[];
}

export interface StandardEvidencePackage {
  metric: string;
  value: number | string;
  comparison?: number | string;
  change?: number | string;
  change_percent?: number;
  dataset_id: string;
  source_columns: string[];
  sql?: string;
  calculation?: string;
  evidence_ids?: string[];
}

export interface EvidenceBackedRecommendation {
  id: string;
  datasetId: string;
  title: string;
  recommendation: string;
  reason: string;
  strategicArea: string;
  metric: string;
  actualValue: string | number;
  comparisonValue: string | number;
  percentageChange: number;
  sourceColumns: string[];
  calculation: string;
  confidence: number;
  effortLevel: 'Low' | 'Medium' | 'High';
  priority: 'Immediate' | 'Short-Term' | 'Strategic';
  suggestedSql: string;
  evidence?: StandardEvidencePackage | string | Evidence[];
}

export interface AnalysisResult {
  id: string;
  datasetId: string;
  datasetName: string;
  executiveSummary: string;
  keyDrivers: string[];
  riskFactors: string[];
  recommendations: EvidenceBackedRecommendation[];
  chartRecommendations: {
    chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'histogram';
    title: string;
    xAxis: string;
    yAxis: string;
    aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
    reasoning: string;
    sourceColumns: string[];
  }[];
  createdAt: string;
}

export interface DatasetJob {
  id: string;
  datasetId?: string;
  fileName: string;
  jobType: 'ingest' | 'profile' | 'kpi_generation' | 'ai_analysis';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}
