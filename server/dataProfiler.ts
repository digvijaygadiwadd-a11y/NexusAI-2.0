import { ColumnMetadata, DataProfile, CanonicalDataType } from './canonicalTypes.js';

export class DataProfiler {
  /**
   * Performs dynamic, mathematical profiling across all records and columns
   */
  public profile(records: Record<string, any>[], datasetId = 'dataset'): DataProfile {
    if (!records || !Array.isArray(records) || records.length === 0) {
      return {
        datasetId,
        totalRows: 0,
        totalColumns: 0,
        duplicateRows: 0,
        totalMissingCells: 0,
        overallMissingPercentage: 0,
        healthScore: 100,
        columns: [],
        constantColumns: [],
        highCardinalityColumns: [],
        dataQualityIssues: []
      };
    }

    const totalRows = records.length;
    const allKeys = Array.from(new Set(records.flatMap(r => (r && typeof r === 'object' ? Object.keys(r) : []))));
    const totalColumns = allKeys.length;

    // Detect exact duplicate rows
    const serializedRows = new Set<string>();
    let duplicateRows = 0;
    for (const row of records) {
      if (!row || typeof row !== 'object') continue;
      const serialized = JSON.stringify(row);
      if (serializedRows.has(serialized)) {
        duplicateRows++;
      } else {
        serializedRows.add(serialized);
      }
    }

    let totalMissingCells = 0;
    const columns: ColumnMetadata[] = [];
    const constantColumns: string[] = [];
    const highCardinalityColumns: string[] = [];
    const dataQualityIssues: DataProfile['dataQualityIssues'] = [];

    for (const key of allKeys) {
      let nullCount = 0;
      let invalidDateCount = 0;
      let invalidNumericCount = 0;
      const nonNullValues: any[] = [];
      const frequencyMap: Map<string, number> = new Map();

      for (const row of records) {
        const val = row[key];
        if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) {
          nullCount++;
          totalMissingCells++;
        } else {
          nonNullValues.push(val);
          const strVal = String(val);
          frequencyMap.set(strVal, (frequencyMap.get(strVal) || 0) + 1);
        }
      }

      const uniqueCount = frequencyMap.size;
      const nullPercentage = Number(((nullCount / totalRows) * 100).toFixed(1));

      // Infer Data Type
      const type = this.inferDataType(key, nonNullValues);
      const isConstant = uniqueCount <= 1 && totalRows > 1;
      const isHighCardinality = uniqueCount > Math.min(50, totalRows * 0.7) && type !== 'id' && type !== 'date';

      if (isConstant) constantColumns.push(key);
      if (isHighCardinality) highCardinalityColumns.push(key);

      // Validate date anomalies if date type
      if (type === 'date') {
        nonNullValues.forEach(v => {
          const parsed = Date.parse(String(v));
          if (isNaN(parsed)) invalidDateCount++;
        });
      }

      // Check metric / dimension candidacy
      const isMetricCandidate = ['integer', 'float', 'currency', 'percentage'].includes(type) && (uniqueCount > 1 || totalRows === 1);
      const isTimeCandidate = type === 'date' || /date|month|year|quarter|time|period|day/i.test(key);
      const isDimensionCandidate = (type === 'categorical' || type === 'text' || type === 'boolean') || (!isMetricCandidate && uniqueCount <= 60);

      // Numeric statistical profiling (min, max, mean, median, stdDev, quartiles, IQR, outliers)
      let stats: ColumnMetadata['stats'] = undefined;
      if (['integer', 'float', 'currency', 'percentage'].includes(type)) {
        const numericValues: number[] = [];
        for (const v of nonNullValues) {
          const num = Number(v);
          if (isNaN(num)) {
            invalidNumericCount++;
          } else {
            numericValues.push(num);
          }
        }

        if (numericValues.length > 0) {
          numericValues.sort((a, b) => a - b);
          const min = numericValues[0];
          const max = numericValues[numericValues.length - 1];
          const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
          const mean = Number((sum / numericValues.length).toFixed(2));
          const median = numericValues[Math.floor(numericValues.length / 2)];

          // Variance & Sample Standard Deviation
          const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
          const stdDev = Number(Math.sqrt(variance).toFixed(2));

          // Quartiles & IQR
          const q1 = numericValues[Math.floor(numericValues.length * 0.25)];
          const q3 = numericValues[Math.floor(numericValues.length * 0.75)];
          const iqr = Number((q3 - q1).toFixed(2));
          const lowerFence = q1 - 1.5 * iqr;
          const upperFence = q3 + 1.5 * iqr;
          const outliers = numericValues.filter(v => v < lowerFence || v > upperFence);

          stats = {
            min,
            max,
            mean,
            median,
            stdDev,
            q1,
            q3,
            iqr,
            outlierCount: outliers.length
          };

          if (outliers.length > 0) {
            dataQualityIssues.push({
              column: key,
              issue: `${outliers.length} statistical outlier(s) detected (${((outliers.length / numericValues.length) * 100).toFixed(1)}% of values outside 1.5x IQR).`,
              severity: outliers.length > numericValues.length * 0.1 ? 'high' : 'medium',
              recommendation: `Inspect extreme values [${outliers.slice(0, 3).join(', ')}] to ensure they reflect genuine transactions rather than measurement errors.`
            });
          }
        }
      }

      // Compute categorical distribution (top 10 values)
      const distribution: { value: string; count: number; percentage: number }[] = [];
      Array.from(frequencyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .forEach(([val, count]) => {
          distribution.push({
            value: val,
            count,
            percentage: Number(((count / (nonNullValues.length || 1)) * 100).toFixed(1))
          });
        });

      if (nullPercentage > 15) {
        dataQualityIssues.push({
          column: key,
          issue: `High rate of missing values: ${nullPercentage}% (${nullCount} missing cells).`,
          severity: nullPercentage > 35 ? 'high' : 'medium',
          recommendation: 'Apply imputation or filter incomplete records prior to modeling.'
        });
      }

      if (isConstant) {
        dataQualityIssues.push({
          column: key,
          issue: `Constant column: all non-null values are identical ("${nonNullValues[0]}").`,
          severity: 'low',
          recommendation: 'Consider dropping constant columns as they provide zero variance for predictive modeling.'
        });
      }

      columns.push({
        name: key,
        type,
        nullable: nullCount > 0,
        nullCount,
        nullPercentage,
        uniqueCount,
        isConstant,
        isHighCardinality,
        invalidDatesCount: invalidDateCount,
        invalidNumericCount: invalidNumericCount,
        sampleValues: nonNullValues.slice(0, 5),
        isMetricCandidate,
        isDimensionCandidate,
        isTimeCandidate,
        stats,
        distribution
      });
    }

    if (duplicateRows > 0) {
      dataQualityIssues.push({
        issue: `${duplicateRows} exact duplicate rows identified in dataset (${((duplicateRows / totalRows) * 100).toFixed(1)}% of all records).`,
        severity: duplicateRows > totalRows * 0.05 ? 'high' : 'low',
        recommendation: 'Deduplicate records to avoid artificially inflating volume and revenue aggregates.'
      });
    }

    const totalCells = totalRows * totalColumns;
    const overallMissingPercentage = totalCells > 0 ? Number(((totalMissingCells / totalCells) * 100).toFixed(1)) : 0;

    // Mathematical Health Score Calculation
    const missingPenalty = overallMissingPercentage * 1.5;
    const duplicatePenalty = totalRows > 0 ? (duplicateRows / totalRows) * 30 : 0;
    const outlierCols = columns.filter(c => (c.stats?.outlierCount || 0) > 0).length;
    const outlierPenalty = totalColumns > 0 ? (outlierCols / totalColumns) * 15 : 0;
    const constantPenalty = constantColumns.length * 5;

    const healthScore = Math.max(20, Math.min(100, Math.round(100 - missingPenalty - duplicatePenalty - outlierPenalty - constantPenalty)));

    return {
      datasetId,
      totalRows,
      totalColumns,
      duplicateRows,
      totalMissingCells,
      overallMissingPercentage,
      healthScore,
      columns,
      constantColumns,
      highCardinalityColumns,
      dataQualityIssues
    };
  }

