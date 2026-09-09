import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  ArrowRight, 
  DollarSign, 
  BarChart2, 
  Layers, 
  SearchCode,
  Sparkles
} from 'lucide-react';
import { KpiMetric, BusinessProblem } from '../types.js';

interface KpiDashboardProps {
  kpis: KpiMetric[];
  problems: BusinessProblem[];
  onInvestigateProblem?: (problem: BusinessProblem) => void;
  onAskAiAboutProblem?: (problem: BusinessProblem) => void;
}

export const KpiDashboard: React.FC<KpiDashboardProps> = ({
  kpis,
  problems,
  onInvestigateProblem,
  onAskAiAboutProblem
}) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
          bg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
          titleColor: 'text-rose-200'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          titleColor: 'text-amber-200'
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-indigo-400" />,
          bg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
          titleColor: 'text-indigo-200'
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Dynamic Automated KPI Metrics Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>Automated Executive Business Metrics</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dynamically derived from statistical distributions and semantic column mappings of the active dataset.
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-slate-300 font-mono">
            {kpis.length} dynamic metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="bg-[#16161a] rounded-2xl border border-white/5 p-5 hover:border-white/10 transition shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="truncate pr-2">{kpi.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 font-mono uppercase border border-white/5">
                    {kpi.category}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white tracking-tight">
                    {kpi.formattedValue}
                  </span>
                  {kpi.trend && (
                    <div className={`flex items-center space-x-1 text-xs font-semibold ${
                      kpi.trend === 'up' ? 'text-emerald-400' : kpi.trend === 'down' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {kpi.trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
                      {kpi.trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
                      {kpi.trend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
                      {kpi.trendDelta && <span className="font-mono">{kpi.trendDelta}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Underlying Column & Aggregation Formula */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="text-slate-400 truncate max-w-[140px]">
                  {kpi.aggregation}({kpi.column})
                </span>
                <span className="text-[10px] text-indigo-400 font-medium">Real Aggregation</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Automatic Business Problem & Risk Detector */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <span>Automated Business Problem & Risk Diagnosis Engine</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Scans dataset for margin compression, churn acceleration, inventory stockout risks, and abnormal variance.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold font-mono">
            {problems.length} Operational Hazards Identified
          </span>
        </div>

        {problems.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No critical business vulnerabilities detected across this dataset cohort.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {problems.map((prob) => {
              const badge = getSeverityBadge(prob.severity);
              return (
                <div
                  key={prob.id}
                  className="rounded-xl border border-white/5 bg-[#0f0f12] p-5 hover:border-white/10 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">{badge.icon}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.bg}`}>
                            {prob.severity}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {prob.category}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-mono border border-white/5">
                            Impact: {prob.impactScore}
                          </span>
                        </div>
                        <h4 className={`text-sm font-bold mt-1.5 ${badge.titleColor}`}>
                          {prob.title}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {prob.description}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0">
                      {onInvestigateProblem && (
                        <button
                          onClick={() => onInvestigateProblem(prob)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition border border-white/5"
                        >
                          <SearchCode className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Audit via SQL</span>
                        </button>
                      )}
                      {onAskAiAboutProblem && (
                        <button
                          onClick={() => onAskAiAboutProblem(prob)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium flex items-center space-x-1.5 transition border border-indigo-500/30"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>AI Deep Dive</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quantitative Evidence Section */}
                  <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Empirical Evidence Points:
                      </span>
                      <ul className="mt-1.5 space-y-1.5">
                        {Array.isArray(prob.evidence) && prob.evidence.map((ev, idx) => {
                          if (typeof ev === 'object' && ev !== null) {
                            return (
                              <li key={idx} className="text-slate-300 flex items-start space-x-1.5 font-mono text-[11px]">
                                <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                                <div className="leading-snug">
                                  <span className="text-slate-200 font-semibold">{ev.metricName || 'Metric'}:</span>{' '}
                                  <span className="text-indigo-300 font-bold">{String(ev.dataPoint ?? '')}</span>
                                  {ev.context && (
                                    <span className="text-slate-400 ml-1 text-[10px]">({ev.context})</span>
                                  )}
                                </div>
                              </li>
                            );
                          }
                          return (
                            <li key={idx} className="text-slate-300 flex items-start space-x-1.5 font-mono text-[11px]">
                              <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                              <span>{String(ev)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                        Prescribed Operational Action:
                      </span>
                      <p className="text-slate-300 mt-1.5 bg-black/40 rounded-xl p-2.5 border border-white/5 leading-relaxed text-xs">
                        {prob.suggestedAction || prob.recommendedAction || 'Monitor metric trend in next reporting cycle.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
