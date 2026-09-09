import React, { useState, useEffect } from 'react';
import { 
  ComposedChart,
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Sparkles, Sliders, Calendar, BarChart2 } from 'lucide-react';
import { ColumnSchema, ForecastPoint } from '../types.js';

interface ForecastingViewProps {
  columns: ColumnSchema[];
}

export const ForecastingView: React.FC<ForecastingViewProps> = ({ columns }) => {
  const metricCols = columns.filter(c => c.isMetricCandidate || c.type === 'float' || c.type === 'integer' || c.type === 'currency' || c.type === 'percentage');
  const timeCols = columns.filter(c => c.isTimeCandidate || /month|date|time|year|period|quarter/i.test(c.name));

  const [selectedMetric, setSelectedMetric] = useState<string>(metricCols[0]?.name || columns[1]?.name || 'revenue');
  const [selectedTimeDim, setSelectedTimeDim] = useState<string>(timeCols[0]?.name || columns[0]?.name || 'month');
  const [periodsAhead, setPeriodsAhead] = useState<number>(4);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Synchronize metric and time dimensions whenever columns change
  useEffect(() => {
    if (columns && columns.length > 0) {
      const metricExists = columns.some(c => c.name === selectedMetric);
      const timeExists = columns.some(c => c.name === selectedTimeDim);

      if (!metricExists) {
        const nextMetric = metricCols[0]?.name 
          || columns.find(c => c.isMetricCandidate)?.name 
          || (columns.length > 1 ? columns[1].name : columns[0].name);
        setSelectedMetric(nextMetric);
      }
      if (!timeExists) {
        const nextTime = timeCols[0]?.name 
          || columns.find(c => c.isTimeCandidate)?.name 
          || columns[0].name;
        setSelectedTimeDim(nextTime);
      }
    }
  }, [columns]);

  useEffect(() => {
    if (selectedMetric && selectedTimeDim) {
      fetchForecast();
    }
  }, [selectedMetric, selectedTimeDim, periodsAhead]);

  const fetchForecast = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: selectedMetric,
          timeDimension: selectedTimeDim,
          periodsAhead
        })
      });
      const data = await res.json();
      setForecastData(data.forecast || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Format data for chart
  const chartPoints = forecastData.map(pt => ({
    period: pt.period,
    actual: pt.actual !== null ? pt.actual : undefined,
    projected: pt.projected !== null ? pt.projected : undefined,
    lowerBound: pt.lowerBound,
    upperBound: pt.upperBound
  }));

  const futurePoints = forecastData.filter(p => p.actual === null);
  const firstFuture = futurePoints[0]?.projected || 0;
  const lastFuture = futurePoints[futurePoints.length - 1]?.projected || 0;
  const trajectoryPct = firstFuture > 0 ? (((lastFuture - firstFuture) / firstFuture) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Controls & Metric Selectors */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Statistical Trend & Predictive Forecasting Engine</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generates linear trend projections with 95% statistical confidence bounds across future cycles.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-400">Projected Momentum:</span>
            <span className={`font-bold ${Number(trajectoryPct) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {Number(trajectoryPct) >= 0 ? `+${trajectoryPct}%` : `${trajectoryPct}%`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Metric to Predict</label>
            <select
              id="select-forecast-metric"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {metricCols.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Time Dimension / Cadence</label>
            <select
              id="select-forecast-time"
              value={selectedTimeDim}
              onChange={(e) => setSelectedTimeDim(e.target.value)}
              className="w-full rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {columns.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Forecast Horizon</label>
            <select
              id="select-forecast-periods"
              value={periodsAhead}
              onChange={(e) => setPeriodsAhead(Number(e.target.value))}
              className="w-full rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value={2}>Next 2 Periods Ahead</option>
              <option value={4}>Next 4 Periods Ahead</option>
              <option value={6}>Next 6 Periods Ahead</option>
              <option value={8}>Next 8 Periods Ahead</option>
            </select>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="mt-6 h-96 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
              Calculating statistical trendline & confidence bounds...
            </div>
          ) : chartPoints.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <TrendingUp className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-sm font-medium text-slate-300">No Historical Periods Available for Forecasting</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Ensure the selected dataset has at least 3 historical rows with valid time and numerical metric values.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={250}>
              <ComposedChart data={chartPoints} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => (v != null ? Number(v).toLocaleString() : '')} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16161a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  formatter={(val: any, name: string) => [val != null && !isNaN(Number(val)) ? Number(val).toLocaleString() : (val != null ? String(val) : '-'), name]}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />

                {/* Upper and Lower bounds envelope */}
                <Area 
                  type="monotone" 
                  dataKey="upperBound" 
                  name="95% Upper Bound" 
                  stroke="none" 
                  fill="url(#confidenceFill)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="lowerBound" 
                  name="95% Lower Bound" 
                  stroke="#4f46e5" 
                  strokeDasharray="2 2"
                  fill="none" 
                />

                {/* Historical Actuals Line */}
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  name={`Historical Actual (${selectedMetric})`} 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#4f46e5' }} 
                  connectNulls={false}
                />

                {/* Projected Line */}
                <Line 
                  type="monotone" 
                  dataKey="projected" 
                  name="Projected Forecast" 
                  stroke="#ec4899" 
                  strokeWidth={3} 
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#db2777' }} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Projection Data Table */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-5 shadow-xl">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          Statistical Projection Breakdown Table
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0f0f12] text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
              <tr>
                <th className="px-4 py-2.5 font-mono">Period</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Historical Actual</th>
                <th className="px-4 py-2.5">Projected Value</th>
                <th className="px-4 py-2.5">95% Lower Bound</th>
                <th className="px-4 py-2.5">95% Upper Bound</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {forecastData.map((pt, i) => (
                <tr key={i} className={`hover:bg-white/[0.03] transition ${pt.actual === null ? 'bg-indigo-500/5' : ''}`}>
                  <td className="px-4 py-2 font-semibold text-white font-sans">{pt.period}</td>
                  <td className="px-4 py-2">
                    {pt.actual !== null ? (
                      <span className="text-indigo-300 font-sans">Historical</span>
                    ) : (
                      <span className="text-pink-400 font-bold font-sans">Future Projection</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-200">
                    {pt.actual != null && !isNaN(Number(pt.actual)) ? Number(pt.actual).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2 text-pink-300 font-bold">
                    {pt.projected != null && !isNaN(Number(pt.projected))
                      ? Number(pt.projected).toLocaleString()
                      : pt.forecast != null && pt.isProjected && !isNaN(Number(pt.forecast))
                        ? Number(pt.forecast).toLocaleString()
                        : '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-400">
                    {pt.lowerBound != null && !isNaN(Number(pt.lowerBound)) ? Number(pt.lowerBound).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-400">
                    {pt.upperBound != null && !isNaN(Number(pt.upperBound)) ? Number(pt.upperBound).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
