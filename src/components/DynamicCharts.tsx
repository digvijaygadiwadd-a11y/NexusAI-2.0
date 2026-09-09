import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  ScatterChart, 
  Scatter, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  LineChart as LineIcon, 
  PieChart as PieIcon, 
  Activity, 
  Sliders, 
  Sparkles, 
  ArrowUpDown,
  Download,
  Maximize2
} from 'lucide-react';
import { ColumnSchema, ChartRecommendation, ChartType } from '../types.js';

interface DynamicChartsProps {
  columns: ColumnSchema[];
  records: Record<string, any>[];
  aiRecommendedCharts?: ChartRecommendation[];
}

const PALETTE = [
  '#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', 
  '#8b5cf6', '#14b8a6', '#f43f5e', '#a855f7', '#06b6d4'
];

export const DynamicCharts: React.FC<DynamicChartsProps> = ({
  columns,
  records,
  aiRecommendedCharts = []
}) => {
  const [internalRecords, setInternalRecords] = useState<Record<string, any>[]>([]);

  // Find sensible defaults
  const defaultDimension = columns.find(c => c.isTimeCandidate)?.name 
    || columns.find(c => c.isDimensionCandidate)?.name 
    || columns[0]?.name 
    || 'category';

  const defaultMetric = columns.find(c => c.isMetricCandidate)?.name 
    || columns.find(c => c.type === 'integer' || c.type === 'float' || c.type === 'currency' || c.type === 'percentage')?.name
    || (columns.length > 1 ? columns[1].name : columns[0]?.name)
    || 'value';

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>(defaultDimension);
  const [yAxisCol, setYAxisCol] = useState<string>(defaultMetric);
  const [aggregation, setAggregation] = useState<'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX'>('SUM');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'none'>('desc');
  const [limit, setLimit] = useState<number>(15);

  // Synchronize internal records if records prop is empty or updates
  useEffect(() => {
    if (records && records.length > 0) {
      setInternalRecords(records);
    } else {
      fetch('/api/data/sample?limit=200')
        .then(r => r.json())
        .then(d => {
          if (d.rows && d.rows.length > 0) {
            setInternalRecords(d.rows);
          }
        })
        .catch(() => {});
    }
  }, [records]);

  // Synchronize axes whenever columns change
  useEffect(() => {
    if (columns && columns.length > 0) {
      const isXValid = columns.some(c => c.name === xAxisCol);
      const isYValid = columns.some(c => c.name === yAxisCol);

      if (!isXValid) {
        const nextX = columns.find(c => c.isTimeCandidate)?.name 
          || columns.find(c => c.isDimensionCandidate)?.name 
          || columns.find(c => c.type === 'date' || c.type === 'string' || c.type === 'categorical')?.name
          || columns[0]?.name 
          || '';
        setXAxisCol(nextX);
      }

      if (!isYValid) {
        const nextY = columns.find(c => c.isMetricCandidate)?.name 
          || columns.find(c => c.type === 'integer' || c.type === 'float' || c.type === 'currency' || c.type === 'percentage')?.name
          || (columns.length > 1 ? columns[1].name : columns[0]?.name)
          || '';
        setYAxisCol(nextY);
      }
    }
  }, [columns]);

  const activeRecords = (records && records.length > 0) ? records : internalRecords;

  // Compute aggregated data for visualization
  const chartData = useMemo(() => {
    if (!activeRecords || activeRecords.length === 0 || !xAxisCol || !yAxisCol) return [];

    const groups: Map<string, number[]> = new Map();

    activeRecords.forEach(row => {
      const rawX = row[xAxisCol];
      const key = rawX !== undefined && rawX !== null && String(rawX).trim() !== '' ? String(rawX) : 'Unknown';
      
      let val = 0;
      const rawVal = row[yAxisCol];
      if (typeof rawVal === 'number') {
        val = isNaN(rawVal) ? 0 : rawVal;
      } else if (typeof rawVal === 'string') {
        const clean = rawVal.replace(/[\$,]/g, '').trim();
        const parsed = parseFloat(clean);
        val = isNaN(parsed) ? 0 : parsed;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(val);
    });

    const result: Array<{ name: string; value: number; count: number }> = [];

    groups.forEach((vals, name) => {
      let aggregatedVal = 0;
      if (aggregation === 'SUM') {
        aggregatedVal = vals.reduce((a, b) => a + b, 0);
      } else if (aggregation === 'AVG') {
        aggregatedVal = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      } else if (aggregation === 'COUNT') {
        aggregatedVal = vals.length;
      } else if (aggregation === 'MIN') {
        aggregatedVal = Math.min(...vals);
      } else if (aggregation === 'MAX') {
        aggregatedVal = Math.max(...vals);
      }

      result.push({
        name,
        value: Number(aggregatedVal.toFixed(2)),
        count: vals.length
      });
    });

    // Sorting
    if (sortOrder === 'desc') {
      result.sort((a, b) => b.value - a.value);
    } else if (sortOrder === 'asc') {
      result.sort((a, b) => a.value - b.value);
    }

    return result.slice(0, limit);
  }, [activeRecords, xAxisCol, yAxisCol, aggregation, sortOrder, limit]);

  // Compute summary stats
  const totalVal = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  const peakPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), chartData[0]);
  }, [chartData]);

  const applyRecommendation = (rec: ChartRecommendation) => {
    if (rec.chartType) setChartType(rec.chartType);
    if (rec.xAxis && columns.some(c => c.name === rec.xAxis)) setXAxisCol(rec.xAxis);
    if (rec.yAxis && columns.some(c => c.name === rec.yAxis)) setYAxisCol(rec.yAxis);
    if (rec.aggregation) setAggregation(rec.aggregation);
  };

  const chartTypes: Array<{ type: ChartType; label: string; icon: React.ReactNode }> = [
    { type: 'bar', label: 'Bar Chart', icon: <BarChart3 className="w-4 h-4" /> },
    { type: 'line', label: 'Line Chart', icon: <LineIcon className="w-4 h-4" /> },
    { type: 'area', label: 'Area Chart', icon: <Activity className="w-4 h-4" /> },
    { type: 'pie', label: 'Pie / Donut', icon: <PieIcon className="w-4 h-4" /> },
    { type: 'scatter', label: 'Scatter', icon: <Sliders className="w-4 h-4" /> },
  ];

  const tooltipStyle = {
    backgroundColor: '#16161a',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
  };

  return (
    <div className="space-y-6">
      {/* 1. AI Recommended Visualizations Carousel */}
      {aiRecommendedCharts.length > 0 && (
        <div className="bg-[#16161a] rounded-2xl border border-white/5 p-5 shadow-lg">
          <div className="flex items-center space-x-2 text-xs font-bold text-white mb-3">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Automated Visualization Recommendations</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aiRecommendedCharts.map((rec, idx) => (
              <button
                key={idx}
                id={`btn-apply-rec-${idx}`}
                onClick={() => applyRecommendation(rec)}
                className="text-left p-3.5 rounded-xl bg-[#0f0f12] hover:bg-white/[0.04] border border-white/5 hover:border-indigo-500/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-indigo-400 transition">
                    {rec.title}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5">
                    {rec.chartType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {rec.reasoning}
                </p>
                <div className="text-[10px] text-indigo-400 mt-2.5 flex items-center space-x-1 font-medium">
                  <span>Click to render this view →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Interactive Chart Controls Bar */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
          {/* Chart Type Selector */}
          <div className="flex items-center space-x-1 rounded-xl bg-[#0f0f12] p-1 border border-white/5">
            {chartTypes.map(c => (
              <button
                key={c.type}
                id={`btn-chart-type-${c.type}`}
                onClick={() => setChartType(c.type)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  chartType === c.type
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {c.icon}
                <span className="hidden sm:inline">{c.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center space-x-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">Aggregate Sum: </span>
              <span className="text-white font-bold">{Number(totalVal || 0).toLocaleString()}</span>
            </div>
            {peakPoint && (
              <div className="hidden sm:block">
                <span className="text-slate-400">Peak Segment: </span>
                <span className="text-indigo-400 font-bold">{peakPoint.name}</span> ({Number(peakPoint?.value || 0).toLocaleString()})
              </div>
            )}
          </div>
        </div>

        {/* Dimension & Metric Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4 text-xs">
          {/* X Axis Dimension */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">X-Axis / Category</label>
            <select
              id="select-xaxis"
              value={xAxisCol}
              onChange={(e) => setXAxisCol(e.target.value)}
              className="w-full rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Y Axis Metric */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Y-Axis Metric</label>
            <select
              id="select-yaxis"
              value={yAxisCol}
              onChange={(e) => setYAxisCol(e.target.value)}
              className="w-full rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} {c.isMetricCandidate ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Aggregation */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Aggregation</label>
            <select
              id="select-aggregation"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as any)}
              className="w-full rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="SUM">SUM</option>
              <option value="AVG">AVERAGE</option>
              <option value="COUNT">COUNT</option>
              <option value="MIN">MINIMUM</option>
              <option value="MAX">MAXIMUM</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Sort Order</label>
            <select
              id="select-sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="desc">Highest First (DESC)</option>
              <option value="asc">Lowest First (ASC)</option>
              <option value="none">Original Order</option>
            </select>
          </div>

          {/* Limit items */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Items Shown</label>
            <select
              id="select-limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-xl bg-[#0f0f12] border border-white/10 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
        </div>

        {/* 3. Primary Chart Visualizer Canvas */}
        <div className="mt-6 h-[420px] w-full pt-4">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              No matching records for chosen dimensions.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={300}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#71717a" 
                    fontSize={11} 
                    tickLine={false} 
                    angle={-25} 
                    textAnchor="end"
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(v) => (v != null && !isNaN(Number(v)) ? Number(v).toLocaleString() : '')} />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [val != null && !isNaN(Number(val)) ? Number(val).toLocaleString() : (val != null ? String(val) : '-'), `${aggregation} of ${yAxisCol}`]}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                  <Bar dataKey="value" name={`${aggregation}(${yAxisCol})`} radius={[6, 6, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} angle={-25} textAnchor="end" interval="preserveStartEnd" />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(v) => (v != null && !isNaN(Number(v)) ? Number(v).toLocaleString() : '')} />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [val != null && !isNaN(Number(val)) ? Number(val).toLocaleString() : (val != null ? String(val) : '-'), `${aggregation} of ${yAxisCol}`]}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name={`${aggregation}(${yAxisCol})`} 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#4f46e5' }} 
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} angle={-25} textAnchor="end" interval="preserveStartEnd" />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(v) => (v != null && !isNaN(Number(v)) ? Number(v).toLocaleString() : '')} />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [val != null && !isNaN(Number(val)) ? Number(val).toLocaleString() : (val != null ? String(val) : '-'), `${aggregation} of ${yAxisCol}`]}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    name={`${aggregation}(${yAxisCol})`} 
                    stroke="#6366f1" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              ) : chartType === 'pie' ? (
                <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [val != null && !isNaN(Number(val)) ? Number(val).toLocaleString() : (val != null ? String(val) : '-'), `${aggregation} of ${yAxisCol}`]}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={120}
                    paddingAngle={3}
                    label={(entry) => totalVal > 0 ? `${entry.name}: ${((entry.value / totalVal) * 100).toFixed(0)}%` : entry.name}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`pie-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                /* Scatter */
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" type="category" stroke="#71717a" fontSize={11} />
                  <YAxis dataKey="value" stroke="#71717a" fontSize={11} tickFormatter={(v) => (v != null && !isNaN(Number(v)) ? Number(v).toLocaleString() : '')} />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [val != null && !isNaN(Number(val)) ? Number(val).toLocaleString() : (val != null ? String(val) : '-'), yAxisCol]}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                  <Scatter name={`${yAxisCol} Scatter`} data={chartData} fill="#6366f1" />
                </ScatterChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
