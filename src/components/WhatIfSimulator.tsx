import React, { useState, useEffect } from 'react';
import { Sliders, TrendingUp, TrendingDown, DollarSign, RotateCcw, Sparkles, Percent } from 'lucide-react';
import { WhatIfScenario } from '../types.js';

export const WhatIfSimulator: React.FC = () => {
  const [priceChange, setPriceChange] = useState<number>(0);
  const [volumeChange, setVolumeChange] = useState<number>(0);
  const [costChange, setCostChange] = useState<number>(0);
  const [churnChange, setChurnChange] = useState<number>(0);

  const [scenario, setScenario] = useState<WhatIfScenario | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    calculateScenario();
  }, [priceChange, volumeChange, costChange, churnChange]);

  const calculateScenario = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceChangePct: priceChange,
          volumeChangePct: volumeChange,
          costChangePct: costChange,
          churnChangePct: churnChange
        })
      });
      const data = await res.json();
      setScenario(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPriceChange(0);
    setVolumeChange(0);
    setCostChange(0);
    setChurnChange(0);
  };

  const applyPreset = (p: { price: number; volume: number; cost: number; churn: number }) => {
    setPriceChange(p.price);
    setVolumeChange(p.volume);
    setCostChange(p.cost);
    setChurnChange(p.churn);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#16161a] rounded-2xl border border-white/5 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Executive What-If Financial & Growth Scenario Simulator</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate sensitivity of net profit and gross revenue against dynamic operational variables in real time.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition border border-white/5 self-start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline</span>
          </button>
        </div>

        {/* Preset Executive Scenarios */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick Scenarios:</span>
          <button
            onClick={() => applyPreset({ price: 8, volume: -3, cost: 0, churn: 1 })}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0f0f12] hover:bg-white/5 text-slate-300 border border-white/5 transition"
          >
            +8% Price Optimization (-3% Vol)
          </button>
          <button
            onClick={() => applyPreset({ price: -5, volume: 15, cost: 2, churn: -1 })}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0f0f12] hover:bg-white/5 text-slate-300 border border-white/5 transition"
          >
            High Volume Blitz (-5% Price, +15% Vol)
          </button>
          <button
            onClick={() => applyPreset({ price: 0, volume: 0, cost: -10, churn: 0 })}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0f0f12] hover:bg-white/5 text-slate-300 border border-white/5 transition"
          >
            -10% COGS / Vendor Renegotiation
          </button>
          <button
            onClick={() => applyPreset({ price: 5, volume: 0, cost: -5, churn: -2 })}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0f0f12] hover:bg-white/5 text-slate-300 border border-white/5 transition"
          >
            Full Margin Expansion (+5% Price, -5% Cost)
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Price Change */}
          <div className="p-4 rounded-xl bg-[#0f0f12] border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Price / Rate Shift</span>
              <span className={`font-mono font-bold ${priceChange > 0 ? 'text-emerald-400' : priceChange < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {priceChange > 0 ? `+${priceChange}%` : `${priceChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              step={1}
              value={priceChange}
              onChange={(e) => setPriceChange(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-30%</span>
              <span>Baseline</span>
              <span>+30%</span>
            </div>
          </div>

          {/* Volume Change */}
          <div className="p-4 rounded-xl bg-[#0f0f12] border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Volume / Demand Shift</span>
              <span className={`font-mono font-bold ${volumeChange > 0 ? 'text-emerald-400' : volumeChange < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {volumeChange > 0 ? `+${volumeChange}%` : `${volumeChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              step={1}
              value={volumeChange}
              onChange={(e) => setVolumeChange(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-30%</span>
              <span>Baseline</span>
              <span>+30%</span>
            </div>
          </div>

          {/* Cost Shift */}
          <div className="p-4 rounded-xl bg-[#0f0f12] border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Cost of Goods / OpEx</span>
              <span className={`font-mono font-bold ${costChange > 0 ? 'text-rose-400' : costChange < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {costChange > 0 ? `+${costChange}%` : `${costChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              step={1}
              value={costChange}
              onChange={(e) => setCostChange(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-30%</span>
              <span>Baseline</span>
              <span>+30%</span>
            </div>
          </div>

          {/* Churn Change */}
          <div className="p-4 rounded-xl bg-[#0f0f12] border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Customer Attrition / Churn</span>
              <span className={`font-mono font-bold ${churnChange > 0 ? 'text-rose-400' : churnChange < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {churnChange > 0 ? `+${churnChange}%` : `${churnChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-10}
              max={10}
              step={0.5}
              value={churnChange}
              onChange={(e) => setChurnChange(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-10%</span>
              <span>Baseline</span>
              <span>+10%</span>
            </div>
          </div>
        </div>

        {/* Dynamic Simulation Output Cards */}
        {scenario && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {/* Projected Revenue */}
            <div className="p-5 rounded-xl bg-[#0f0f12] border border-white/5">
              <div className="text-xs text-slate-400 font-medium">Projected Revenue</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                ${scenario.projectedRevenue != null && !isNaN(Number(scenario.projectedRevenue)) ? Number(scenario.projectedRevenue).toLocaleString() : '0'}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-slate-400 font-mono">Baseline: ${scenario.baselineRevenue != null && !isNaN(Number(scenario.baselineRevenue)) ? Number(scenario.baselineRevenue).toLocaleString() : '0'}</span>
                <span className={`font-bold font-mono ${scenario.revenueDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {scenario.revenueDeltaPct >= 0 ? `+${scenario.revenueDeltaPct}%` : `${scenario.revenueDeltaPct}%`}
                </span>
              </div>
            </div>

            {/* Projected Profit */}
            <div className="p-5 rounded-xl bg-[#0f0f12] border border-white/5">
              <div className="text-xs text-slate-400 font-medium">Projected Gross Profit</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                ${scenario.projectedProfit != null && !isNaN(Number(scenario.projectedProfit)) ? Number(scenario.projectedProfit).toLocaleString() : '0'}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-slate-400 font-mono">Baseline: ${scenario.baselineProfit != null && !isNaN(Number(scenario.baselineProfit)) ? Number(scenario.baselineProfit).toLocaleString() : '0'}</span>
                <span className={`font-bold font-mono ${scenario.profitDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {scenario.profitDeltaPct >= 0 ? `+${scenario.profitDeltaPct}%` : `${scenario.profitDeltaPct}%`}
                </span>
              </div>
            </div>

            {/* Net Margin */}
            <div className="p-5 rounded-xl bg-[#0f0f12] border border-white/5">
              <div className="text-xs text-slate-400 font-medium">Projected Net Margin %</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                {scenario.projectedMarginPct}%
              </div>
              <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-slate-400 font-mono">Baseline: {scenario.baselineMarginPct}%</span>
                <span className={`font-bold font-mono ${scenario.projectedMarginPct >= scenario.baselineMarginPct ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(scenario.projectedMarginPct - scenario.baselineMarginPct).toFixed(1)}% shift
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
