import React from 'react';
import { HistoricalBar, StockQuote } from '../../types';
import { ChartsPage } from '../ChartsPage';

interface PriceChartTabProps {
  ticker: string;
  bars: HistoricalBar[];
  quote: StockQuote;
}

export const PriceChartTab: React.FC<PriceChartTabProps> = ({ ticker, bars, quote }) => {
  return <ChartsPage ticker={ticker} bars={bars} quote={quote} />;
};
