import { ColumnMetadata, KPIResult, BusinessProblem, Evidence, EvidenceBackedRecommendation } from './canonicalTypes.js';

export class KpiEngine {
  /**
   * Dynamically detect metrics and calculate genuine KPIs from actual records
   */
  public generateKpis(records: Record<string, any>[], columns: ColumnMetadata[], datasetId: string): KPIResult[] {
    if (!records || records.length === 0 || !columns || columns.length === 0) {
      return [];
    }

    const kpis: KPIResult[] = [];
    const metricCols = columns.filter(c => c.isMetricCandidate && c.stats);
    const timeCol = columns.find(c => c.isTimeCandidate);

    // 1. Core Record Volume / Count
    kpis.push({
      id: `kpi-volume-${datasetId}`,
      datasetId,
      title: 'Total Records / Observations',
      value: records.length,
      formattedValue: records.length.toLocaleString(),
      unit: 'records',
      trend: 'neutral',
      calculationDescription: 'COUNT(*) across active dataset records',
      sourceColumns: [columns[0]?.name || 'id'],
      confidence: 1.0,
      category: 'volume'
    });

    // 2. Financial Metrics: Revenue / Sales / Spend / Gross Amount
    const revenueCol = metricCols.find(c => /revenue|sales|mrr|gross_sales|actual_spend|budget|amount|total_price/i.test(c.name));
    if (revenueCol && revenueCol.stats) {
      const sumVal = this.sumColumn(records, revenueCol.name);
      const isCurrency = revenueCol.type === 'currency' || /usd|dollar|price|cost|revenue|sales|mrr|spend/i.test(revenueCol.name);

      let changePercentage: number | undefined = undefined;
      let trend: 'up' | 'down' | 'neutral' = 'neutral';

      if (timeCol) {
        const trendCalc = this.calculateTimeTrend(records, revenueCol.name, timeCol.name);
        if (trendCalc) {
          changePercentage = trendCalc.changePct;
          trend = trendCalc.changePct > 0 ? 'up' : trendCalc.changePct < 0 ? 'down' : 'neutral';
        }
      }

      kpis.push({
        id: `kpi-rev-${revenueCol.name}`,
        datasetId,
        title: `Total ${this.formatLabel(revenueCol.name)}`,
        value: Math.round(sumVal),
        formattedValue: isCurrency ? `$${Math.round(sumVal).toLocaleString()}` : sumVal.toLocaleString(),
        unit: isCurrency ? 'USD' : 'units',
        changePercentage,
        trend,
        calculationDescription: `SUM(${revenueCol.name}) over ${records.length} records`,
        sourceColumns: [revenueCol.name, ...(timeCol ? [timeCol.name] : [])],
        confidence: 0.98,
        category: 'financial'
      });

      // Average Order / Transaction Value
      const avgVal = revenueCol.stats.mean || 0;
      kpis.push({
        id: `kpi-avg-${revenueCol.name}`,
        datasetId,
        title: `Average ${this.formatLabel(revenueCol.name)}`,
        value: Number(avgVal.toFixed(2)),
        formattedValue: isCurrency ? `$${avgVal.toFixed(2)}` : avgVal.toFixed(2),
        unit: isCurrency ? 'USD' : 'units',
        trend: 'neutral',
        calculationDescription: `AVG(${revenueCol.name}) per transaction line`,
        sourceColumns: [revenueCol.name],
        confidence: 0.95,
        category: 'financial'
      });
    }

    // 3. Operational Costs
    const costCol = metricCols.find(c => /cost|expense|cogs|operating_cost|spend/i.test(c.name) && c.name !== revenueCol?.name);
    if (costCol && costCol.stats) {
      const totalCost = this.sumColumn(records, costCol.name);
      kpis.push({
        id: `kpi-cost-${costCol.name}`,
        datasetId,
        title: `Total ${this.formatLabel(costCol.name)}`,
        value: Math.round(totalCost),
        formattedValue: `$${Math.round(totalCost).toLocaleString()}`,
        unit: 'USD',
        trend: 'neutral',
        calculationDescription: `SUM(${costCol.name})`,
        sourceColumns: [costCol.name],
        confidence: 0.96,
        category: 'financial'
      });
    }

    // 4. Net Profit & Margin
    const profitCol = metricCols.find(c => /profit|net_income|margin_usd/i.test(c.name));
    if (profitCol && profitCol.stats && revenueCol) {
      const totalProfit = this.sumColumn(records, profitCol.name);
      const totalRev = this.sumColumn(records, revenueCol.name);
      const marginPct = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

      kpis.push({
        id: `kpi-profit-margin`,
        datasetId,
        title: 'Net Profit Margin',
        value: Number(marginPct.toFixed(1)),
        formattedValue: `${marginPct.toFixed(1)}%`,
        unit: '%',
        trend: marginPct >= 15 ? 'up' : marginPct < 5 ? 'down' : 'neutral',
        calculationDescription: `(SUM(${profitCol.name}) / SUM(${revenueCol.name})) * 100`,
        sourceColumns: [profitCol.name, revenueCol.name],
        confidence: 0.97,
        category: 'financial'
      });
    } else if (revenueCol && costCol) {
      // Derive profit and margin if cost and revenue exist
      const totalRev = this.sumColumn(records, revenueCol.name);
      const totalCost = this.sumColumn(records, costCol.name);
      const derivedProfit = totalRev - totalCost;
      const marginPct = totalRev > 0 ? (derivedProfit / totalRev) * 100 : 0;

      kpis.push({
        id: `kpi-derived-margin`,
        datasetId,
        title: 'Operating Margin',
        value: Number(marginPct.toFixed(1)),
        formattedValue: `${marginPct.toFixed(1)}%`,
        unit: '%',
        trend: marginPct >= 15 ? 'up' : marginPct < 5 ? 'down' : 'neutral',
        calculationDescription: `((SUM(${revenueCol.name}) - SUM(${costCol.name})) / SUM(${revenueCol.name})) * 100`,
        sourceColumns: [revenueCol.name, costCol.name],
        confidence: 0.94,
        category: 'financial'
      });
    }

    // 5. Volume / Units Sold / Quantities
    const qtyCol = metricCols.find(c => /quantity|units|orders|volume|qty|items_sold/i.test(c.name));
    if (qtyCol && qtyCol.stats) {
      const totalQty = this.sumColumn(records, qtyCol.name);
      kpis.push({
        id: `kpi-qty-${qtyCol.name}`,
        datasetId,
        title: `Total ${this.formatLabel(qtyCol.name)}`,
        value: Math.round(totalQty),
        formattedValue: Math.round(totalQty).toLocaleString(),
        unit: 'units',
        trend: 'neutral',
        calculationDescription: `SUM(${qtyCol.name})`,
        sourceColumns: [qtyCol.name],
        confidence: 0.98,
        category: 'operational'
      });
    }

    // 6. Distinct Entities (Customers, Clients, Accounts, SKUs)
    const entityCol = columns.find(c => c.type === 'id' || /customer|client|account|user|patient|student|sku/i.test(c.name));
    if (entityCol) {
      const uCount = entityCol.uniqueCount ?? 0;
      kpis.push({
        id: `kpi-entities-${entityCol.name}`,
        datasetId,
        title: `Unique ${this.formatLabel(entityCol.name)}s`,
        value: uCount,
        formattedValue: (uCount != null ? Number(uCount).toLocaleString() : '0'),
        unit: 'entities',
        trend: 'neutral',
        calculationDescription: `COUNT(DISTINCT ${entityCol.name})`,
        sourceColumns: [entityCol.name],
        confidence: 0.99,
        category: 'customer'
      });
    }

    return kpis;
  }

