import React from 'react';
import { SentimentData, StockQuote, StockFundamentals } from '../../types';
import {
  Newspaper,
  Building2,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface NewsAndCatalystsPageProps {
  sentiment: SentimentData;
  quote: StockQuote;
  fundamentals: StockFundamentals;
}

export const NewsAndCatalystsPage: React.FC<NewsAndCatalystsPageProps> = ({
  sentiment,
  quote,
  fundamentals
}) => {
  const funds = quote.fundamentals || fundamentals;
  const articles = sentiment.articles;
  const grade = funds.financialHealthGrade || 'A';
  const de = funds.debtToEquity;
  const isCleanBalanceSheet = de !== undefined && de < 35;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Company Financials & Solvency Health Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-slate-400 text-xs block uppercase font-semibold">Sales YoY Growth</span>
          <div className="text-2xl font-bold text-emerald-400">
            {funds.revenueGrowthYoY || 'N/A'}
          </div>
          <div className="text-xs text-slate-400 font-sans">Top-Line Expansion</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-slate-400 text-xs block uppercase font-semibold">Profit Margin (PAT)</span>
          <div className="text-2xl font-bold text-slate-100">
            {funds.profitMarginPct !== undefined ? `${funds.profitMarginPct.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-xs text-slate-400 font-sans">Operating Margin Resilience</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-slate-400 text-xs block uppercase font-semibold">Debt-to-Equity</span>
          <div className={`text-2xl font-bold ${de !== undefined ? (isCleanBalanceSheet ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-400'}`}>
            {de !== undefined ? `${de.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-xs text-slate-400 font-sans">
            {de !== undefined ? (de === 0 ? 'Zero Debt' : isCleanBalanceSheet ? 'Conservative Leverage' : 'Moderate Debt') : 'Gearing Ratio'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-slate-400 text-xs block uppercase font-semibold">P/E Multiple</span>
          <div className="text-2xl font-bold text-indigo-400">
            {funds.peRatio !== undefined ? `${funds.peRatio}x` : 'N/A'}
          </div>
          <div className="text-xs text-slate-400 font-sans">
            Trailing Twelve Months
          </div>
        </div>
      </div>

      {/* 2. Verified Institutional Press Articles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Newspaper className="w-4 h-4 text-emerald-400" />
            Verified Financial Press Coverage
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            Economic Times · Mint · Moneycontrol · Reuters
          </span>
        </div>

        <div className="space-y-3">
          {articles.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 font-mono text-xs space-y-2">
              <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-semibold">News data unavailable</div>
              <p className="text-slate-500 text-[11px]">No live press articles found for {quote.ticker}. Synthetic news articles are disabled.</p>
            </div>
          ) : (
            articles.map((art, idx) => {
            const isPos = art.sentimentLabel === 'POSITIVE' || (art.vaderScore !== undefined && art.vaderScore >= 0.05);
            const isNeg = art.sentimentLabel === 'NEGATIVE' || (art.vaderScore !== undefined && art.vaderScore <= -0.05);
            const scoreVal = art.vaderScore ?? 0;
            return (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl transition-all space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                        {art.publisher}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{art.date}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        isPos
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : isNeg
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {isPos ? 'BULLISH CATALYST' : isNeg ? 'BEARISH OVERHANG' : 'NEUTRAL DISCLOSURE'}
                      </span>
                      {art.isCatalyst && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Corporate Catalyst
                        </span>
                      )}
                    </div>

                    <h5 className="text-sm font-semibold text-slate-100 leading-snug pt-0.5">
                      {art.url ? (
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-400 hover:underline transition-colors"
                        >
                          {art.title}
                        </a>
                      ) : (
                        art.title
                      )}
                    </h5>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans pt-0.5">
                      {art.summary}
                    </p>
                  </div>

                  <div className="sm:text-right shrink-0 font-mono text-xs bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 min-w-[120px]">
                    <span className="text-[10px] text-slate-500 uppercase block font-sans">VADER Polarity</span>
                    <span className={`text-base font-bold ${
                      scoreVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {scoreVal >= 0 ? '+' : ''}{scoreVal.toFixed(2)}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                      {isPos ? 'Positive Driver' : isNeg ? 'Downside Risk' : 'Routine Filing'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
};
