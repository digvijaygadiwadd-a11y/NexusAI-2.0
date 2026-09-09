import React, { useState, useEffect } from 'react';
import { Layers, Copy, Check, ExternalLink, Code2, Database, ShieldCheck, Download, RefreshCw } from 'lucide-react';

export const PowerBiIntegration: React.FC = () => {
  const [metadata, setMetadata] = useState<{
    datasetName: string;
    endpointUrl: string;
    powerBiWebUrl: string;
    mCode: string;
    daxMeasures: { name: string; formula: string; description: string }[];
    instructions: string[];
  } | null>(null);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/powerbi/metadata')
      .then(res => res.json())
      .then(data => setMetadata(data))
      .catch(console.error);
  }, []);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!metadata) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading Power BI connector metadata...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Power BI Real-Time Integration Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  Live REST & OData Feed
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Directly connect Power BI Desktop and Power BI Service to NexusAI's live decision engine.
              </p>
            </div>
          </div>

          <a
            href={metadata.powerBiWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition border border-amber-500/20 self-start"
          >
            <span>Open Power BI Online</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Live Endpoint URL */}
        <div className="mt-5 p-4 rounded-xl bg-[#0f0f12] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Live JSON / REST Endpoint URL:</span>
            <button
              onClick={() => copyToClipboard(metadata.endpointUrl, 'url')}
              className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 text-xs transition"
            >
              {copiedSection === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'url' ? 'Copied URL' : 'Copy Endpoint'}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-indigo-300 bg-black/50 p-2.5 rounded-xl border border-white/5 truncate">
            {metadata.endpointUrl}
          </div>
          <p className="text-[11px] text-slate-400">
            Use Power BI Desktop &rarr; Get Data &rarr; Web &rarr; Paste this URL to stream real dataset records.
          </p>
        </div>

        {/* M-Code Generator */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Power Query M-Code (Copy-paste into Advanced Editor):</span>
            </span>
            <button
              onClick={() => copyToClipboard(metadata.mCode, 'mcode')}
              className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 text-xs transition"
            >
              {copiedSection === 'mcode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'mcode' ? 'Copied M-Code' : 'Copy Script'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-black/50 border border-white/5 text-[11px] font-mono text-indigo-300 overflow-x-auto">
            {metadata.mCode}
          </pre>
        </div>

        {/* DAX Measures */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
            Pre-Calculated DAX Business Measures for Power BI
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metadata.daxMeasures.map((dax, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[#0f0f12] border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{dax.name}</span>
                    <button
                      onClick={() => copyToClipboard(dax.formula, `dax-${i}`)}
                      className="text-slate-400 hover:text-indigo-300 transition"
                    >
                      {copiedSection === `dax-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <pre className="mt-2 p-2 rounded-lg bg-black/50 border border-white/5 text-[10px] font-mono text-indigo-300 overflow-x-auto">
                    {dax.formula}
                  </pre>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">{dax.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Connection Instructions:
          </span>
          <ol className="mt-2 space-y-1 text-xs text-slate-400 list-decimal list-inside leading-relaxed">
            {metadata.instructions.map((ins, idx) => (
              <li key={idx}><span className="text-slate-200">{ins}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};
