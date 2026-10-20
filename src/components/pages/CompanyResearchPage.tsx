import React, { useState } from 'react';
import { StockQuote, StockFundamentals, BenchmarkData } from '../../types';
import { BalanceSheetPage } from './BalanceSheetPage';
import { InvestmentAnalysisPage } from './InvestmentAnalysisPage';
import {
  Building2,
  ShieldCheck,
  BarChart3,
  Scale,
  Layers,
  ExternalLink,
  Info
} from 'lucide-react';

interface CompanyResearchPageProps {
  quote: StockQuote;
  fundamentals?: StockFundamentals;
  benchmark?: BenchmarkData;
}

type ResearchTab = 'financials' | 'moat';

export const CompanyResearchPage: React.FC<CompanyResearchPageProps> = ({
  quote,
  fundamentals,
  benchmark
}) => {
  const [activeTab, setActiveTab] = useState<ResearchTab>('financials');

  const safeFundamentals: StockFundamentals = fundamentals || {
    website: quote.website || '',
    sector: quote.sector || 'Equities',
    industry: quote.industry || 'General',
    businessSummary: quote.businessSummary || `${quote.companyName} traded on public equity markets.`,
    totalRevenue: 'N/A',
    revenueGrowthYoY: 'N/A',
    profitMarginPct: undefined,
    operatingMarginPct: undefined,
    debtToEquity: undefined,
    peRatio: undefined,
    pbRatio: undefined,
    eps: undefined,
    marketCap: 'N/A',
    dividendYield: undefined,
    roe: undefined,
    annualPnL: []
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Section Tab Switcher */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black font-mono text-slate-100">
                Company Fundamental Research & Moat Analysis
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Statutory corporate disclosures, multi-year P&L trajectory, balance sheet solvency, and long-term moat durability.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('financials')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'financials'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Annual P&L & Solvency</span>
            </button>
            <button
              onClick={() => setActiveTab('moat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'moat'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>12-Dimension Moat Analysis</span>
            </button>
          </div>
        </div>

        {/* Quick Company Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono text-slate-300">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Company</span>
            <span className="font-bold text-slate-200">{quote.companyName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Sector</span>
            <span className="font-bold text-slate-200">{safeFundamentals.sector}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Industry</span>
            <span className="font-bold text-slate-200">{safeFundamentals.industry}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Official Website</span>
            {safeFundamentals.website ? (
              <a
                href={safeFundamentals.website}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 truncate"
              >
                <span>{safeFundamentals.website.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="text-slate-500">Not Disclosed</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Selected Tab Viewport */}
      <div>
        {activeTab === 'financials' ? (
          <BalanceSheetPage quote={quote} fundamentals={safeFundamentals} benchmark={benchmark} />
        ) : (
          <InvestmentAnalysisPage quote={quote} fundamentals={safeFundamentals} />
        )}
      </div>
    </div>
  );
};