  /**
   * Detect empirical business problems from actual dataset observations
   */
  public detectProblems(records: Record<string, any>[], columns: ColumnMetadata[], datasetId: string): BusinessProblem[] {
    if (!records || records.length === 0 || !columns || columns.length === 0) {
      return [];
    }

    const problems: BusinessProblem[] = [];
    const metricCols = columns.filter(c => c.isMetricCandidate);
    const timeCol = columns.find(c => c.isTimeCandidate);
    const catCol = columns.find(c => c.isDimensionCandidate && !c.isTimeCandidate);

    // Rule 1: Churn / Incident / Attrition Spikes
    const churnCol = metricCols.find(c => /churn|churned|ticket|incident|defect|error|stockout/i.test(c.name));
    if (churnCol && timeCol) {
      try {
        const timeSeries = this.aggregateTimeSeries(records, timeCol.name, churnCol.name);
        if (timeSeries.length >= 2) {
          const maxPoint = [...timeSeries].sort((a, b) => b.total_issue - a.total_issue)[0];
          const avgIssue = timeSeries.reduce((a, b) => a + b.total_issue, 0) / timeSeries.length;

          if (maxPoint.total_issue > avgIssue * 1.35) {
            const variancePct = Number(((maxPoint.total_issue / avgIssue - 1) * 100).toFixed(1));
            problems.push({
              id: `prob-spike-${churnCol.name}`,
              datasetId,
              title: `Elevated ${this.formatLabel(churnCol.name)} in Period ${maxPoint.period}`,
              severity: variancePct > 50 ? 'CRITICAL' : 'WARNING',
              metric: churnCol.name,
              impactScore: Math.min(95, 60 + Math.round(variancePct / 2)),
              currentValue: `${Number(maxPoint.total_issue || 0).toLocaleString()} in ${maxPoint.period}`,
              benchmarkValue: `${avgIssue.toFixed(1)} average across periods`,
              description: `Observed a ${variancePct}% spike above historical average in ${churnCol.name} during ${maxPoint.period}.`,
              evidence: [
                {
                  id: `ev-1-${churnCol.name}`,
                  datasetId,
                  metricName: 'Peak Period Value',
                  dataPoint: maxPoint.total_issue,
                  context: `Observed in ${maxPoint.period}`,
                  sourceColumns: [churnCol.name, timeCol.name],
                  calculation: `SUM(${churnCol.name}) GROUP BY ${timeCol.name}`
                },
                {
                  id: `ev-2-${churnCol.name}`,
                  datasetId,
                  metricName: 'Historical Average',
                  dataPoint: Number(avgIssue.toFixed(1)),
                  context: `Baseline over ${timeSeries.length} periods`,
                  sourceColumns: [churnCol.name, timeCol.name],
                  calculation: `AVG(period_totals)`
                }
              ],
              suggestedAction: `Audit operational factors and customer cohorts active during ${maxPoint.period} to contain attrition.`,
              recommendedAction: `Deploy targeted intervention protocols for segments active in ${maxPoint.period}.`,
              potentialUpside: `Restoring ${churnCol.name} to baseline average prevents ${(maxPoint.total_issue - avgIssue).toFixed(0)} surplus incidents.`,
              sourceColumns: [churnCol.name, timeCol.name]
            });
          }
        }
      } catch (e) {
        console.warn('Problem detection rule 1 error:', e);
      }
    }

    // Rule 2: Unprofitable Segments / Negative Net Profit
    const profitCol = metricCols.find(c => /profit|net_income|margin_usd/i.test(c.name));
    if (profitCol && catCol) {
      try {
        const unprofitable = this.aggregateSegments(records, catCol.name, profitCol.name).filter(s => s.total_profit < 0);

        for (const item of unprofitable) {
          problems.push({
            id: `prob-unprofitable-${item.segment}`,
            datasetId,
            title: `Negative Profit Contribution in "${item.segment}"`,
            severity: 'CRITICAL',
            metric: profitCol.name,
            impactScore: 84,
            currentValue: `-$${Math.abs(item.total_profit).toLocaleString()}`,
            benchmarkValue: 'Positive net profit (> $0)',
            description: `Segment "${item.segment}" generated net losses of -$${Math.abs(item.total_profit).toLocaleString()} across ${item.cnt} records.`,
            evidence: [
              {
                id: `ev-profit-${item.segment}`,
                datasetId,
                metricName: 'Net Deficit',
                dataPoint: `-$${Math.abs(item.total_profit).toLocaleString()}`,
                context: `Segment: ${item.segment}`,
                sourceColumns: [profitCol.name, catCol.name],
                calculation: `SUM(${profitCol.name}) WHERE ${catCol.name} = '${item.segment}'`
              }
            ],
            suggestedAction: `Audit fulfillment costs and pricing structures for ${item.segment}.`,
            recommendedAction: `Rebalance pricing discount caps or sunset negative-margin offerings in ${item.segment}.`,
            potentialUpside: `Recovering margin to break-even immediately unlocks $${Math.abs(item.total_profit).toLocaleString()} in cash flow.`,
            sourceColumns: [profitCol.name, catCol.name]
          });
        }
      } catch (e) {
        console.warn('Problem detection rule 2 error:', e);
      }
    }

    // Rule 3: Budget Overspend / Negative Variance
    const varianceCol = metricCols.find(c => /variance|actual_spend/i.test(c.name));
    const budgetCol = metricCols.find(c => /budget/i.test(c.name));
    if (varianceCol && budgetCol && catCol) {
      try {
        const overspends = this.aggregateBudget(records, catCol.name, varianceCol.name, budgetCol.name)
          .filter(d => d.total_var > 0)
          .sort((a, b) => b.total_var - a.total_var);
        if (overspends.length > 0) {
          const top = overspends[0];
          problems.push({
            id: `prob-overspend-${top.dept}`,
            datasetId,
            title: `Budget Overrun in ${top.dept}`,
            severity: 'CRITICAL',
            metric: varianceCol.name,
            impactScore: 82,
            currentValue: `+$${Math.round(top.total_var).toLocaleString()} overspend`,
            benchmarkValue: '$0 Budget Variance',
            description: `${top.dept} exceeded budget allocation by $${Math.round(top.total_var).toLocaleString()} (${((top.total_var / (top.total_bud || 1)) * 100).toFixed(1)}% above plan).`,
            evidence: [
              {
                id: `ev-var-${top.dept}`,
                datasetId,
                metricName: 'Overrun Amount',
                dataPoint: `$${Math.round(top.total_var).toLocaleString()}`,
                context: top.dept,
                sourceColumns: [varianceCol.name, budgetCol.name, catCol.name],
                calculation: `SUM(${varianceCol.name})`
              }
            ],
            suggestedAction: `Place discretionary spending controls on ${top.dept}.`,
            recommendedAction: `Enforce procurement review for non-essential expenditures in ${top.dept}.`,
            potentialUpside: `Eliminating variance preserves $${Math.round(top.total_var).toLocaleString()} in working capital.`,
            sourceColumns: [varianceCol.name, budgetCol.name, catCol.name]
          });
        }
      } catch (e) {
        console.warn('Problem detection rule 3 error:', e);
      }
    }

    return problems;
  }

