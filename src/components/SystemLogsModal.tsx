import React, { useState, useEffect } from 'react';
import { X, Activity, RefreshCw, Cpu, Server, Shield } from 'lucide-react';

interface SystemLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemLogsModal: React.FC<SystemLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLogsAndHealth();
    }
  }, [isOpen]);

  const fetchLogsAndHealth = async () => {
    setIsLoading(true);
    try {
      const [logsRes, healthRes] = await Promise.all([
        fetch('/api/system/logs').then(r => r.json()),
        fetch('/api/health').then(r => r.json())
      ]);
      setLogs(logsRes.logs || []);
      setHealth(healthRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#16161a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0f12]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">System Observability & Execution Telemetry</h3>
              <p className="text-[11px] text-slate-400">Node.js process stats, query latencies, and AI pipeline events</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogsAndHealth}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition border border-white/5"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Health Metrics Header */}
        {health && (
          <div className="grid grid-cols-4 gap-2 px-6 py-3 bg-black/40 border-b border-white/5 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Process Uptime</span>
              <div className="font-mono text-slate-200">{health.uptimeSeconds}s</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Heap Memory</span>
              <div className="font-mono text-slate-200">{health.memory?.heapUsedMb} MB</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono">RSS Total</span>
              <div className="font-mono text-slate-200">{health.memory?.rssMb} MB</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Gemini Gateway</span>
              <div className="font-mono text-emerald-400">{health.hasGeminiApiKey ? 'Live SDK' : 'Fallback'}</div>
            </div>
          </div>
        )}

        {/* Logs Feed */}
        <div className="p-6 overflow-y-auto space-y-2 font-mono text-[11px]">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No telemetry entries recorded yet.</div>
          ) : (
            logs.map((entry, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-black/50 border border-white/5 flex items-start space-x-3"
              >
                <span className="text-slate-500 shrink-0 text-[10px] pt-0.5 font-mono">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold shrink-0 ${
                  entry.level === 'ERROR' ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20' : entry.level === 'WARN' ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-indigo-400 border border-white/5'
                }`}>
                  {entry.level}
                </span>
                <span className="text-indigo-400 font-semibold shrink-0">[{entry.category}]</span>
                <span className="text-slate-300 flex-1 leading-tight">{entry.message}</span>
                {entry.durationMs !== undefined && (
                  <span className="text-emerald-400 font-bold shrink-0">{entry.durationMs}ms</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
