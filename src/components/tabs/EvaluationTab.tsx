import React from 'react';
import { getModelComparisonMetrics } from '../../dataEngine';

export const EvaluationTab: React.FC = () => {
  const comparison = getModelComparisonMetrics();

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 mb-3">
          Cross-Model Empirical Comparison & Classification Evaluation
        </h3>
        <p className="text-xs text-slate-400">
          Models evaluated out-of-fold using forward-walk <code>TimeSeriesSplit</code> cross-validation.
          Distinguishes supervised statistical accuracy from real financial trade execution performance.
        </p>
      </div>

      {/* Model Comparison Table */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Model Benchmarking Table
          </h4>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
            Illustrative reference values, not measured
          </span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-x-auto text-xs font-mono">
          <table className="w-full text-left">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Balanced Acc</th>
                <th className="py-2.5 px-3">Precision</th>
                <th className="py-2.5 px-3">Recall</th>
                <th className="py-2.5 px-3">Macro F1</th>
                <th className="py-2.5 px-3 text-right">Sharpe Ratio</th>
                <th className="py-2.5 px-3 text-right">Max Drawdown</th>
                <th className="py-2.5 px-3 text-right">Strategy Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {comparison.map((m, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-sans font-bold text-slate-100">{m.model}</td>
                  <td className="py-2.5 px-3">{m.accuracy.toFixed(1)}%</td>
                  <td className="py-2.5 px-3">{m.balancedAccuracy.toFixed(1)}%</td>
                  <td className="py-2.5 px-3">{m.precision.toFixed(1)}%</td>
                  <td className="py-2.5 px-3">{m.recall.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">{m.f1.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-indigo-400 font-semibold">{m.sharpe.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-rose-400">{m.maxDrawdown.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">+{m.totalReturn.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Critical Distinction Card */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-xs text-slate-400 space-y-2 leading-relaxed">
        <h4 className="text-slate-200 font-semibold text-xs">
          Academic Principle: Classification Performance vs. Trading Performance
        </h4>
        <p>
          High classification accuracy alone does not guarantee a profitable or safe trading strategy. A model can achieve 65% accuracy on small fluctuations while suffering massive capital drawdowns during regime shifts or volatility spikes.
        </p>
        <p>
          For this reason, this system evaluates both dimensions: statistical metrics (Accuracy, Macro-F1, Confusion Matrix) and economic portfolio metrics (Sharpe ratio, Maximum Drawdown, Profit Factor, Calmar ratio).
        </p>
      </div>
    </div>
  );
};
