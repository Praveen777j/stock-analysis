import React, { useState } from 'react';
import { ModelSignal, BacktestResult, HistoricalBar, StockQuote } from '../../types';
import { EvaluationTab } from '../tabs/EvaluationTab';
import { ExplainabilityTab } from '../tabs/ExplainabilityTab';
import { BacktestPage } from '../BacktestPage';
import {
  Brain,
  Sliders,
  TrendingUp,
  ShieldAlert,
  BarChart2,
  CheckCircle2,
  Layers,
  HelpCircle
} from 'lucide-react';

interface ModelLabPageProps {
  signal: ModelSignal;
  backtest: BacktestResult;
  ticker: string;
}

type ModelLabSubTab = 'benchmark' | 'shap' | 'backtest';

export const ModelLabPage: React.FC<ModelLabPageProps> = ({
  signal,
  backtest,
  ticker
}) => {
  const [activeTab, setActiveTab] = useState<ModelLabSubTab>('benchmark');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Target Horizon Definition */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black font-mono text-slate-100">
                Nexus Quantitative Model Lab & Strategy Evaluation
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supervised algorithms, walk-forward out-of-fold validation, factor contribution attribution, and realistic backtesting.
            </p>
          </div>

          {/* Sub-Tab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Model Comparison</span>
            </button>
            <button
              onClick={() => setActiveTab('shap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'shap'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Factor contribution</span>
            </button>
            <button
              onClick={() => setActiveTab('backtest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'backtest'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Strategy Backtest</span>
            </button>
          </div>
        </div>

        {/* Prediction Target & Methodology Grounding Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block uppercase">Documented Target</span>
            <div className="font-bold text-slate-200 mt-0.5">5-Day Forward Return Direction</div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Classified as Bullish (&gt; +1.5%), Bearish (&lt; -1.5%), or Neutral (between -1.5% and +1.5%).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block uppercase">Validation Methodology</span>
            <div className="font-bold text-slate-200 mt-0.5">TimeSeriesSplit Cross-Validation</div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Strict chronological ordering. Prevents look-ahead bias and target leakage across historical market regimes.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block uppercase">Active Stock Evaluation</span>
            <div className="font-bold text-emerald-400 mt-0.5">{ticker}</div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Current model probability: {(signal.probabilities.BUY * 100).toFixed(1)}% Buy / {(signal.probabilities.SELL * 100).toFixed(1)}% Sell ({signal.exactAction} stance).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tab Viewport */}
      <div>
        {activeTab === 'benchmark' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <EvaluationTab />
          </div>
        )}

        {activeTab === 'shap' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <ExplainabilityTab signal={signal} />
          </div>
        )}

        {activeTab === 'backtest' && (
          <BacktestPage backtest={backtest} ticker={ticker} />
        )}
      </div>
    </div>
  );
};