  /**
   * Generate evidence-grounded strategic recommendations based strictly on dataset facts
   */
  public generateRecommendations(
    records: Record<string, any>[],
    kpis: KPIResult[],
    problems: BusinessProblem[],
    datasetId: string
  ): EvidenceBackedRecommendation[] {
    const recommendations: EvidenceBackedRecommendation[] = [];

    // Derive recommendations directly from detected problems with real evidence
    problems.forEach((prob, idx) => {
      const firstEvidence = prob.evidence[0];
      recommendations.push({
        id: `rec-grounded-${idx + 1}`,
        datasetId,
        title: `Address ${prob.title}`,
        recommendation: prob.recommendedAction,
        reason: prob.description,
        strategicArea: prob.metric?.includes('profit') || prob.metric?.includes('cost') ? 'Cost Reduction' : 'Operational Efficiency',
        metric: prob.metric || 'core_metric',
        actualValue: prob.currentValue,
        comparisonValue: prob.benchmarkValue,
        percentageChange: 0,
        sourceColumns: prob.sourceColumns,
        calculation: firstEvidence?.calculation || `Analysis of ${prob.sourceColumns.join(', ')}`,
        confidence: 0.95,
        effortLevel: idx === 0 ? 'Medium' : 'Low',
        priority: prob.severity === 'CRITICAL' ? 'Immediate' : 'Short-Term',
        suggestedSql: `SELECT ${prob.sourceColumns.join(', ')} FROM uploaded_data LIMIT 25`
      });
    });

    // If no critical problems detected, generate optimization recommendation from top metric distribution
    if (recommendations.length === 0 && kpis.length > 0) {
      const mainKpi = kpis[1] || kpis[0];
      recommendations.push({
        id: `rec-optimization-1`,
        datasetId,
        title: `Optimize ${mainKpi.title} Performance Trajectory`,
        recommendation: `Conduct quarterly performance reviews focusing on high-performing segments contributing to ${mainKpi.title}.`,
        reason: `Current baseline for ${mainKpi.title} stands at ${mainKpi.formattedValue}.`,
        strategicArea: 'Revenue Optimization',
        metric: mainKpi.sourceColumns[0] || 'primary_metric',
        actualValue: mainKpi.formattedValue,
        comparisonValue: 'Historical baseline',
        percentageChange: mainKpi.changePercentage || 0,
        sourceColumns: mainKpi.sourceColumns,
        calculation: mainKpi.calculationDescription,
        confidence: 0.92,
        effortLevel: 'Low',
        priority: 'Strategic',
        suggestedSql: `SELECT ${mainKpi.sourceColumns.join(', ')} FROM uploaded_data LIMIT 15`
      });
    }

    return recommendations;
  }

