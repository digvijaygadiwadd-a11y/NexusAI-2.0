import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { DatasetMeta, DataProfile, KpiMetric, BusinessProblem, AiRecommendation } from '../types.js';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetMeta: DatasetMeta | null;
  profile: DataProfile | null;
  kpis: KpiMetric[];
  problems: BusinessProblem[];
  recommendations: AiRecommendation[];
  rawRows: Record<string, any>[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  datasetMeta,
  profile,
  kpis,
  problems,
  recommendations,
  rawRows
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const title = datasetMeta?.name || 'Dataset';

      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text('NexusAI Decision Intelligence Report', 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Dataset: ${title} | Generated: ${new Date().toLocaleDateString()} | Health Index: ${profile?.healthScore || 100}/100`, 14, 30);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, 34, 196, 34);

      // Section 1: KPIs
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Executive Business Metrics (KPIs)', 14, 44);

      let yPos = 52;
      kpis.slice(0, 6).forEach((kpi) => {
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(`• ${kpi.title}: ${kpi.formattedValue} (${kpi.aggregation} of ${kpi.column})`, 16, yPos);
        yPos += 7;
      });

      // Section 2: Detected Problems
      yPos += 5;
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('2. Diagnosed Business Hazards & Anomalies', 14, yPos);
      yPos += 8;

      problems.slice(0, 3).forEach((prob) => {
        doc.setFontSize(10);
        doc.setTextColor(185, 28, 28);
        doc.text(`[${prob.severity.toUpperCase()}] ${prob.title} (Impact: ${prob.impactScore})`, 16, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const firstEv = prob.evidence && prob.evidence[0];
        const evidenceStr = firstEv
          ? typeof firstEv === 'object'
            ? `${firstEv.metricName || 'Metric'}: ${firstEv.dataPoint ?? ''}${firstEv.context ? ` (${firstEv.context})` : ''}`
            : String(firstEv)
          : 'Statistical variance detected';
        doc.text(`Evidence: ${evidenceStr}`, 18, yPos);
        yPos += 5;
        doc.text(`Action: ${prob.suggestedAction || prob.recommendedAction || 'Continuous monitoring'}`, 18, yPos);
        yPos += 8;
      });

      // Section 3: Strategic Recommendations
      yPos += 4;
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('3. Evidence-Backed Strategic Recommendations', 14, yPos);
      yPos += 8;

      recommendations.slice(0, 3).forEach((rec) => {
        doc.setFontSize(10);
        doc.setTextColor(3, 105, 161);
        doc.text(`• ${rec.title} (${rec.strategicArea})`, 16, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Impact: ${rec.impactEstimate} | Effort: ${rec.effortLevel}`, 18, yPos);
        yPos += 5;
        doc.text(`Summary: ${rec.summary}`, 18, yPos, { maxWidth: 175 });
        yPos += 10;
      });

      doc.save(`NexusAI_Report_${Date.now()}.pdf`);
      setSuccessMsg('PDF Report exported successfully.');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Raw Data
      const wsRaw = XLSX.utils.json_to_sheet(rawRows.slice(0, 5000));
      XLSX.utils.book_append_sheet(wb, wsRaw, 'Raw_Dataset');

      // Sheet 2: KPIs
      const kpiData = kpis.map(k => ({
        Metric: k.title,
        Value: k.formattedValue,
        Category: k.category,
        Column: k.column,
        Formula: `${k.aggregation}(${k.column})`
      }));
      const wsKpi = XLSX.utils.json_to_sheet(kpiData);
      XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI_Summary');

      // Sheet 3: Problems
      const probData = problems.map(p => ({
        Severity: p.severity,
        Category: p.category,
        Title: p.title,
        Impact: p.impactScore,
        PrescribedAction: p.suggestedAction
      }));
      const wsProb = XLSX.utils.json_to_sheet(probData);
      XLSX.utils.book_append_sheet(wb, wsProb, 'Risk_Analysis');

      XLSX.writeFile(wb, `NexusAI_DataExport_${Date.now()}.xlsx`);
      setSuccessMsg('Excel (.xlsx) multi-sheet workbook generated and downloaded.');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    if (!rawRows || rawRows.length === 0) return;
    const cols = Object.keys(rawRows[0] || {});
    const headerLine = cols.map(c => `"${c}"`).join(',');
    const rowLines = rawRows.map(row => 
      cols.map(c => {
        const v = row[c];
        return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',')
    );
    const csvContent = [headerLine, ...rowLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NexusAI_RawData_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessMsg('CSV file downloaded successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#16161a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0f12]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Download className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Export Intelligence Reports & Data</h3>
              <p className="text-[11px] text-slate-400">Generate executive briefings and validated tabular extracts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="w-full p-4 rounded-xl bg-[#0f0f12] hover:bg-white/5 border border-white/5 hover:border-indigo-500/30 text-left transition flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition">
                    Executive Briefing (PDF Report)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Formal executive document including automated KPIs, risk diagnosis, and strategic action plans.
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition" />
            </button>

            {/* Excel */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-full p-4 rounded-xl bg-[#0f0f12] hover:bg-white/5 border border-white/5 hover:border-emerald-500/30 text-left transition flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                    Complete Excel Workbook (.xlsx)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Multi-sheet workbook containing raw records, automated KPI summaries, and anomaly logs.
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
            </button>

            {/* CSV */}
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="w-full p-4 rounded-xl bg-[#0f0f12] hover:bg-white/5 border border-white/5 hover:border-indigo-500/30 text-left transition flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition">
                    Raw CSV Extract (.csv)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Raw delimited flat file extract for importing into external data warehouses or pandas.
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
