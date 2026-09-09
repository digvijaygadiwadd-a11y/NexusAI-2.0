import React, { useEffect, useState } from 'react';
import { X, GitBranch, Database, Cpu, Sparkles, Layers, ShieldCheck, ArrowDown, ArrowRight } from 'lucide-react';

interface DataLineageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataLineageModal: React.FC<DataLineageModalProps> = ({ isOpen, onClose }) => {
  const [lineage, setLineage] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/lineage')
        .then(res => res.json())
        .then(data => setLineage(data))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'source': return <Database className="w-4 h-4 text-emerald-400" />;
      case 'transform': return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'profiler': return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'database': return <Database className="w-4 h-4 text-blue-400" />;
      case 'ai': return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'consumer': return <Layers className="w-4 h-4 text-rose-400" />;
      default: return <GitBranch className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#16161a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0f12]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">End-to-End Data Lineage & Pipeline Architecture</h3>
              <p className="text-[11px] text-slate-400">Deterministic transformation DAG from raw ingestion to AI decisioning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lineage?.nodes.map((node, idx) => (
              <div
                key={node.id}
                className="p-4 rounded-xl bg-[#0f0f12] border border-white/5 flex items-start space-x-3.5 relative hover:border-indigo-500/30 transition group"
              >
                <div className="p-2 rounded-xl bg-white/5 shrink-0 mt-0.5 border border-white/5">
                  {getNodeIcon(node.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5">
                      Step {idx + 1} • {node.type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1.5 group-hover:text-indigo-400 transition">
                    {node.label}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {node.details}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl bg-black/50 border border-white/5 text-xs text-slate-400 space-y-2">
            <span className="font-semibold text-slate-300">Deterministic Flow Guarantee:</span>
            <p className="text-[11px] leading-relaxed">
              Every data point ingested passes through rigorous type verification, outlier quarantine fencing, and SQL schema loading. No AI hallucinations are permitted in the foundational metric layer; all AI synthesis strictly references aggregate outputs from the query execution engine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
