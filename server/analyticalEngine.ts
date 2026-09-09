import { ColumnMetadata } from './canonicalTypes.js';
import { ForecastPoint, WhatIfScenario } from '../src/types.js';

export interface AnomalyRecord {
  id: string;
  period?: string;
  metric: string;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  deviationPercentage: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  method: 'IQR' | 'Z_SCORE' | 'PERCENTAGE_DROP';
  reason: string;
  recordIdentifier?: string;
}

export class AnalyticalEngine {
  /**
   * Real What-If sensitivity modeling strictly calculated from dataset baselines
   */
  public calculateWhatIf(
    records: Record<string, any>[],
    columns: ColumnMetadata[],
    params: {
      priceChangePct: number;
      volumeChangePct: number;
      costChangePct: number;
      churnChangePct: number;
    }
  ): WhatIfScenario {
    if (!records || records.length === 0) {
      return {
        priceChangePct: params.priceChangePct,
        volumeChangePct: params.volumeChangePct,
        costChangePct: params.costChangePct,
        churnChangePct: params.churnChangePct,
        baselineRevenue: 0,
        baselineProfit: 0,
        baselineMarginPct: 0,
        projectedRevenue: 0,
        projectedProfit: 0,
        projectedMargin: 0,
        projectedMarginPct: 0,
        deltaRevenue: 0,
        deltaProfit: 0,
        revenueDeltaPct: 0,
        profitDeltaPct: 0
      };
    }

    const metricCols = columns.filter(c => c.isMetricCandidate);

    // 1. Identify genuine baseline revenue
    const revenueCol = metricCols.find(c => /revenue|sales|mrr|gross_sales|actual_spend|amount|total/i.test(c.name)) || metricCols[0];
    const costCol = metricCols.find(c => /cost|expense|cogs|operating_cost/i.test(c.name));
    const profitCol = metricCols.find(c => /profit|net_income/i.test(c.name));

    let baseRevenue = 0;
    if (revenueCol) {
      baseRevenue = records.reduce((sum, r) => {
        const val = Number(r[revenueCol.name]);
        return isNaN(val) ? sum : sum + val;
      }, 0);
    }

    let baseCost = 0;
    let baseProfit = 0;

    if (profitCol && costCol) {
      baseProfit = records.reduce((sum, r) => sum + (Number(r[profitCol.name]) || 0), 0);
      baseCost = records.reduce((sum, r) => sum + (Number(r[costCol.name]) || 0), 0);
    } else if (profitCol) {
      baseProfit = records.reduce((sum, r) => sum + (Number(r[profitCol.name]) || 0), 0);
      baseCost = Math.max(0, baseRevenue - baseProfit);
    } else if (costCol) {
      baseCost = records.reduce((sum, r) => sum + (Number(r[costCol.name]) || 0), 0);
      baseProfit = baseRevenue - baseCost;
    } else {
      // Derived from actual distribution without hardcoding arbitrary margins
      // If neither cost nor profit columns exist, default cost to 0 and model revenue sensitivity directly
      baseCost = 0;
      baseProfit = baseRevenue;
    }

    const baselineMarginPct = baseRevenue > 0 ? Number(((baseProfit / baseRevenue) * 100).toFixed(1)) : 0;

    // Apply sensitivity changes:
    // Effective revenue = baseRevenue * (1 + priceChange/100) * (1 + volumeChange/100) * (1 - churnChange/100)
    const priceFactor = 1 + params.priceChangePct / 100;
    const volumeFactor = 1 + params.volumeChangePct / 100;
    const retentionFactor = 1 - params.churnChangePct / 100;

    const projectedRevenue = Math.round(baseRevenue * priceFactor * volumeFactor * retentionFactor);
    const projectedCost = Math.round(baseCost * (1 + params.costChangePct / 100) * volumeFactor);
    const projectedProfit = projectedRevenue - projectedCost;
    const projectedMarginPct = projectedRevenue > 0 ? Number(((projectedProfit / projectedRevenue) * 100).toFixed(1)) : 0;

    const deltaRevenue = projectedRevenue - Math.round(baseRevenue);
    const deltaProfit = projectedProfit - Math.round(baseProfit);
    const revenueDeltaPct = baseRevenue > 0 ? Number(((deltaRevenue / baseRevenue) * 100).toFixed(1)) : 0;
    const profitDeltaPct = baseProfit !== 0 ? Number(((deltaProfit / Math.abs(baseProfit)) * 100).toFixed(1)) : 0;

    return {
      priceChangePct: params.priceChangePct,
      volumeChangePct: params.volumeChangePct,
      costChangePct: params.costChangePct,
      churnChangePct: params.churnChangePct,
      baselineRevenue: Math.round(baseRevenue),
      baselineProfit: Math.round(baseProfit),
      baselineMarginPct,
      projectedRevenue,
      projectedProfit,
      projectedMargin: projectedProfit,
      projectedMarginPct,
      deltaRevenue,
      deltaProfit,
      revenueDeltaPct,
      profitDeltaPct
    };
  }

