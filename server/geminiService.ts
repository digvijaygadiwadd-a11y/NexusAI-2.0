import { GoogleGenAI } from '@google/genai';
import { ColumnMetadata, KPIResult, BusinessProblem, EvidenceBackedRecommendation } from './canonicalTypes.js';
import { sqlSecurityService } from './sqlSecurityService.js';

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI client:', err);
      }
    }
  }

  private async executeGenerateJson<T>(prompt: string, temperature = 0.1): Promise<T | null> {
    if (!this.ai) return null;

    for (let i = 0; i < this.candidateModels.length; i++) {
      const model = this.candidateModels[i];
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature
          }
        });

        if (response?.text) {
          let cleaned = response.text.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          }
          const parsed = JSON.parse(cleaned);
          return parsed as T;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isTransientDemand =
          err?.status === 'UNAVAILABLE' ||
          err?.error?.code === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          err?.error?.code === 429 ||
          errMsg.includes('429');

        if (isTransientDemand && i < this.candidateModels.length - 1) {
          await new Promise(r => setTimeout(r, 400));
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Executive AI Business Analysis strictly grounded in calculated dataset evidence
   */
  public async generateBusinessAnalysis(params: {
    datasetId: string;
    datasetName: string;
    totalRows: number;
    kpis: KPIResult[];
    problems: BusinessProblem[];
    schema: ColumnMetadata[];
    sampleRecords: any[];
  }): Promise<{
    executiveSummary: string;
    keyDrivers: string[];
    riskFactors: string[];
    recommendations: EvidenceBackedRecommendation[];
    chartRecommendations: any[];
  }> {
    if (this.ai && params.totalRows > 0) {
      const prompt = `You are an AI Business Decision Intelligence Analyst.
Analyze the following verified dataset evidence:

Dataset: ${params.datasetName}
Total Rows: ${params.totalRows}
Computed KPIs: ${JSON.stringify(params.kpis.map(k => ({ title: k.title, value: k.formattedValue, calc: k.calculationDescription })), null, 2)}
Detected Problems: ${JSON.stringify(params.problems.map(p => ({ title: p.title, metric: p.metric, current: p.currentValue, desc: p.description, evidence: p.evidence })), null, 2)}
Schema: ${JSON.stringify(params.schema.map(c => ({ name: c.name, type: c.type, stats: c.stats })), null, 2)}
Sample Data: ${JSON.stringify(params.sampleRecords.slice(0, 5), null, 2)}

Strict Instructions:
1. Every claim MUST cite numbers from the Computed KPIs or Detected Problems above. Never guess or invent numbers.
2. Executive Summary: 2 concise paragraphs analyzing revenue, margin, or volume trajectory from the data.
3. Key Drivers: 3 bullets identifying operational factors supported by the data.
4. Risk Factors: 3 bullets highlighting identified risks (or "None detected" if all metrics healthy).
5. Recommendations: 3 strategic recommendations. Every recommendation MUST include:
   - title
   - recommendation (clear action)
   - reason (grounded in data)
   - metric
   - actualValue
   - comparisonValue
   - percentageChange (number)
   - sourceColumns (array of column names)
   - calculation (formula)
   - confidence (0.0 to 1.0)
   - effortLevel ("Low" | "Medium" | "High")
   - priority ("Immediate" | "Short-Term" | "Strategic")
   - suggestedSql (valid SELECT query from 'uploaded_data')

Return valid JSON:
{
  "executiveSummary": "string",
  "keyDrivers": ["string", "string", "string"],
  "riskFactors": ["string", "string", "string"],
  "recommendations": [
    {
      "id": "rec-1",
      "title": "string",
      "recommendation": "string",
      "reason": "string",
      "strategicArea": "Revenue Optimization" | "Cost Reduction" | "Operations" | "Product Mix",
      "metric": "string",
      "actualValue": "string",
      "comparisonValue": "string",
      "percentageChange": 0,
      "sourceColumns": ["col1"],
      "calculation": "string",
      "confidence": 0.95,
      "effortLevel": "Low" | "Medium" | "High",
      "priority": "Immediate" | "Short-Term" | "Strategic",
      "suggestedSql": "SELECT ... FROM uploaded_data ..."
    }
  ],
  "chartRecommendations": [
    {
      "chartType": "bar" | "line" | "pie" | "area",
      "title": "string",
      "xAxis": "col_name",
      "yAxis": "col_name",
      "aggregation": "SUM" | "AVG" | "COUNT",
      "reasoning": "string"
    }
  ]
}`;

      const aiRes = await this.executeGenerateJson<{
        executiveSummary: string;
        keyDrivers: string[];
        riskFactors: string[];
        recommendations: EvidenceBackedRecommendation[];
        chartRecommendations: any[];
      }>(prompt, 0.1);

      if (aiRes && aiRes.executiveSummary && Array.isArray(aiRes.recommendations)) {
        return {
          ...aiRes,
          recommendations: aiRes.recommendations.map((r, i) => ({
            ...r,
            id: `rec-${i + 1}`,
            datasetId: params.datasetId
          }))
        };
      }
    }

    // Deterministic factual fallback grounded strictly in real calculated data
    return this.generateGroundedFallback(params);
  }

  /**
   * Natural Language Analytics Question Answering:
   * Intent -> SQL execution -> Evidence extraction -> Evidence-grounded explanation
   */
  public async answerQuestion(params: {
    question: string;
    datasetName: string;
    kpis: KPIResult[];
    problems: BusinessProblem[];
    schema: ColumnMetadata[];
    records: Record<string, any>[];
  }): Promise<{
    answer: string;
    evidenceData: any[];
    confidence: number;
    executedSql?: string;
    sqlRows?: Record<string, any>[];
    lineage: { datasetName: string; sourceColumns: string[]; calculation?: string };
  }> {
    if (!params.records || params.records.length === 0) {
      return {
        answer: 'No dataset available.',
        evidenceData: [],
        confidence: 0,
        lineage: { datasetName: params.datasetName, sourceColumns: [] }
      };
    }

    // Step 1: AI generates SQL query targeted to answer the specific question
    const sqlGen = await this.generateSql({
      question: params.question,
      schema: params.schema,
      sampleData: params.records.slice(0, 3)
    });

    // Step 2: Execute the generated SQL query securely against actual dataset records
    const sqlResult = await sqlSecurityService.executeSecureQuery(sqlGen.sql, { rowLimit: 50 });

    const sourceCols = params.schema.filter(c => sqlGen.sql.toLowerCase().includes(c.name.toLowerCase())).map(c => c.name);

    if (this.ai && sqlResult.rows.length > 0) {
      const prompt = `You are an AI Business Decision Analyst. The user asks: "${params.question}".
Here is the actual database query result executed against the uploaded dataset:

SQL Query: ${sqlGen.sql}
Query Output Rows (${sqlResult.rowCount} rows):
${JSON.stringify(sqlResult.rows.slice(0, 10), null, 2)}

Overall Dataset KPIs:
${JSON.stringify(params.kpis.map(k => `${k.title}: ${k.formattedValue}`), null, 2)}

Strict Instructions:
1. Explain what the data proves directly using the numbers in the Query Output Rows above.
2. If the data does not contain the answer, state: "I cannot determine the cause from the available dataset."
3. Never invent facts, cohorts, or trends not present in the data rows.

Return JSON:
{
  "answer": "Direct evidence-backed explanation citing exact figures",
  "confidence": 0.95,
  "keyEvidence": ["Fact 1 with number", "Fact 2 with number"]
}`;

      const aiAns = await this.executeGenerateJson<{
        answer: string;
        confidence?: number;
        keyEvidence?: string[];
      }>(prompt, 0.1);

      if (aiAns && aiAns.answer) {
        return {
          answer: aiAns.answer,
          evidenceData: sqlResult.rows.slice(0, 5),
          confidence: aiAns.confidence || 0.95,
          executedSql: sqlGen.sql,
          sqlRows: sqlResult.rows.slice(0, 10),
          lineage: {
            datasetName: params.datasetName,
            sourceColumns: sourceCols.length > 0 ? sourceCols : [params.schema[0]?.name || 'data'],
            calculation: sqlGen.sql
          }
        };
      }
    }

    // Fallback if AI call fails or offline: summarize actual query rows
    if (sqlResult.rows.length > 0) {
      const firstRow = sqlResult.rows[0];
      const summaryParts = Object.entries(firstRow).map(([k, v]) => `${k}: ${v}`);
      return {
        answer: `Query results indicate: ${summaryParts.join(', ')}. Analyzed across ${sqlResult.rowCount} rows from active dataset.`,
        evidenceData: sqlResult.rows.slice(0, 5),
        confidence: 0.90,
        executedSql: sqlGen.sql,
        sqlRows: sqlResult.rows.slice(0, 10),
        lineage: {
          datasetName: params.datasetName,
          sourceColumns: sourceCols,
          calculation: sqlGen.sql
        }
      };
    }

    return {
      answer: 'No reliable answer could be generated from the available data.',
      evidenceData: [],
      confidence: 0.5,
      executedSql: sqlGen.sql,
      lineage: { datasetName: params.datasetName, sourceColumns: sourceCols }
    };
  }

  /**
   * Real AI-to-SQL query generation
   */
  public async generateSql(params: {
    question: string;
    schema: ColumnMetadata[];
    sampleData: any[];
  }): Promise<{
    sql: string;
    explanation: string;
    recommendedChart: any;
  }> {
    if (this.ai) {
      const prompt = `You are a Principal SQL Engineer.
Table Name: uploaded_data
Columns: ${JSON.stringify(params.schema.map(c => ({ name: c.name, type: c.type, uniqueCount: c.uniqueCount, isMetric: c.isMetricCandidate })))}
Sample row: ${JSON.stringify(params.sampleData[0] || {})}

Convert this natural language question into a clean, read-only SELECT query for alasql/PostgreSQL syntax:
"${params.question}"

Rules:
1. Query from 'uploaded_data'.
2. Use valid SELECT, WHERE, GROUP BY, ORDER BY, LIMIT.
3. If aggregate functions (SUM, AVG, COUNT) are used alongside regular columns, include regular columns in GROUP BY.
4. Only return SELECT statements.

Return JSON:
{
  "sql": "SELECT ... FROM uploaded_data ...",
  "explanation": "What this query calculates",
  "recommendedChart": {
    "chartType": "bar" | "line" | "pie" | "area",
    "title": "Chart Title",
    "xAxis": "column_name",
    "yAxis": "column_name",
    "aggregation": "SUM" | "AVG" | "COUNT",
    "reasoning": "Why this chart fits"
  }
}`;

      const res = await this.executeGenerateJson<{
        sql: string;
        explanation: string;
        recommendedChart: any;
      }>(prompt, 0.1);

      if (res && res.sql) {
        return res;
      }
    }

    // Dynamic heuristic SQL generator from actual column metadata
    const cols = params.schema.map(c => c.name);
    const catCol = params.schema.find(c => c.isDimensionCandidate && !c.isTimeCandidate)?.name || cols[1] || cols[0];
    const numCol = params.schema.find(c => c.isMetricCandidate)?.name || cols[cols.length - 1];

    if (numCol && catCol && numCol !== catCol) {
      return {
        sql: `SELECT ${catCol}, SUM(${numCol}) as total_${numCol}, COUNT(*) as count FROM uploaded_data GROUP BY ${catCol} ORDER BY total_${numCol} DESC LIMIT 10`,
        explanation: `Aggregates ${numCol} and transaction frequency grouped by ${catCol}.`,
        recommendedChart: {
          chartType: 'bar',
          title: `Total ${numCol} by ${catCol}`,
          xAxis: catCol,
          yAxis: `total_${numCol}`,
          aggregation: 'SUM',
          reasoning: 'Visual rank-ordering across active categories.'
        }
      };
    }

    return {
      sql: `SELECT * FROM uploaded_data LIMIT 15`,
      explanation: 'Retrieves sample records from active dataset.',
      recommendedChart: {
        chartType: 'bar',
        title: 'Sample Distribution',
        xAxis: cols[0] || 'id',
        yAxis: cols[1] || 'value',
        aggregation: 'COUNT',
        reasoning: 'Standard distribution view'
      }
    };
  }

  private generateGroundedFallback(params: {
    datasetId: string;
    datasetName: string;
    totalRows: number;
    kpis: KPIResult[];
    problems: BusinessProblem[];
    schema: ColumnMetadata[];
  }) {
    const kpiSummary = params.kpis.slice(0, 3).map(k => `${k.title}: ${k.formattedValue}`).join(', ');
    const numCols = params.schema.filter(c => c.isMetricCandidate);
    const catCols = params.schema.filter(c => c.isDimensionCandidate);

    const recommendations: EvidenceBackedRecommendation[] = params.problems.map((prob, idx) => ({
      id: `rec-grounded-${idx + 1}`,
      datasetId: params.datasetId,
      title: `Remediate ${prob.title}`,
      recommendation: prob.recommendedAction,
      reason: prob.description,
      strategicArea: prob.metric?.includes('profit') || prob.metric?.includes('cost') ? 'Cost Reduction' : 'Operations',
      metric: prob.metric || 'core_metric',
      actualValue: prob.currentValue,
      comparisonValue: prob.benchmarkValue,
      percentageChange: 0,
      sourceColumns: prob.sourceColumns,
      calculation: `Analysis of ${prob.sourceColumns.join(', ')}`,
      confidence: 0.94,
      effortLevel: idx === 0 ? 'Medium' : 'Low',
      priority: prob.severity === 'CRITICAL' ? 'Immediate' : 'Short-Term',
      suggestedSql: `SELECT ${prob.sourceColumns.join(', ')} FROM uploaded_data LIMIT 25`
    }));

    if (recommendations.length === 0 && params.kpis.length > 0) {
      const topKpi = params.kpis[1] || params.kpis[0];
      recommendations.push({
        id: 'rec-grounded-1',
        datasetId: params.datasetId,
        title: `Optimize ${topKpi.title} Trajectory`,
        recommendation: `Monitor high-volume segments driving ${topKpi.title} (${topKpi.formattedValue}).`,
        reason: `Baseline stands at ${topKpi.formattedValue} calculated across ${params.totalRows} records.`,
        strategicArea: 'Revenue Optimization',
        metric: topKpi.sourceColumns[0] || 'primary_metric',
        actualValue: topKpi.formattedValue,
        comparisonValue: 'Historical baseline',
        percentageChange: topKpi.changePercentage || 0,
        sourceColumns: topKpi.sourceColumns,
        calculation: topKpi.calculationDescription,
        confidence: 0.92,
        effortLevel: 'Low',
        priority: 'Strategic',
        suggestedSql: `SELECT * FROM uploaded_data LIMIT 25`
      });
    }

    return {
      executiveSummary: `Analysis of dataset "${params.datasetName}" (${params.totalRows} records) indicates core performance metrics: ${kpiSummary}. Total of ${params.problems.length} statistical operational exceptions were identified requiring management attention.`,
      keyDrivers: [
        `Primary metric performance anchored by ${params.kpis[1]?.title || params.kpis[0]?.title || 'volume records'}.`,
        `Data integrity health score calculated across ${params.schema.length} verified schema dimensions.`,
        `${params.problems.length > 0 ? `${params.problems.length} operational risk points identified` : 'Stable operational baseline across active categories'}.`
      ],
      riskFactors: params.problems.length > 0
        ? params.problems.slice(0, 3).map(p => `${p.title}: ${p.description}`)
        : ['No high-severity operational anomalies detected in active dataset.'],
      recommendations,
      chartRecommendations: [
        {
          chartType: 'bar',
          title: `Metric Distribution by ${catCols[0]?.name || 'Category'}`,
          xAxis: catCols[0]?.name || 'category',
          yAxis: numCols[0]?.name || 'value',
          aggregation: 'SUM',
          reasoning: 'Visual breakdown across active dimensions.'
        }
      ]
    };
  }
}

export const geminiService = new GeminiService();
