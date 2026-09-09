import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Play, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Table as TableIcon, 
  Copy, 
  Check, 
  FileCode,
  ArrowRight
} from 'lucide-react';
import { SqlQueryResult, ChartRecommendation } from '../types.js';

interface SqlStudioProps {
  initialQuery?: string;
  tableName?: string;
}

export const SqlStudio: React.FC<SqlStudioProps> = ({
  initialQuery,
  tableName = 'uploaded_data'
}) => {
  const defaultSql = `SELECT * FROM ${tableName} LIMIT 15`;
  const [query, setQuery] = useState(initialQuery || defaultSql);
  const [nlQuestion, setNlQuestion] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [recommendedChart, setRecommendedChart] = useState<ChartRecommendation | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleExecuteSql(initialQuery);
    } else {
      handleExecuteSql(defaultSql);
    }
  }, [initialQuery]);

  const handleExecuteSql = async (sqlToRun?: string) => {
    const q = sqlToRun || query;
    if (!q.trim()) return;

    setIsExecuting(true);
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setQueryResult({
          columns: Array.isArray(data.columns) ? data.columns : [],
          rows: Array.isArray(data.rows) ? data.rows : [],
          rowCount: typeof data.rowCount === 'number' ? data.rowCount : 0,
          executionTimeMs: data.executionTimeMs || 0,
          error: data.error || `HTTP ${res.status}: ${res.statusText}`
        });
      } else {
        setQueryResult({
          columns: Array.isArray(data.columns) ? data.columns : [],
          rows: Array.isArray(data.rows) ? data.rows : [],
          rowCount: typeof data.rowCount === 'number' ? data.rowCount : (data.rows?.length || 0),
          executionTimeMs: data.executionTimeMs || 0
        });
      }
    } catch (err: any) {
      setQueryResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err.message || 'Execution error'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAiToSql = async () => {
    if (!nlQuestion.trim() || isAiGenerating) return;

    setIsAiGenerating(true);
    setAiExplanation(null);
    setRecommendedChart(null);

    try {
      const res = await fetch('/api/ai/nl-to-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: nlQuestion })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI-to-SQL generation failed');

      setQuery(data.sql);
      setAiExplanation(data.explanation);
      setRecommendedChart(data.recommendedChart);
      const rawResult = data.result || {};
      setQueryResult({
        columns: Array.isArray(rawResult.columns) ? rawResult.columns : [],
        rows: Array.isArray(rawResult.rows) ? rawResult.rows : [],
        rowCount: typeof rawResult.rowCount === 'number' ? rawResult.rowCount : (rawResult.rows?.length || 0),
        executionTimeMs: rawResult.executionTimeMs || 0,
        error: rawResult.error
      });
    } catch (err: any) {
      setQueryResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err.message || 'AI-to-SQL error'
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportResultsCsv = () => {
    if (!queryResult || !Array.isArray(queryResult.rows) || queryResult.rows.length === 0) return;
    const cols = queryResult.columns || [];
    const headerLine = cols.map(c => `"${c}"`).join(',');
    const rowLines = queryResult.rows.map(row => 
      cols.map(c => {
        const v = row[c];
        return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : (v !== null && v !== undefined ? v : '');
      }).join(',')
    );
    const csvContent = [headerLine, ...rowLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const templateQueries = [
    { label: 'Top 10 Records', sql: `SELECT * FROM ${tableName} LIMIT 10` },
    { label: 'Category Summary', sql: `SELECT category, COUNT(*) as count, SUM(revenue) as total_rev FROM ${tableName} GROUP BY category ORDER BY total_rev DESC` },
    { label: 'Risk / Anomaly Scan', sql: `SELECT * FROM ${tableName} WHERE profit < 0 OR current_stock < 10 LIMIT 20` },
    { label: 'Monthly Growth Cohorts', sql: `SELECT month, SUM(mrr) as mrr, AVG(churn_rate_pct) as avg_churn FROM ${tableName} GROUP BY month ORDER BY month ASC` }
  ];

  return (
    <div className="space-y-6">
      {/* 1. AI-to-SQL Generation Bar */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center space-x-2 text-xs font-bold text-white mb-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>AI-to-SQL Natural Language Query Engine</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Type your question in natural language. Gemini translates it into executable SQL, runs it against the active database, and explains the result.
        </p>

        <div className="flex gap-2">
          <input
            id="input-nl-to-sql"
            type="text"
            value={nlQuestion}
            onChange={(e) => setNlQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiToSql()}
            placeholder="e.g. 'Show the top 5 regions by gross revenue with average discount'"
            className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            id="btn-generate-sql"
            onClick={handleAiToSql}
            disabled={isAiGenerating || !nlQuestion.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/20"
          >
            <span>{isAiGenerating ? 'Generating & Executing...' : 'Translate & Run'}</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

        {aiExplanation && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#0f0f12] border border-white/5 text-xs text-slate-300">
            <div className="font-semibold text-indigo-400 mb-1 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>AI Query Logic & Interpretation</span>
            </div>
            <p className="leading-relaxed">{aiExplanation}</p>
            {recommendedChart && (
              <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center space-x-2">
                <span className="font-semibold text-slate-300">Recommended Visualization:</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase font-mono text-[10px]">
                  {recommendedChart.chartType}
                </span>
                <span>{recommendedChart.reasoning}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. SQL Studio Editor & Runner */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>Interactive SQL Terminal (<span className="font-mono text-indigo-300">`{tableName}`</span>)</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Snippets selector */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  setQuery(e.target.value);
                  handleExecuteSql(e.target.value);
                }
              }}
              className="rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans"
              defaultValue=""
            >
              <option value="" disabled>Load SQL Template...</option>
              {templateQueries.map((t, idx) => (
                <option key={idx} value={t.sql}>{t.label}</option>
              ))}
            </select>

            <button
              onClick={copySql}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition border border-white/5"
              title="Copy Query"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              id="btn-run-sql-query"
              onClick={() => handleExecuteSql()}
              disabled={isExecuting}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecuting ? 'Executing...' : 'Run Query'}</span>
            </button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="mt-4">
          <textarea
            id="textarea-sql-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleExecuteSql();
              }
            }}
            rows={4}
            className="w-full rounded-xl bg-black/50 border border-white/10 p-3.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            placeholder="SELECT * FROM uploaded_data..."
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
            <span>Shortcut: Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-300 font-mono">Ctrl/Cmd + Enter</kbd> to execute</span>
            <span>Target Table: <code className="text-indigo-400 font-mono">{tableName}</code></span>
          </div>
        </div>

        {/* Query Results Section */}
        {queryResult && (
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center space-x-3 text-xs">
                <span className="font-semibold text-slate-300">Results:</span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-mono text-[11px] border border-white/5">
                  {queryResult.rowCount} rows
                </span>
                <span className="text-slate-400 flex items-center space-x-1 text-[11px] font-mono">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{queryResult.executionTimeMs} ms</span>
                </span>
              </div>

              {queryResult.rows && queryResult.rows.length > 0 && (
                <button
                  id="btn-export-csv"
                  onClick={exportResultsCsv}
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center space-x-1 transition border border-white/5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {queryResult.error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{queryResult.error}</span>
              </div>
            ) : (!queryResult.rows || queryResult.rows.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Query executed successfully. 0 rows returned.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 rounded-xl border border-white/5">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0f0f12] text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 sticky top-0">
                    <tr>
                      {(queryResult.columns || []).map((col) => (
                        <th key={col} className="px-4 py-2.5 whitespace-nowrap font-mono">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.03] transition">
                        {(queryResult.columns || []).map((col) => (
                          <td key={col} className="px-4 py-2 whitespace-nowrap text-slate-200">
                            {row && row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                              <span className="text-slate-500 italic">null</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
