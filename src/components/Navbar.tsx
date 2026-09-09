import React, { useState } from 'react';
import { 
  BarChart3, 
  Database, 
  GitBranch, 
  Download, 
  Cpu, 
  Activity, 
  Layers, 
  Unlock, 
  ChevronDown, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { DatasetMeta, UserRole } from '../types.js';

interface NavbarProps {
  currentDataset: DatasetMeta | null;
  datasets: DatasetMeta[];
  onSelectDataset: (id: string) => void;
  userRole?: UserRole;
  onChangeRole?: (role: UserRole) => void;
  onOpenLineage: () => void;
  onOpenPowerBi: () => void;
  onOpenExport: () => void;
  onOpenArchitecture: () => void;
  onOpenLogs: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDataset,
  datasets,
  onSelectDataset,
  onOpenLineage,
  onOpenPowerBi,
  onOpenExport,
  onOpenArchitecture,
  onOpenLogs,
  onRefreshData,
  isRefreshing
}) => {
  const [showDatasetDropdown, setShowDatasetDropdown] = useState(false);

  return (
    <header className="bg-[#0f0f12] border-b border-white/5 text-slate-200 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">Nexus<span className="text-indigo-400">AI</span></span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase tracking-wider">
                Enterprise Intelligence
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Automated Data Profiling • Statistical Diagnosis • AI Analytics</p>
          </div>
        </div>

        {/* Center: Active Dataset Switcher */}
        <div className="relative">
          <button
            id="btn-dataset-selector"
            onClick={() => setShowDatasetDropdown(!showDatasetDropdown)}
            className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl bg-[#16161a] hover:bg-white/5 border border-white/5 text-sm font-medium transition text-slate-200"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="max-w-[160px] sm:max-w-[220px] truncate">
              {currentDataset ? currentDataset.name : 'Select Dataset'}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
              {currentDataset ? `${currentDataset.rowCount} rows` : '0'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showDatasetDropdown && (
            <div className="absolute left-0 mt-2 w-80 rounded-xl bg-[#16161a] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 flex justify-between items-center">
                <span>Select Enterprise Dataset</span>
                <span className="text-[10px] text-indigo-400 font-mono">{datasets.length} available</span>
              </div>
              <div className="mt-1 space-y-1 max-h-64 overflow-y-auto">
                {datasets.map(d => (
                  <button
                    key={d.id}
                    id={`btn-dataset-${d.id}`}
                    onClick={() => {
                      onSelectDataset(d.id);
                      setShowDatasetDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center justify-between transition ${
                      currentDataset?.id === d.id
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-medium'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-slate-200 truncate">{d.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5 font-mono">
                        <span className="capitalize">{d.sourceType}</span>
                        <span>•</span>
                        <span>{d.rowCount} records</span>
                        <span>•</span>
                        <span>{d.columnCount} columns</span>
                      </div>
                    </div>
                    {currentDataset?.id === d.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions, RBAC Role, and Auxiliaries */}
        <div className="flex items-center space-x-2">
          {/* Refresh Data Button */}
          <button
            id="btn-refresh-data"
            onClick={onRefreshData}
            title="Recalculate KPIs and refresh state"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Lineage DAG Modal Button */}
          <button
            id="btn-open-lineage"
            onClick={onOpenLineage}
            title="View End-to-End Data Lineage"
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-medium transition"
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lineage</span>
          </button>

          {/* Power BI Integration Button */}
          <button
            id="btn-open-powerbi"
            onClick={onOpenPowerBi}
            title="Power BI Connector & Live Endpoint"
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-medium transition"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Power BI</span>
          </button>

          {/* Architecture & Docs */}
          <button
            id="btn-open-architecture"
            onClick={onOpenArchitecture}
            title="Architecture & Pipeline Diagram"
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-medium transition"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Architecture</span>
          </button>

          {/* System Logs */}
          <button
            id="btn-open-logs"
            onClick={onOpenLogs}
            title="System Observability & Query Latency"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 transition"
          >
            <Activity className="w-4 h-4 text-rose-400" />
          </button>

          {/* Export Report */}
          <button
            id="btn-open-export"
            onClick={onOpenExport}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Free & Open Access Badge */}
          <div 
            id="badge-open-access"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium"
            title="Authentication removed - All features, datasets, SQL execution, and AI capabilities are free and accessible to everyone"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Free & Open Access</span>
          </div>
        </div>
      </div>
    </header>
  );
};
