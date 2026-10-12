import React from 'react';
import { BacktestResult, StockQuote } from '../../types';
import { BacktestPage } from '../BacktestPage';

interface BacktestTabProps {
  backtest: BacktestResult;
  quote: StockQuote;
}

export const BacktestTab: React.FC<BacktestTabProps> = ({ backtest, quote }) => {
  return <BacktestPage backtest={backtest} ticker={quote.ticker} />;
};
