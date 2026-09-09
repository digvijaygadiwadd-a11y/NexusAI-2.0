import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileCode, Database, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { DatasetMeta } from '../types.js';

interface FileUploaderProps {
  onUploadSuccess: (meta: DatasetMeta) => void;
  onSelectPreset: (id: string) => void;
  isUploading: boolean;
  setIsUploading: (loading: boolean) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  onSelectPreset,
  isUploading,
  setIsUploading
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [rawDataType, setRawDataType] = useState<'csv' | 'json' | 'sql'>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setSuccessMessage(null);

    try {
      const fileName = file.name;
      const fileExt = fileName.split('.').pop()?.toLowerCase();

      let payload: any = { fileName, fileType: fileExt };

      if (fileExt === 'xlsx' || fileExt === 'xls') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const buffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          await submitUpload({ ...payload, fileContent: base64, isBase64: true });
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result as string;
          await submitUpload({ ...payload, fileContent: content, isBase64: false });
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      setUploadError(err.message || 'File processing failed');
      setIsUploading(false);
    }
  };

  const submitUpload = async (payload: any) => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload error');
      }
      setSuccessMessage(`Successfully processed "${data.meta.name}" with ${data.meta.rowCount} records and ${data.meta.columnCount} columns.`);
      onUploadSuccess(data.meta);
    } catch (err: any) {
      setUploadError(err.message || 'Server upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!rawText.trim()) {
      setUploadError('Please enter data text to parse');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          fileType: rawDataType,
          fileName: `Pasted ${rawDataType.toUpperCase()} Data`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Processing failed');
      setSuccessMessage(`Successfully ingested ${data.meta.rowCount} records from pasted text.`);
      onUploadSuccess(data.meta);
      setRawText('');
    } catch (err: any) {
      setUploadError(err.message || 'Pasted data could not be parsed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-[#16161a] rounded-2xl border border-white/5 p-6 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <span>Universal Business Data Ingestion Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Accepts CSV, Excel (.xlsx/.xls), JSON arrays, and SQL exports. Automatically detects schemas, types, and anomalies.
          </p>
        </div>

        {/* Ingestion Mode Toggle */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-white/5 self-start">
          <button
            id="tab-upload-file"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            File Upload
          </button>
          <button
            id="tab-paste-data"
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'paste' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw SQL / JSON / CSV Paste
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Upload / Paste Body */}
      {activeTab === 'upload' ? (
        <div className="mt-6">
          <div
            id="dropzone-area"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
              dragActive
                ? 'border-indigo-400 bg-indigo-950/20'
                : 'border-white/10 hover:border-indigo-500/50 bg-[#0f0f12]/70 hover:bg-[#0f0f12]'
            }`}
          >
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls,.json,.sql"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
              <Upload className="w-7 h-7 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {isUploading ? 'Ingesting, parsing & validating schema...' : 'Drag & drop business dataset here, or browse files'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports CSV, Excel (.xlsx, .xls), JSON, and SQL DDL/INSERT scripts (up to 50MB)
            </p>

            {/* Supported format badges */}
            <div className="flex items-center space-x-2 mt-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] bg-white/5 text-emerald-400 border border-white/5">
                <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel / CSV
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] bg-white/5 text-amber-400 border border-white/5">
                <FileCode className="w-3 h-3 mr-1" /> JSON
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] bg-white/5 text-indigo-400 border border-white/5">
                <Database className="w-3 h-3 mr-1" /> SQL Dumps
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-medium">Data Format:</span>
              {(['csv', 'json', 'sql'] as const).map(fmt => (
                <label key={fmt} className="inline-flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="data-format"
                    checked={rawDataType === fmt}
                    onChange={() => setRawDataType(fmt)}
                    className="text-indigo-500 focus:ring-0 bg-black/40 border-white/10"
                  />
                  <span className="uppercase">{fmt}</span>
                </label>
              ))}
            </div>
            <button
              id="btn-load-sample-snippet"
              onClick={() => {
                if (rawDataType === 'json') {
                  setRawText(JSON.stringify([
                    { product: 'Analytics Pro', q1_rev: 45000, q2_rev: 52000, margin_pct: 32 },
                    { product: 'Enterprise Suite', q1_rev: 120000, q2_rev: 145000, margin_pct: 48 },
                    { product: 'API Connector', q1_rev: 18000, q2_rev: 21000, margin_pct: 65 }
                  ], null, 2));
                } else if (rawDataType === 'sql') {
                  setRawText(`CREATE TABLE sales (id INT, region VARCHAR(50), revenue DECIMAL(10,2), units INT);
INSERT INTO sales (id, region, revenue, units) VALUES
(1, 'North America', 45000.00, 120),
(2, 'Europe', 38000.00, 95),
(3, 'Asia-Pacific', 54000.00, 180);`);
                } else {
                  setRawText(`month,department,budget,actual,variance
2024-01,Engineering,150000,162000,12000
2024-01,Marketing,80000,95000,15000
2024-01,Customer Support,40000,38000,-2000`);
                }
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Load Sample Snippet</span>
            </button>
          </div>

          <textarea
            id="raw-text-area"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              rawDataType === 'json'
                ? '[{"category": "Cloud", "spend": 4500}, ...]'
                : rawDataType === 'sql'
                ? 'INSERT INTO orders (id, amount, status) VALUES (1, 500, "Completed");'
                : 'region,revenue,units\nEast,14500,20\nWest,21000,35'
            }
            rows={7}
            className="w-full rounded-xl bg-black/50 border border-white/10 p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          />

          <div className="flex justify-end">
            <button
              id="btn-process-pasted-data"
              onClick={handlePasteSubmit}
              disabled={isUploading || !rawText.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <span>{isUploading ? 'Parsing & Ingesting...' : 'Parse & Profile Dataset'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Preset Enterprise Datasets Section */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Or Load Production-Grade Enterprise Benchmark Datasets:
          </span>
          <span className="text-[11px] text-indigo-400">Pre-calibrated for instant testing</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            id="btn-preset-saas"
            onClick={() => onSelectPreset('saas-metrics')}
            className="text-left p-3.5 rounded-xl bg-[#0f0f12] hover:bg-white/[0.04] border border-white/5 hover:border-indigo-500/40 transition group"
          >
            <div className="text-xs font-semibold text-white group-hover:text-indigo-400 transition">
              SaaS B2B Subscription
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              MRR cohorts, ARR, CAC, LTV, churn spikes, NPS scores across Enterprise & Growth tiers.
            </p>
          </button>

          <button
            id="btn-preset-ecommerce"
            onClick={() => onSelectPreset('ecommerce-retail')}
            className="text-left p-3.5 rounded-xl bg-[#0f0f12] hover:bg-white/[0.04] border border-white/5 hover:border-emerald-500/40 transition group"
          >
            <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition">
              Omnichannel Retail & Margin
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Transaction order log, regional shipping, discount rates, product returns, and negative margins.
            </p>
          </button>

          <button
            id="btn-preset-supply-chain"
            onClick={() => onSelectPreset('supply-chain')}
            className="text-left p-3.5 rounded-xl bg-[#0f0f12] hover:bg-white/[0.04] border border-white/5 hover:border-amber-500/40 transition group"
          >
            <div className="text-xs font-semibold text-white group-hover:text-amber-400 transition">
              Supply Chain & Inventory
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Warehouse SKU stock, reorder levels, supplier lead times, turnover ratios, and stockout risks.
            </p>
          </button>

          <button
            id="btn-preset-opex"
            onClick={() => onSelectPreset('corporate-opex')}
            className="text-left p-3.5 rounded-xl bg-[#0f0f12] hover:bg-white/[0.04] border border-white/5 hover:border-purple-500/40 transition group"
          >
            <div className="text-xs font-semibold text-white group-hover:text-purple-400 transition">
              Corporate Financial OpEx
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Departmental budgets vs actual expenditures, vendor allocations, and over-budget variance.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
