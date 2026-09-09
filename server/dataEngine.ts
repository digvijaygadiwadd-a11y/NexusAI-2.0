import { ColumnSchema, DataProfile, KpiMetric, BusinessProblem, ForecastPoint, WhatIfScenario, SqlQueryResult } from '../src/types.js';
import { dataProfiler } from './dataProfiler.js';
import { kpiEngine } from './kpiEngine.js';
import { analyticalEngine } from './analyticalEngine.js';
import { sqlSecurityService } from './sqlSecurityService.js';
import { databaseService } from './database.js';

export class DataEngine {
  private currentRecords: Record<string, any>[] = [];
  private currentTableName: string = 'uploaded_data';
  private currentDatasetId: string = 'active_dataset';

  constructor() {}

  public loadRecords(records: Record<string, any>[], tableName = 'uploaded_data', datasetId = 'active_dataset') {
    this.currentRecords = records;
    this.currentTableName = tableName;
    this.currentDatasetId = datasetId;
  }

  public getRecords(): Record<string, any>[] {
    return this.currentRecords;
  }

  public getDatasetId(): string {
    return this.currentDatasetId;
  }

  // Schema Detection & Comprehensive Data Profiling
  public profileData(): DataProfile {
    const canonicalProfile = dataProfiler.profile(this.currentRecords, this.currentDatasetId);
    return {
      totalRows: canonicalProfile.totalRows,
      totalColumns: canonicalProfile.totalColumns,
      duplicateRows: canonicalProfile.duplicateRows,
      totalMissingCells: canonicalProfile.totalMissingCells,
      healthScore: canonicalProfile.healthScore,
      columns: canonicalProfile.columns as ColumnSchema[],
      dataQualityIssues: canonicalProfile.dataQualityIssues
    };
  }

  // Dynamic KPI Generation strictly from active dataset
  public generateKpis(): KpiMetric[] {
    const profile = this.profileData();
    const canonicalKpis = kpiEngine.generateKpis(this.currentRecords, profile.columns as any, this.currentDatasetId);

    return canonicalKpis.map(k => ({
      id: k.id,
      title: k.title,
      value: k.value,
      formattedValue: k.formattedValue,
      unit: k.unit,
      changePercentage: k.changePercentage,
      trend: k.trend,
      trendDelta: k.changePercentage !== undefined ? `${k.changePercentage > 0 ? '+' : ''}${k.changePercentage}%` : undefined,
      column: k.sourceColumns[0],
      calculationDescription: k.calculationDescription,
      confidence: k.confidence,
      category: k.category as any
    }));
  }

  // Dynamic Empirical Business Problem Detection
  public detectBusinessProblems(): BusinessProblem[] {
    const profile = this.profileData();
    const canonicalProblems = kpiEngine.detectProblems(this.currentRecords, profile.columns as any, this.currentDatasetId);

    return canonicalProblems.map(p => ({
      id: p.id,
      title: p.title,
      severity: p.severity as any,
      metric: p.metric,
      impactScore: p.impactScore,
      currentValue: p.currentValue,
      benchmarkValue: p.benchmarkValue,
      description: p.description,
      evidence: p.evidence,
      suggestedAction: p.suggestedAction,
      recommendedAction: p.recommendedAction,
      potentialUpside: p.potentialUpside
    }));
  }

  // What-If Sensitivity Simulator with zero hardcoded margins
  public calculateWhatIf(params: {
    priceChangePct: number;
    volumeChangePct: number;
    costChangePct: number;
    churnChangePct: number;
  }): WhatIfScenario {
    const profile = this.profileData();
    return analyticalEngine.calculateWhatIf(this.currentRecords, profile.columns as any, params);
  }

  // Time-Series Forecasting strictly from historical periods
  public generateForecast(metricName?: string, timeDimension?: string, periodsAhead = 4): ForecastPoint[] {
    const profile = this.profileData();
    return analyticalEngine.generateForecast(this.currentRecords, profile.columns as any, metricName, timeDimension, periodsAhead);
  }

  // Empirical Anomaly Detection
  public detectAnomalies(metricName?: string) {
    const profile = this.profileData();
    return analyticalEngine.detectAnomalies(this.currentRecords, profile.columns as any, metricName);
  }

  // Secure SQL Query Execution with AST validation
  public async executeSql(query: string, userId?: string): Promise<SqlQueryResult> {
    const res = await sqlSecurityService.executeSecureQuery(query, { userId });
    return {
      columns: res.columns,
      rows: res.rows,
      executionTimeMs: res.executionTimeMs,
      rowCount: res.rowCount,
      query: res.query,
      error: res.error
    };
  }
}

export const dataEngine = new DataEngine();
