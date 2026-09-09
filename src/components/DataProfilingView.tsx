import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Table as TableIcon, 
  Search, 
  Filter, 
  Sparkles, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Hash
} from 'lucide-react';
import { DataProfile, ColumnSchema } from '../types.js';

interface DataProfilingViewProps {
  profile: DataProfile;
  rawSampleRows: Record<string, any>[];
  totalRawRows: number;
}

export const DataProfilingView: React.FC<DataProfilingViewProps> = ({
  profile,
  rawSampleRows,
  totalRawRows
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'schema' | 'quality' | 'preview'>('schema');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter raw rows for preview
  const filteredRows = rawSampleRows.filter(row => {
    if (!searchQuery) return true;
    return Object.values(row).some(v => 
      String(v).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'currency': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'percentage': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'integer':
      case 'float': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'date': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'categorical': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'boolean': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'id': return 'bg-white/5 text-slate-300 border-white/5';
      default: return 'bg-white/5 text-slate-400 border-white/5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Profiling Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Health Score Gauge */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-[#16161a] rounded-2xl border border-white/5 p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Data Health Index</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-2 flex items-baseline space-x-2">
            <span className={`text-3xl font-extrabold tracking-tight font-mono ${
              profile.healthScore >= 85 ? 'text-emerald-400' : profile.healthScore >= 70 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {profile.healthScore}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-500 ${
                profile.healthScore >= 85 ? 'bg-emerald-500' : profile.healthScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${profile.healthScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {profile.healthScore >= 85 ? 'Verified high-integrity data' : 'Minor cleanings recommended'}
          </p>
        </div>

        {/* Total Ingested Records */}
        <div className="bg-[#16161a] rounded-2xl border border-white/5 p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-medium">Total Records</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {profile.totalRows != null && !isNaN(Number(profile.totalRows)) ? Number(profile.totalRows).toLocaleString() : '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
            <span className="text-indigo-400 font-mono">{profile.totalColumns}</span>
            <span>schema columns detected</span>
          </div>
        </div>

        {/* Duplicate Rows */}
        <div className="bg-[#16161a] rounded-2xl border border-white/5 p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-medium">Duplicate Rows</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${profile.duplicateRows > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {profile.duplicateRows}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            {profile.duplicateRows === 0 ? '0% duplication detected' : `${((profile.duplicateRows / Math.max(1, profile.totalRows)) * 100).toFixed(1)}% duplication rate`}
          </div>
        </div>

        {/* Missing Cells */}
        <div className="bg-[#16161a] rounded-2xl border border-white/5 p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-medium">Missing Cells</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${profile.totalMissingCells > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {profile.totalMissingCells}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            {((profile.totalMissingCells / Math.max(1, profile.totalRows * profile.totalColumns)) * 100).toFixed(1)}% sparsity
          </div>
        </div>

        {/* Quality Alerts count */}
        <div className="bg-[#16161a] rounded-2xl border border-white/5 p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-medium">Quality Anomalies</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${profile.dataQualityIssues.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {profile.dataQualityIssues.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            {profile.dataQualityIssues.filter(i => i.severity === 'high').length} critical issues
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Schema Definition vs Data Quality Issues vs Live Table Preview */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0f12]">
          <div className="flex items-center space-x-2">
            <button
              id="subtab-schema"
              onClick={() => setActiveSubTab('schema')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeSubTab === 'schema'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Schema & Inferred Types ({profile.columns.length})
            </button>
            <button
              id="subtab-quality"
              onClick={() => setActiveSubTab('quality')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeSubTab === 'quality'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span>Quality & Outlier Inspector</span>
              {profile.dataQualityIssues.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                  {profile.dataQualityIssues.length}
                </span>
              )}
            </button>
            <button
              id="subtab-preview"
              onClick={() => setActiveSubTab('preview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeSubTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Raw Table Preview ({totalRawRows})</span>
            </button>
          </div>

          {activeSubTab === 'preview' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search raw values..."
                className="pl-8 pr-3 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-48 sm:w-64 font-mono"
              />
            </div>
          )}
        </div>

        {/* 1. Inferred Schema Table */}
        {activeSubTab === 'schema' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0f0f12] text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-3">Column Name</th>
                  <th className="px-4 py-3">Inferred Type</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Missing Cells</th>
                  <th className="px-4 py-3">Unique Values</th>
                  <th className="px-4 py-3">Summary Stats / IQR</th>
                  <th className="px-6 py-3">Sample Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {profile.columns.map((col) => (
                  <tr key={col.name} className="hover:bg-white/[0.03] transition">
                    <td className="px-6 py-3 font-semibold text-white font-sans flex items-center space-x-2">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      <span>{col.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold tracking-wider ${getTypeBadgeClass(col.type)}`}>
                        {col.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      {col.isMetricCandidate ? (
                        <span className="text-emerald-400 font-medium">Metric (Numeric)</span>
                      ) : col.isTimeCandidate ? (
                        <span className="text-indigo-400 font-medium">Time Dimension</span>
                      ) : (
                        <span className="text-amber-400 font-medium">Categorical Dimension</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {col.nullCount > 0 ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-amber-400 font-bold">{col.nullCount}</span>
                          <span className="text-slate-400 text-[10px]">({col.nullPercentage}%)</span>
                        </div>
                      ) : (
                        <span className="text-emerald-400 flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>0%</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {col.uniqueCount} distinct
                    </td>
                    <td className="px-4 py-3 font-sans">
                      {col.stats ? (
                        <div className="text-[11px] text-slate-300 space-y-0.5">
                          <div>
                            <span className="text-slate-500">Range:</span> [{col.stats.min} ... {col.stats.max}]
                          </div>
                          <div>
                            <span className="text-slate-500">Mean:</span> {col.stats.mean} | <span className="text-slate-500">IQR:</span> {col.stats.iqr}
                          </div>
                          {col.stats.outlierCount ? (
                            <div className="text-rose-400 font-medium text-[10px]">
                              {col.stats.outlierCount} outlier(s) detected
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Non-numeric</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                      {col.sampleValues.map(v => JSON.stringify(v)).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Data Quality & Outlier Inspector */}
        {activeSubTab === 'quality' && (
          <div className="p-6 space-y-4">
            {profile.dataQualityIssues.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">Flawless Data Cleanliness Verified</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Zero critical missing value spikes, no duplicate rows, and no statistical anomalies exceeding threshold tolerances.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.dataQualityIssues.map((issue, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border flex items-start space-x-4 transition ${
                      issue.severity === 'high'
                        ? 'bg-rose-500/10 border-rose-500/20'
                        : issue.severity === 'medium'
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-indigo-500/10 border-indigo-500/20'
                    }`}
                  >
                    <div className="mt-0.5">
                      {issue.severity === 'high' ? (
                        <ShieldAlert className="w-5 h-5 text-rose-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {issue.column && (
                          <span className="px-2 py-0.5 rounded-lg bg-black/40 text-slate-200 text-xs font-mono font-medium border border-white/5">
                            {issue.column}
                          </span>
                        )}
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                          issue.severity === 'high' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {issue.severity} priority
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white mt-1.5">
                        {issue.issue}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        <span className="text-indigo-400 font-medium">Recommended Action: </span>
                        {issue.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Raw Table Preview */}
        {activeSubTab === 'preview' && (
          <div>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0f0f12] text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-mono">#</th>
                    {profile.columns.map(c => (
                      <th key={c.name} className="px-4 py-3 whitespace-nowrap">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition">
                      <td className="px-4 py-2.5 text-slate-500 font-sans">
                        {(currentPage - 1) * rowsPerPage + idx + 1}
                      </td>
                      {profile.columns.map(c => (
                        <td key={c.name} className="px-4 py-2.5 whitespace-nowrap text-slate-200">
                          {row[c.name] !== null && row[c.name] !== undefined ? String(row[c.name]) : (
                            <span className="text-slate-600 italic">null</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 bg-[#0f0f12]">
              <span>
                Showing {Math.min(filteredRows.length, (currentPage - 1) * rowsPerPage + 1)} - {Math.min(filteredRows.length, currentPage * rowsPerPage)} of {filteredRows.length} rows
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 transition border border-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 transition border border-white/5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