  private sumColumn(records: Record<string, any>[], colName: string): number {
    return records.reduce((acc, row) => {
      const val = Number(row[colName]);
      return isNaN(val) ? acc : acc + val;
    }, 0);
  }

  private calculateTimeTrend(records: Record<string, any>[], metricCol: string, timeCol: string): { changePct: number } | null {
    try {
      const series = this.aggregateTimeSeries(records, timeCol, metricCol);
      if (series.length >= 2) {
        const last = series[series.length - 1].total_issue;
        const prev = series[series.length - 2].total_issue;
        if (prev > 0) {
          const changePct = Number((((last - prev) / prev) * 100).toFixed(1));
          return { changePct };
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private aggregateTimeSeries(records: Record<string, any>[], timeCol: string, metricCol: string): { period: string; total_issue: number }[] {
    const map = new Map<string, number>();
    for (const r of records) {
      const p = String(r[timeCol] ?? '').trim();
      const v = Number(r[metricCol]);
      if (p && !isNaN(v)) {
        map.set(p, (map.get(p) || 0) + v);
      }
    }
    return Array.from(map.entries())
      .map(([period, total_issue]) => ({ period, total_issue }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private aggregateSegments(records: Record<string, any>[], dimCol: string, metricCol: string): { segment: string; total_profit: number; cnt: number }[] {
    const map = new Map<string, { total: number; cnt: number }>();
    for (const r of records) {
      const s = String(r[dimCol] ?? '').trim();
      const v = Number(r[metricCol]);
      if (s) {
        const cur = map.get(s) || { total: 0, cnt: 0 };
        cur.cnt += 1;
        if (!isNaN(v)) cur.total += v;
        map.set(s, cur);
      }
    }
    return Array.from(map.entries()).map(([segment, data]) => ({
      segment,
      total_profit: data.total,
      cnt: data.cnt
    }));
  }

  private aggregateBudget(records: Record<string, any>[], dimCol: string, varCol: string, budCol: string): { dept: string; total_var: number; total_bud: number }[] {
    const map = new Map<string, { total_var: number; total_bud: number }>();
    for (const r of records) {
      const d = String(r[dimCol] ?? '').trim();
      const v = Number(r[varCol]);
      const b = Number(r[budCol]);
      if (d) {
        const cur = map.get(d) || { total_var: 0, total_bud: 0 };
        if (!isNaN(v)) cur.total_var += v;
        if (!isNaN(b)) cur.total_bud += b;
        map.set(d, cur);
      }
    }
    return Array.from(map.entries()).map(([dept, data]) => ({
      dept,
      total_var: data.total_var,
      total_bud: data.total_bud
    }));
  }

  private formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}

export const kpiEngine = new KpiEngine();