  private inferDataType(key: string, values: any[]): CanonicalDataType {
    const keyLower = key.toLowerCase();

    if (keyLower.endsWith('_id') || keyLower === 'id' || keyLower.startsWith('id_') || keyLower.includes('sku') || keyLower.includes('code')) {
      return 'id';
    }

    if (/is_|has_|flag|status|return/i.test(keyLower) && values.every(v => typeof v === 'boolean' || ['true', 'false', 'yes', 'no', 'y', 'n', '0', '1'].includes(String(v).toLowerCase()))) {
      return 'boolean';
    }

    if (/date|month|year|quarter|time|timestamp|created_at|updated_at/i.test(keyLower)) {
      return 'date';
    }

    // Test for date parseability
    if (values.length > 0 && values.slice(0, 10).every(v => {
      if (typeof v !== 'string') return false;
      const parsed = Date.parse(v);
      return !isNaN(parsed) && /^\d{4}[-/]\d{1,2}/.test(v);
    })) {
      return 'date';
    }

    // Check if numeric
    const numericSamples = values.slice(0, 20).filter(v => typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== ''));
    if (numericSamples.length >= values.slice(0, 20).length * 0.8 && numericSamples.length > 0) {
      if (/revenue|sales|mrr|arr|cost|price|spend|budget|profit|margin_usd|cac|ltv/i.test(keyLower) || String(values[0]).includes('$')) {
        return 'currency';
      }
      if (/pct|percentage|rate|ratio|margin_pct|discount/i.test(keyLower)) {
        return 'percentage';
      }
      const hasDecimals = values.some(v => Number(v) % 1 !== 0);
      return hasDecimals ? 'float' : 'integer';
    }

    // Distinct categorical test
    const uniqueValues = new Set(values);
    if (uniqueValues.size <= Math.min(30, values.length * 0.35)) {
      return 'categorical';
    }

    return 'text';
  }
}

export const dataProfiler = new DataProfiler();
