import React from 'react';
import { HistoricalBar, StockQuote, TechnicalIndicators } from '../../types';
import { ChartsPage } from '../ChartsPage';
import { TechnicalIndicatorsPage } from './TechnicalIndicatorsPage';

interface ChartAndTechnicalsPageProps {
  ticker: string;
  bars: HistoricalBar[];
  quote: StockQuote;
  technicals: TechnicalIndicators;
}

export const ChartAndTechnicalsPage: React.FC<ChartAndTechnicalsPageProps> = ({
  ticker,
  bars,
  quote,
  technicals
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Full Interactive Candlestick & Volume Chart */}
      <ChartsPage ticker={ticker} bars={bars} quote={quote} />

      {/* 2. Technical Oscillators & Moving Average Hierarchy Scorecard */}
      <TechnicalIndicatorsPage technicals={technicals} quote={quote} />
    </div>
  );
};
