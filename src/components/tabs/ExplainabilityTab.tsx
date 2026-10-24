import React from 'react';
import { ModelSignal } from '../../types';

interface ExplainabilityTabProps {
  signal: ModelSignal;
}

export const ExplainabilityTab: React.FC<ExplainabilityTabProps> = ({ signal }) => {
  return (
    <div className="space-y-6 pt-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 mb-3">
          Explainable AI: Factor Contribution Attribution
        </h3>
        <p className="text-xs text-slate-400">
          Quantifies the exact mathematical contribution of each technical indicator and financial sentiment signal to the model's decision margin.
        </p>
      </div>

      {/* Local Instance Contributions */}
      <section>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Local Attribution Summary for Active Trade Decision
        </h4>
        <div className="space-y-2">
          {signal.topContributions.map((fc, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-slate-900/40 px-3.5 py-2.5 rounded-lg border border-slate-800/60 font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${fc.direction === 'POSITIVE' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="font-semibold text-slate-200">{fc.feature}</span>
                <span className="text-slate-500 text-[11px]">(Value: {fc.value})</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-400 font-sans text-[11px] hidden sm:inline">{fc.description}</span>
                <span className={`font-bold ${fc.impact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fc.impact >= 0 ? '+' : ''}{fc.impact.toFixed(3)} Factor contribution
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Factor Contribution Mathematical Foundation Box */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-xs text-slate-400 space-y-2 leading-relaxed">
        <h4 className="text-slate-200 font-semibold text-xs">
          Mathematical Grounding: Factor Contribution & Shapley Value Decomposition
        </h4>
        <p>
          Decomposes the model decision output f(x) across input features i in F such that:
          <code className="text-emerald-400 font-mono block my-1">f(x) = phi_0 + sum(phi_i(x))</code>
          where phi_0 is the base expected value and phi_i(x) is the marginal factor contribution measuring the impact of feature i across all evaluated feature subsets.
        </p>
      </div>
    </div>
  );
};
