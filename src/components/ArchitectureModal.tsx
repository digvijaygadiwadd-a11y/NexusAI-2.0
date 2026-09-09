import React, { useState } from 'react';
import { X, Cpu, Server, ShieldCheck, Zap, Database, Terminal, Check } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'docker' | 'specs'>('architecture');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const dockerfileSnippet = `# Multi-Stage High-Performance Production Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.cjs"]`;

  const copyDocker = () => {
    navigator.clipboard.writeText(dockerfileSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#16161a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0f12]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">FAANG-Grade System Architecture & Blueprint</h3>
              <p className="text-[11px] text-slate-400">High-throughput in-memory SQL processing & Gemini AI orchestration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 pt-3 border-b border-white/5 space-x-4 bg-[#0f0f12]/50 text-xs">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`pb-2.5 font-semibold transition border-b-2 ${
              activeTab === 'architecture' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System Topology
          </button>
          <button
            onClick={() => setActiveTab('docker')}
            className={`pb-2.5 font-semibold transition border-b-2 ${
              activeTab === 'docker' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Container & Cloud Run (Dockerfile)
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-2.5 font-semibold transition border-b-2 ${
              activeTab === 'specs' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Performance SLA & Specs
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0f0f12] border border-white/5 space-y-2">
                <div className="flex items-center space-x-2 text-white font-bold">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>Dual Execution Core</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  NexusAI couples a real-time in-memory SQL compiler (<code className="text-indigo-300 font-mono">alasql</code>) with Google's latest <code className="text-pink-300 font-mono">gemini-3.8-flash</code> reasoning model.
                  Analytical aggregations run strictly against compiled SQL tables at native microsecond speeds, while the generative AI layer interprets macro trends, formulates what-if hypotheses, and generates verified queries.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5 space-y-1">
                  <div className="font-semibold text-white">1. Ingestion & Schema Detection</div>
                  <p className="text-[11px] text-slate-400">
                    High-efficiency streaming parser reading XLSX, CSV, JSON, and SQL dumps. Heuristically classifies semantic data types (currency, percentage, categorical, dates).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5 space-y-1">
                  <div className="font-semibold text-white">2. Statistical Profiling & Outliers</div>
                  <p className="text-[11px] text-slate-400">
                    Calculates Interquartile Range (IQR = Q3 - Q1) outer fences (1.5 * IQR) to mathematically isolate true outliers from statistical variance.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5 space-y-1">
                  <div className="font-semibold text-white">3. Zero-Hallucination Guardrails</div>
                  <p className="text-[11px] text-slate-400">
                    Every KPI, chart point, and simulation result is backed by executed code. Recommendations output executable SQL verification scripts.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5 space-y-1">
                  <div className="font-semibold text-white">4. Power BI Live Feed</div>
                  <p className="text-[11px] text-slate-400">
                    Exposes standard REST JSON and OData endpoints consumed by Power BI desktop and web services without third-party middleware.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Production Multi-Stage Dockerfile:</span>
                <button
                  onClick={copyDocker}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Dockerfile'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/50 border border-white/5 text-[11px] font-mono text-indigo-300 overflow-x-auto leading-relaxed">
                {dockerfileSnippet}
              </pre>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5">
                  <div className="text-slate-400 text-[11px]">Average SQL Query Latency</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-1">&lt; 5 ms</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5">
                  <div className="text-slate-400 text-[11px]">Schema Profiling Speed</div>
                  <div className="text-xl font-bold text-indigo-400 font-mono mt-1">&lt; 40 ms</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5">
                  <div className="text-slate-400 text-[11px]">In-Memory Capacity</div>
                  <div className="text-xl font-bold text-pink-400 font-mono mt-1">Up to 250k rows</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5">
                  <div className="text-slate-400 text-[11px]">Target Port Routing</div>
                  <div className="text-xl font-bold text-amber-400 font-mono mt-1">0.0.0.0:3000</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
