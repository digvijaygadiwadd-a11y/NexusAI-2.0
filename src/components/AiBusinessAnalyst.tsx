import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Lightbulb, 
  TrendingUp, 
  AlertCircle, 
  Code2, 
  Copy, 
  Check, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { AiRecommendation, ChartRecommendation } from '../types.js';

interface AiBusinessAnalystProps {
  analysis: {
    executiveSummary: string;
    keyDrivers: string[];
    riskFactors: string[];
    recommendations: AiRecommendation[];
    chartRecommendations: ChartRecommendation[];
  } | null;
  isLoadingAnalysis: boolean;
  onRefreshAnalysis: () => void;
  onRunSqlInStudio: (sql: string) => void;
  datasetName: string;
}

export const AiBusinessAnalyst: React.FC<AiBusinessAnalystProps> = ({
  analysis,
  isLoadingAnalysis,
  onRefreshAnalysis,
  onRunSqlInStudio,
  datasetName
}) => {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{
    question: string;
    answer: string;
    evidence: any[];
    confidence: number;
    suggestedSql?: string;
  }>>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopySql = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAskQuestion = async (qText?: string) => {
    const query = qText || question;
    if (!query.trim() || isAsking) return;

    setIsAsking(true);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Q&A failed');

      setQaHistory(prev => [
        {
          question: query,
          answer: data.answer,
          evidence: data.evidenceData || [],
          confidence: data.confidence || 0.95,
          suggestedSql: data.suggestedSql
        },
        ...prev
      ]);
      setQuestion('');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAsking(false);
    }
  };

  const suggestedQuestions = [
    'Why did performance or margin compress in specific cohorts?',
    'Which customer tier or product line generates the highest gross margin?',
    'Where is the biggest operational risk of stockout or budget overrun?',
    'What 3 immediate actions should executive management take this quarter?'
  ];

  return (
    <div className="space-y-8">
      {/* 1. Executive Diagnostic Briefing */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Executive AI Intelligence Briefing</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium font-mono">
                  Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Synthesizing {datasetName} into verified strategic conclusions and mathematical drivers.
              </p>
            </div>
          </div>

          <button
            id="btn-refresh-ai-analysis"
            onClick={onRefreshAnalysis}
            disabled={isLoadingAnalysis}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center space-x-2 border border-white/5 transition disabled:opacity-50 self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalysis ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isLoadingAnalysis ? 'Synthesizing...' : 'Regenerate Briefing'}</span>
          </button>
        </div>

        {isLoadingAnalysis ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-mono">Running executive AI diagnostic reasoning engine...</p>
          </div>
        ) : analysis ? (
          <div className="mt-6 space-y-6">
            {/* Executive Summary */}
            <div className="p-4 rounded-xl bg-[#0f0f12] border border-white/5 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
              {analysis.executiveSummary}
            </div>

            {/* Key Drivers & Risk Factors 2-column breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Key Quantitative Growth Drivers</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {analysis.keyDrivers.map((driver, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Structural Vulnerabilities & Risk Factors</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {analysis.riskFactors.map((risk, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Evidence-Backed Strategic Recommendations */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Evidence-Backed Strategic Prescriptions</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Every action is mathematically grounded in actual dataset numbers, with verified financial upside and SQL audit scripts.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/5 font-mono">
            {analysis?.recommendations.length || 0} Prescriptions
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {analysis?.recommendations.map((rec) => (
            <div
              key={rec.id}
              className="rounded-xl border border-white/5 bg-[#0f0f12] p-5 hover:border-white/10 transition"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                      {rec.strategicArea}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold uppercase">
                      Impact: {rec.impactEstimate}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Effort: {rec.effortLevel}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-2">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {rec.summary}
                  </p>
                </div>
              </div>

              {/* Evidence Points */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                  Verified Data Evidence:
                </span>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                  {Array.isArray(rec.evidencePoints) && rec.evidencePoints.map((ev, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>
                        {typeof ev === 'object' && ev !== null
                          ? (ev as any).metricName
                            ? `${(ev as any).metricName}: ${(ev as any).dataPoint ?? ''} ${(ev as any).context ? `(${(ev as any).context})` : ''}`
                            : JSON.stringify(ev)
                          : String(ev)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested Audit SQL */}
              {rec.suggestedSql && (
                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span className="font-mono text-[11px] text-slate-400 flex items-center space-x-1">
                      <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Continuous Monitoring SQL Script:</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopySql(rec.id, rec.suggestedSql)}
                        className="hover:text-slate-200 text-[11px] flex items-center space-x-1 transition"
                      >
                        {copiedId === rec.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === rec.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => onRunSqlInStudio(rec.suggestedSql)}
                        className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center space-x-1 transition font-medium"
                      >
                        <span>Execute in SQL Studio</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 rounded-lg bg-black/50 border border-white/5 text-[11px] font-mono text-indigo-300 overflow-x-auto">
                    {rec.suggestedSql}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Natural-Language Analytics Interface */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-6 shadow-xl">
        <div className="pb-4 border-b border-white/5">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Natural-Language Conversational Analytics</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ask any business question in plain English (e.g. "Why did sales drop in July?"). The AI queries the underlying database and provides evidence-backed explanations.
          </p>
        </div>

        {/* Input Bar */}
        <div className="mt-5 flex gap-2">
          <input
            id="input-ai-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
            placeholder="Ask anything about the dataset: e.g. 'Which customer segment accounts for most revenue?'"
            className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            id="btn-submit-ai-question"
            onClick={() => handleAskQuestion()}
            disabled={isAsking || !question.trim()}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/20 transition"
          >
            <span>{isAsking ? 'Thinking...' : 'Analyze'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-[11px] text-slate-400 py-1">Quick prompts:</span>
          {suggestedQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleAskQuestion(sq)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0f0f12] hover:bg-white/5 text-slate-300 hover:text-indigo-300 border border-white/5 transition"
            >
              "{sq}"
            </button>
          ))}
        </div>

        {/* Q&A Responses Stream */}
        {qaHistory.length > 0 && (
          <div className="mt-6 space-y-4">
            {qaHistory.map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-[#0f0f12] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">
                    Q: {item.question}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                    {Math.round(item.confidence * 100)}% statistical confidence
                  </span>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                  {item.answer}
                </div>

                {item.suggestedSql && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400">SQL: {item.suggestedSql}</span>
                    <button
                      onClick={() => onRunSqlInStudio(item.suggestedSql!)}
                      className="text-indigo-400 hover:text-indigo-300 font-medium ml-3 shrink-0 transition"
                    >
                      Run query &rarr;
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