  /**
   * Real historical data time-series forecasting with trend regression & error bounds
   */
  public generateForecast(
    records: Record<string, any>[],
    columns: ColumnMetadata[],
    targetMetric?: string,
    timeDimension?: string,
    periodsAhead = 4
  ): ForecastPoint[] {
    if (!records || records.length < 3 || !columns || columns.length === 0) return [];

    // Find requested metric or best candidate
    const metricCol = (targetMetric ? columns.find(c => c.name === targetMetric) : undefined)
      || columns.find(c => /revenue|sales|mrr|arr|spend|profit|orders|amount|total|value|cost/i.test(c.name))
      || columns.find(c => c.isMetricCandidate)
      || columns.find(c => c.type === 'integer' || c.type === 'float' || c.type === 'currency' || c.type === 'percentage')
      || columns.find(c => c.name !== timeDimension);

    // Find requested time dimension or best candidate
    const timeCol = (timeDimension ? columns.find(c => c.name === timeDimension) : undefined)
      || columns.find(c => c.isTimeCandidate)
      || columns.find(c => /date|time|month|year|period|day|quarter|week/i.test(c.name))
      || columns.find(c => c.isDimensionCandidate)
      || columns[0];

    if (!metricCol || !timeCol) return [];

    try {
      const map = new Map<string, number>();
      for (const r of records) {
        const p = String(r[timeCol.name] ?? '').trim();
        const rawV = r[metricCol.name];
        let v = 0;
        if (typeof rawV === 'number') {
          v = isNaN(rawV) ? 0 : rawV;
        } else if (typeof rawV === 'string') {
          const clean = rawV.replace(/[\$,]/g, '').trim();
          const parsed = parseFloat(clean);
          v = isNaN(parsed) ? 0 : parsed;
        }
        if (p && !isNaN(v)) {
          map.set(p, (map.get(p) || 0) + v);
        }
      }
      const historical = Array.from(map.entries())
        .map(([period, val]) => ({ period, val }))
        .sort((a, b) => a.period.localeCompare(b.period));

      if (historical.length < 2) return [];

      const n = historical.length;
      const xVals = Array.from({ length: n }, (_, i) => i);
      const yVals = historical.map(h => h.val);

      // Ordinary Least Squares (OLS) Linear Trend
      const sumX = xVals.reduce((a, b) => a + b, 0);
      const sumY = yVals.reduce((a, b) => a + b, 0);
      const sumXY = xVals.reduce((acc, curr, idx) => acc + curr * yVals[idx], 0);
      const sumXX = xVals.reduce((acc, curr) => acc + curr * curr, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
      const intercept = (sumY - slope * sumX) / n;

      // Residual standard error for confidence intervals
      const residuals = yVals.map((y, i) => y - (intercept + slope * i));
      const variance = residuals.reduce((acc, r) => acc + r * r, 0) / (n > 2 ? n - 2 : 1);
      const stdError = Math.sqrt(variance);

      const result: ForecastPoint[] = [];

      // Historical actual points
      historical.forEach((h, idx) => {
        const fitted = Math.round(intercept + slope * idx);
        result.push({
          period: String(h.period),
          actual: Math.round(h.val),
          forecast: Math.round(h.val),
          lowerBound: Math.max(0, Math.round(h.val - 1.96 * stdError)),
          upperBound: Math.round(h.val + 1.96 * stdError),
          isProjected: false
        });
      });

      // Extrapolate future periods
      const lastPeriodStr = String(historical[historical.length - 1].period);
      for (let step = 1; step <= periodsAhead; step++) {
        const futureX = n - 1 + step;
        const projectedVal = Math.max(0, Math.round(intercept + slope * futureX));
        const uncertaintyMultiplier = Math.sqrt(1 + 1 / n + Math.pow(futureX - sumX / n, 2) / (sumXX - (sumX * sumX) / n || 1));
        const marginOfError = 1.96 * stdError * uncertaintyMultiplier;

        const nextPeriodLabel = this.generateNextPeriodLabel(lastPeriodStr, step);
        result.push({
          period: nextPeriodLabel,
          actual: null,
          projected: projectedVal,
          forecast: projectedVal,
          lowerBound: Math.max(0, Math.round(projectedVal - marginOfError)),
          upperBound: Math.round(projectedVal + marginOfError),
          isProjected: true
        });
      }

      return result;
    } catch (err) {
      console.warn('Forecasting error:', err);
      return [];
    }
  }

  /**
   * Detect genuine anomalies using IQR and Z-Score statistics
   */
  public detectAnomalies(records: Record<string, any>[], columns: ColumnMetadata[], targetMetric?: string): AnomalyRecord[] {
    if (!records || records.length === 0) return [];

    const anomalies: AnomalyRecord[] = [];
    const metricCols = targetMetric
      ? columns.filter(c => c.name === targetMetric)
      : columns.filter(c => c.isMetricCandidate && c.stats);

    const timeCol = columns.find(c => c.isTimeCandidate);

    for (const col of metricCols) {
      if (!col.stats) continue;
      const { mean = 0, stdDev = 1, q1 = 0, q3 = 0, iqr = 0 } = col.stats;

      records.forEach((row, idx) => {
        const val = Number(row[col.name]);
        if (isNaN(val)) return;

        // Check IQR Outliers
        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;
        const isIqrOutlier = val < lowerFence || val > upperFence;

        // Check Z-Score (|Z| >= 2.5)
        const zScore = stdDev > 0 ? (val - mean) / stdDev : 0;
        const isZOutlier = Math.abs(zScore) >= 2.5;

        if (isIqrOutlier || isZOutlier) {
          const dev = val - mean;
          const devPct = mean !== 0 ? Number(((dev / mean) * 100).toFixed(1)) : 0;

          anomalies.push({
            id: `anom-${col.name}-${idx}`,
            period: timeCol && row[timeCol.name] ? String(row[timeCol.name]) : undefined,
            metric: col.name,
            actualValue: val,
            expectedValue: Number(mean.toFixed(2)),
            deviation: Number(dev.toFixed(2)),
            deviationPercentage: devPct,
            severity: Math.abs(zScore) >= 3.0 ? 'CRITICAL' : 'WARNING',
            method: isZOutlier ? 'Z_SCORE' : 'IQR',
            reason: `Value of ${val} deviates by ${devPct > 0 ? '+' : ''}${devPct}% from mean of ${mean.toFixed(1)} (Z-score: ${zScore.toFixed(2)})`,
            recordIdentifier: row['id'] || row['order_id'] || `Row #${idx + 1}`
          });
        }
      });
    }

    return anomalies.slice(0, 30);
  }

  private generateNextPeriodLabel(lastPeriod: string, step: number): string {
    // Check YYYY-MM format
    const ymMatch = lastPeriod.match(/^(\d{4})-(\d{2})$/);
    if (ymMatch) {
      let year = parseInt(ymMatch[1], 10);
      let month = parseInt(ymMatch[2], 10) + step;
      while (month > 12) {
        month -= 12;
        year += 1;
      }
      return `${year}-${String(month).padStart(2, '0')} (Proj)`;
    }

    // Check Quarter Q1 2024 / 2024-Q1
    const qMatch = lastPeriod.match(/Q([1-4])\s*(\d{4})/i) || lastPeriod.match(/(\d{4})-?Q([1-4])/i);
    if (qMatch) {
      return `+${step} Period (Proj)`;
    }

    return `+${step} Period (Proj)`;
  }
}

export const analyticalEngine = new AnalyticalEngine();
