import React, { useState, useEffect } from 'react';
import { 
  Database, 
  BarChart2, 
  Sparkles, 
  Code2, 
  TrendingUp, 
  Layers, 
  Table as TableIcon,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { 
  DatasetMeta, 
  DataProfile, 
  KpiMetric, 
  BusinessProblem, 
  AiRecommendation, 
  ChartRecommendation, 
  UserRole 
} from './types.js';
import { api } from './utils/api.js';

import { Navbar } from './components/Navbar.js';
import { FileUploader } from './components/FileUploader.js';
import { DataProfilingView } from './components/DataProfilingView.js';
import { KpiDashboard } from './components/KpiDashboard.js';
import { DynamicCharts } from './components/DynamicCharts.js';
import { AiBusinessAnalyst } from './components/AiBusinessAnalyst.js';
import { SqlStudio } from './components/SqlStudio.js';
import { ForecastingView } from './components/ForecastingView.js';
import { WhatIfSimulator } from './components/WhatIfSimulator.js';
import { PowerBiIntegration } from './components/PowerBiIntegration.js';
import { DataLineageModal } from './components/DataLineageModal.js';
import { ExportModal } from './components/ExportModal.js';
import { ArchitectureModal } from './components/ArchitectureModal.js';
import { SystemLogsModal } from './components/SystemLogsModal.js';

type AppTab = 'ingestion' | 'kpis' | 'charts' | 'ai_analyst' | 'sql_studio' | 'predictive' | 'power_bi';

export default function App() {
  // Core Data States
  const [currentDataset, setCurrentDataset] = useState<DatasetMeta | null>(null);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  const [problems, setProblems] = useState<BusinessProblem[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<{
    executiveSummary: string;
    keyDrivers: string[];
    riskFactors: string[];
    recommendations: AiRecommendation[];
    chartRecommendations: ChartRecommendation[];
  } | null>(null);

  // Interaction & Navigation States
  const [activeTab, setActiveTab] = useState<AppTab>('ingestion');
  const [userRole, setUserRole] = useState<UserRole>('Analyst');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [preloadedSql, setPreloadedSql] = useState<string>('');

  // Modals
  const [isLineageOpen, setIsLineageOpen] = useState(false);
  const [isPowerBiModalOpen, setIsPowerBiModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Initial Load on Mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async (retryCount = 0) => {
    setIsRefreshing(true);
    try {
      // 1. Fetch available datasets & active profile
      const [dsData, profData] = await Promise.all([
        api.getDatasets().catch(() => ({ activeId: '', datasets: [] })),
        api.getProfile()
      ]);
      
      if (dsData.datasets?.length) {
        setDatasets(dsData.datasets);
      }
      if (profData?.meta) {
        setCurrentDataset(profData.meta);
        setProfile(profData.profile);
      }

      // 2. Fetch automated KPIs & detected problems with isolated fallbacks
      const [kpiRes, probRes, sampleRes] = await Promise.all([
        api.getKpis().catch(() => ({ kpis: [] })),
        api.getProblems().catch(() => ({ problems: [] })),
        api.getDataSample(200).catch(() => ({ total: 0, rows: [] }))
      ]);
      setKpis(kpiRes.kpis || []);
      setProblems(probRes.problems || []);
      setRawRows(sampleRes.rows || []);

      // 3. Trigger initial AI analysis in background
      loadAiAnalysis();
    } catch (err) {
      console.warn('Initial data load attempt failed:', err);
      if (retryCount < 2) {
        setTimeout(() => loadInitialData(retryCount + 1), 600);
      } else {
        console.error('Initial data load error:', err);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadAiAnalysis = async () => {
    setIsLoadingAnalysis(true);
    try {
      const data = await api.analyzeWithAi();
      setAiAnalysis(data);
    } catch (err) {
      console.error('AI analysis error:', err);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleSelectDataset = async (id: string) => {
    setIsRefreshing(true);
    try {
      const res = await api.selectDataset(id);
      if (res.success) {
        setCurrentDataset(res.meta);
        const [profData, kpiRes, probRes, sampleRes] = await Promise.all([
          api.getProfile(),
          api.getKpis(),
          api.getProblems(),
          api.getDataSample(200)
        ]);
        setProfile(profData.profile);
        setKpis(kpiRes.kpis || []);
        setProblems(probRes.problems || []);
        setRawRows(sampleRes.rows || []);
        loadAiAnalysis();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUploadSuccess = (meta: DatasetMeta) => {
    setCurrentDataset(meta);
    loadInitialData();
  };

  const handleInvestigateProblemViaSql = (problem: BusinessProblem) => {
    let query = `SELECT * FROM uploaded_data LIMIT 25`;
    if (problem.category === 'Revenue / Profitability') {
      query = `SELECT * FROM uploaded_data WHERE profit < 0 ORDER BY profit ASC LIMIT 25`;
    } else if (problem.category === 'Inventory') {
      query = `SELECT sku_id, product_name, current_stock, reorder_point, lead_time_days FROM uploaded_data WHERE current_stock <= reorder_point`;
    } else if (problem.category === 'Customer Retention') {
      query = `SELECT month, SUM(churned_customers) as total_churn, AVG(churn_rate_pct) as avg_rate FROM uploaded_data GROUP BY month ORDER BY month ASC`;
    } else if (problem.category === 'Cost / Spend') {
      query = `SELECT department, budget, actual_spend, variance FROM uploaded_data WHERE variance > 0 ORDER BY variance DESC`;
    }
    setPreloadedSql(query);
    setActiveTab('sql_studio');
  };

  const handleAskAiAboutProblem = (problem: BusinessProblem) => {
    setActiveTab('ai_analyst');
  };

  const tabs: Array<{ id: AppTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'ingestion', label: '1. Ingestion & Schema', icon: <Database className="w-4 h-4" /> },
    { id: 'kpis', label: '2. KPIs & Risk Diagnosis', icon: <BarChart2 className="w-4 h-4" />, badge: problems.length || undefined },
    { id: 'charts', label: '3. Dynamic Charts', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'ai_analyst', label: '4. AI Executive Analyst', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'sql_studio', label: '5. SQL Studio & AI-to-SQL', icon: <Code2 className="w-4 h-4" /> },
    { id: 'predictive', label: '6. Forecasting & What-If', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'power_bi', label: '7. Power BI Integration', icon: <Layers className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-300 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. Header Navigation Bar */}
      <Navbar
        currentDataset={currentDataset}
        datasets={datasets}
        onSelectDataset={handleSelectDataset}
        userRole={userRole}
        onChangeRole={setUserRole}
        onOpenLineage={() => setIsLineageOpen(true)}
        onOpenPowerBi={() => setIsPowerBiModalOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        onRefreshData={loadInitialData}
        isRefreshing={isRefreshing}
      />

      {/* 2. Workflow Tab Stepper Strip */}
      <div className="bg-[#0f0f12]/95 border-b border-white/5 backdrop-blur-md sticky top-16 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1.5 overflow-x-auto py-2.5 scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    activeTab === t.id ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Canvas */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Tab 1: Ingestion & Schema Profiling */}
        {activeTab === 'ingestion' && (
          <div className="space-y-8">
            <FileUploader
              onUploadSuccess={handleUploadSuccess}
              onSelectPreset={handleSelectDataset}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />

            {profile && (
              <DataProfilingView
                profile={profile}
                rawSampleRows={rawRows}
                totalRawRows={currentDataset?.rowCount || rawRows.length}
              />
            )}
          </div>
        )}

        {/* Tab 2: KPIs & Business Problem Diagnosis */}
        {activeTab === 'kpis' && (
          <KpiDashboard
            kpis={kpis}
            problems={problems}
            onInvestigateProblem={handleInvestigateProblemViaSql}
            onAskAiAboutProblem={handleAskAiAboutProblem}
          />
        )}

        {/* Tab 3: Dynamic Charts Visualizer */}
        {activeTab === 'charts' && (
          profile ? (
            <DynamicCharts
              columns={profile.columns}
              records={rawRows}
              aiRecommendedCharts={aiAnalysis?.chartRecommendations}
            />
          ) : (
            <div className="bg-[#16161a] rounded-2xl border border-white/5 p-12 text-center text-slate-400">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">Loading dataset schema & visualizer...</p>
            </div>
          )
        )}

        {/* Tab 4: AI Executive Analyst */}
        {activeTab === 'ai_analyst' && (
          <AiBusinessAnalyst
            analysis={aiAnalysis}
            isLoadingAnalysis={isLoadingAnalysis}
            onRefreshAnalysis={loadAiAnalysis}
            onRunSqlInStudio={(sql) => {
              setPreloadedSql(sql);
              setActiveTab('sql_studio');
            }}
            datasetName={currentDataset?.name || 'Dataset'}
          />
        )}

        {/* Tab 5: SQL Studio & AI-to-SQL Engine */}
        {activeTab === 'sql_studio' && (
          <SqlStudio
            initialQuery={preloadedSql}
            tableName={currentDataset?.tableName || 'uploaded_data'}
          />
        )}

        {/* Tab 6: Predictive Forecasting & What-If Simulation */}
        {activeTab === 'predictive' && (
          profile ? (
            <div className="space-y-8">
              <ForecastingView columns={profile.columns} />
              <WhatIfSimulator />
            </div>
          ) : (
            <div className="bg-[#16161a] rounded-2xl border border-white/5 p-12 text-center text-slate-400">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">Loading predictive engine...</p>
            </div>
          )
        )}

        {/* Tab 7: Power BI Live Integration */}
        {activeTab === 'power_bi' && (
          <PowerBiIntegration />
        )}
      </main>

      {/* 4. Modals */}
      <DataLineageModal
        isOpen={isLineageOpen}
        onClose={() => setIsLineageOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        datasetMeta={currentDataset}
        profile={profile}
        kpis={kpis}
        problems={problems}
        recommendations={aiAnalysis?.recommendations || []}
        rawRows={rawRows}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      <SystemLogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0f0f12] py-6 text-center text-xs text-slate-500">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NexusAI Enterprise Decision Intelligence Platform • In-Memory SQL & Google Gemini 3.8 Flash</span>
          <span className="font-mono text-[11px] text-slate-400">Zero-Hallucination Empirical Grounding Architecture</span>
        </div>
      </footer>
    </div>
  );
}
