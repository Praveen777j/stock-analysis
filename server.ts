import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFinbertInference } from './src/finbertService';
import { extractCleanArticleData, deduplicateAndGroupNewsArticles } from './src/newsIntelligence';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // Cached USD/INR rate with 15-minute TTL (null if never successfully fetched)
  let cachedUsdInrRate: number | null = null;
  let lastFxFetch = 0;

  async function getUsdInrRate(): Promise<number | null> {
    const now = Date.now();
    if (cachedUsdInrRate !== null && now - lastFxFetch < 15 * 60 * 1000) {
      return cachedUsdInrRate;
    }
    try {
      const resp = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1d&range=5d', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (resp.ok) {
        const data = await resp.json();
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price && typeof price === 'number') {
          cachedUsdInrRate = price;
          lastFxFetch = now;
          return price;
        }
      }
    } catch (e) {
      console.warn('Live USDINR FX query encountered an issue:', e);
    }
    // Return cached rate if we have one from a previous verified query, or null if live FX is unavailable
    return cachedUsdInrRate;
  }

  // Symbol resolution helper: If user typed e.g. "RELIANCE", map to "RELIANCE.NS"
  function normalizeSymbol(symbol: string): string {
    let s = symbol.trim().toUpperCase();

    // 1. Mandatory corporate aliases, renames, and demergers (handle BEFORE any .NS check!)
    if (s === 'ZOMATO' || s === 'ZOMATO.NS' || s === 'ZOMATO.BO') return 'ETERNAL.NS';
    if (s === 'TATAMOTORS' || s === 'TATAMOTORS.NS' || s === 'TATAMOTORS.BO' || s === 'TATAMTRDVR' || s === 'TATAMTRDVR.NS') return 'TMPV.NS';
    if (s === 'TMCV' || s === 'TMCV.NS') return 'TMCV.NS';
    if (s === 'TMPV' || s === 'TMPV.NS') return 'TMPV.NS';
    if (s === 'ETERNAL' || s === 'ETERNAL.NS') return 'ETERNAL.NS';

    if (s.endsWith('.NS') || s.endsWith('.BO')) return s;

    // Common Indian blue chips without suffix
    const knownNse = [
      'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'SBIN',
      'BHARTIARTL', 'KOTAKBANK', 'LT', 'BAJFINANCE', 'HCLTECH', 'ASIANPAINT', 'MARUTI',
      'SUNPHARMA', 'TITAN', 'TATAMOTORS', 'ULTRACEMCO', 'AXISBANK', 'NTPC', 'ONGC',
      'POWERGRID', 'ADANIENT', 'ADANIPORTS', 'COALINDIA', 'TATASTEEL', 'WIPRO', 'M&M',
      'BAJAJFINSV', 'NESTLEIND', 'JSWSTEEL', 'GRASIM', 'TECHM', 'HINDALCO', 'INDUSINDBK',
      'DRREDDY', 'CIPLA', 'TATACONSUM', 'DIVISLAB', 'EICHERMOT', 'BPCL', 'BRITANNIA',
      'APOLLOHOSP', 'HEROMOTOCO', 'SHRIRAMFIN', 'BAJAJ-AUTO', 'ZOMATO', 'JIOFIN', 'ETERNAL', 'TMPV', 'TMCV'
    ];

    if (knownNse.includes(s)) {
      if (s === 'TATAMOTORS') return 'TMPV.NS';
      if (s === 'ZOMATO') return 'ETERNAL.NS';
      return `${s}.NS`;
    }

    return s;
  }

  // Live Yahoo Crumb & Cookie Session Manager
  let cachedYahooCookie: string | null = null;
  let cachedYahooCrumb: string | null = null;
  let lastCrumbTime = 0;

  async function getYahooCrumb(): Promise<{ cookie: string; crumb: string } | null> {
    const now = Date.now();
    if (cachedYahooCookie && cachedYahooCrumb && now - lastCrumbTime < 3600000) {
      return { cookie: cachedYahooCookie, crumb: cachedYahooCrumb };
    }
    try {
      const cRes = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const rawCookie = cRes.headers.get('set-cookie');
      if (!rawCookie) return null;
      // Strip path, domain, expires for HTTP Cookie header
      const cookie = rawCookie.split(';')[0].trim();
      const crRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': cookie
        }
      });
      if (!crRes.ok) return null;
      const crumb = (await crRes.text()).trim();
      if (!crumb) return null;
      cachedYahooCookie = cookie;
      cachedYahooCrumb = crumb;
      lastCrumbTime = now;
      return { cookie, crumb };
    } catch (_) {
      return null;
    }
  }

  // Fetch Live Corporate Financials: Sales, Profits, Margins, Debt, and Official Website
  async function fetchStockFundamentals(symbol: string): Promise<any> {
    try {
      const session = await getYahooCrumb();
      if (session) {
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(session.crumb)}&modules=incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory,financialData,defaultKeyStatistics,assetProfile,summaryDetail`;
        const qRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Cookie': session.cookie }
        });
        if (qRes.ok) {
          const data = await qRes.json();
          const r = data.quoteSummary?.result?.[0];
          const fin = r?.financialData;
          const stats = r?.defaultKeyStatistics;
          const prof = r?.assetProfile;
          const sum = r?.summaryDetail;

          const dToE = fin?.debtToEquity?.raw;
          const pMargin = fin?.profitMargins?.raw;
          const revGrowth = fin?.revenueGrowth?.raw;

          let healthGrade: 'A+ (Excellent)' | 'A (Strong)' | 'B (Moderate)' | 'C (Leveraged)' | 'D (Distressed)' | undefined = undefined;
          let profitSituation: 'Surging Profit Growth' | 'Stable Expansion' | 'Margin Compression' | 'Loss Accumulation' | undefined = undefined;

          if (pMargin !== undefined && revGrowth !== undefined && dToE !== undefined) {
            if (pMargin > 0.15 && revGrowth > 0.10 && dToE < 30) {
              healthGrade = 'A+ (Excellent)';
              profitSituation = 'Surging Profit Growth';
            } else if (pMargin > 0.06 && dToE < 60) {
              healthGrade = 'A (Strong)';
              profitSituation = revGrowth >= 0 ? 'Stable Expansion' : 'Margin Compression';
            } else if (pMargin >= 0 && dToE < 100) {
              healthGrade = 'B (Moderate)';
              profitSituation = 'Margin Compression';
            } else {
              healthGrade = dToE > 150 ? 'D (Distressed)' : 'C (Leveraged)';
              profitSituation = pMargin < 0 ? 'Loss Accumulation' : 'Margin Compression';
            }
          }

          // Parse genuine annual income statement history (figures in ₹ Crores)
          const incomeHistory = r?.incomeStatementHistory?.incomeStatementHistory || [];
          const annualPnL: any[] = [];

          for (const stmt of incomeHistory) {
            const endDate = stmt.endDate?.fmt || '';
            const yearStr = endDate ? (endDate.startsWith('20') ? `FY${endDate.slice(2, 4)}` : endDate) : 'FY';
            const revCr = stmt.totalRevenue?.raw ? Math.round((stmt.totalRevenue.raw / 10000000) * 100) / 100 : 0;
            const netProfitCr = stmt.netIncome?.raw ? Math.round((stmt.netIncome.raw / 10000000) * 100) / 100 : 0;
            const opProfitCr = stmt.operatingIncome?.raw
              ? Math.round((stmt.operatingIncome.raw / 10000000) * 100) / 100
              : (stmt.ebit?.raw ? Math.round((stmt.ebit.raw / 10000000) * 100) / 100 : undefined);
            const expensesCr = stmt.totalOperatingExpenses?.raw
              ? Math.round((stmt.totalOperatingExpenses.raw / 10000000) * 100) / 100
              : (revCr && opProfitCr !== undefined ? Math.round((revCr - opProfitCr) * 100) / 100 : 0);
            const interestCr = stmt.interestExpense?.raw ? Math.round((stmt.interestExpense.raw / 10000000) * 100) / 100 : 0;
            const pbtCr = stmt.incomeBeforeTax?.raw ? Math.round((stmt.incomeBeforeTax.raw / 10000000) * 100) / 100 : 0;
            const taxCr = stmt.incomeTaxExpense?.raw ? Math.round((stmt.incomeTaxExpense.raw / 10000000) * 100) / 100 : 0;
            const patMarginPct = revCr > 0 ? Math.round((netProfitCr / revCr) * 10000) / 100 : 0;
            const opmPct = (revCr > 0 && opProfitCr !== undefined) ? Math.round((opProfitCr / revCr) * 10000) / 100 : 0;

            if (revCr > 0 || netProfitCr !== 0) {
              annualPnL.push({
                year: yearStr,
                revenue: revCr,
                expenses: expensesCr,
                operatingProfit: opProfitCr ?? 0,
                opmPct,
                depreciation: 0,
                interest: interestCr,
                pbt: pbtCr,
                tax: taxCr,
                netProfit: netProfitCr,
                patMarginPct,
                eps: 0,
                roePct: 0,
                debtToEquity: dToE ?? 0
              });
            }
          }
          // Arrange chronologically
          annualPnL.reverse();

          return {
            website: prof?.website || '',
            sector: prof?.sector || 'Equities',
            industry: prof?.industry || 'General',
            businessSummary: prof?.longBusinessSummary || '',
            totalRevenue: fin?.totalRevenue?.fmt || (annualPnL.length > 0 ? `₹${annualPnL[annualPnL.length - 1].revenue.toLocaleString()} Cr` : 'N/A'),
            revenueGrowthYoY: fin?.revenueGrowth?.fmt || 'N/A',
            profitMarginPct: (fin?.profitMargins?.raw !== undefined && fin?.profitMargins?.raw !== null) ? Math.round(fin.profitMargins.raw * 10000) / 100 : undefined,
            operatingMarginPct: (fin?.operatingMargins?.raw !== undefined && fin?.operatingMargins?.raw !== null) ? Math.round(fin.operatingMargins.raw * 10000) / 100 : undefined,
            grossMarginPct: (fin?.grossMargins?.raw !== undefined && fin?.grossMargins?.raw !== null) ? Math.round(fin.grossMargins.raw * 10000) / 100 : undefined,
            debtToEquity: (fin?.debtToEquity?.raw !== undefined && fin?.debtToEquity?.raw !== null) ? Math.round(fin.debtToEquity.raw * 10) / 10 : undefined,
            currentRatio: (fin?.currentRatio?.raw !== undefined && fin?.currentRatio?.raw !== null) ? Math.round(fin.currentRatio.raw * 100) / 100 : undefined,
            freeCashFlow: fin?.freeCashflow?.fmt || 'N/A',
            operatingCashFlow: fin?.operatingCashflow?.fmt || 'N/A',
            peRatio: sum?.trailingPE?.raw ? Math.round(sum.trailingPE.raw * 100) / 100 : (stats?.forwardPE?.raw ? Math.round(stats.forwardPE.raw * 100) / 100 : undefined),
            forwardPe: stats?.forwardPE?.raw ? Math.round(stats.forwardPE.raw * 100) / 100 : undefined,
            pbRatio: stats?.priceToBook?.raw ? Math.round(stats.priceToBook.raw * 100) / 100 : undefined,
            eps: stats?.trailingEps?.raw ? Math.round(stats.trailingEps.raw * 100) / 100 : undefined,
            marketCap: sum?.marketCap?.fmt || 'N/A',
            dividendYield: (sum?.dividendYield?.raw !== undefined && sum?.dividendYield?.raw !== null) ? Math.round(sum.dividendYield.raw * 10000) / 100 : undefined,
            roe: (fin?.returnOnEquity?.raw !== undefined && fin?.returnOnEquity?.raw !== null) ? Math.round(fin.returnOnEquity.raw * 10000) / 100 : undefined,
            financialHealthGrade: healthGrade,
            profitSituation,
            dataStatus: 'LIVE_PROVIDER_DATA',
            pnlStatus: annualPnL.length > 0 ? 'LIVE_PROVIDER_DATA' : 'UNAVAILABLE',
            shareholdingStatus: 'UNAVAILABLE',
            annualPnL,
            shareholding: undefined
          };
        }
      }
    } catch (err) {
      console.warn(`[Fundamentals Diagnostic] Provider lookup failed for ${symbol}:`, err);
    }

    // Honest unavailable state when verified provider does not provide statements
    return {
      website: '',
      sector: 'Equities',
      industry: 'General',
      businessSummary: `${symbol} traded on public exchanges. Detailed fundamental statement filings pending verified source integration.`,
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
      financialHealthGrade: undefined,
      profitSituation: undefined,
      dataStatus: 'UNAVAILABLE',
      pnlStatus: 'UNAVAILABLE',
      shareholdingStatus: 'UNAVAILABLE',
      annualPnL: [],
    };
  }

  // --- API: Live Stock Quote & Real Historical Data ---
  app.get('/api/stock/:ticker', async (req, res) => {
    try {
      const rawTicker = req.params.ticker;
      const normalizedTicker = normalizeSymbol(rawTicker);
      const rangeParam = (req.query.range as string) || '1y';

      // Map range to Yahoo finance range & interval.
      // Always fetch at least 2y of historical observations for accurate, consistent
      // 1-week, 1-month, 3-month, and 1-year return metrics, independent of the chart range.
      const validRanges = ['1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'];
      const range = validRanges.includes(rangeParam) ? rangeParam : '1y';
      // When chart range is 5y or max, fetch that larger range; otherwise fetch 2y
      const fetchRange = (range === '5y' || range === 'max') ? range : '2y';

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      };

      let resolvedTicker = normalizedTicker;
      let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolvedTicker)}?interval=1d&range=${fetchRange}`;
      let response = await fetch(url, { headers });

      // Fallback 1: If bare ticker failed and has no '.', try .NS (National Stock Exchange of India)
      if (!response.ok && !resolvedTicker.includes('.')) {
        const nseTicker = `${resolvedTicker}.NS`;
        const nseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(nseTicker)}?interval=1d&range=${fetchRange}`;
        const nseResponse = await fetch(nseUrl, { headers });
        if (nseResponse.ok) {
          response = nseResponse;
          resolvedTicker = nseTicker;
        }
      }

      // Fallback 2: Try Yahoo search lookup to resolve company name (e.g. "Shadowfax Technologies")
      if (!response.ok) {
        try {
          const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(rawTicker)}&quotesCount=3`;
          const sRes = await fetch(searchUrl, { headers });
          if (sRes.ok) {
            const sData = await sRes.json();
            const bestQuote = sData.quotes?.[0]?.symbol;
            if (bestQuote) {
              const bUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(bestQuote)}?interval=1d&range=${fetchRange}`;
              const bRes = await fetch(bUrl, { headers });
              if (bRes.ok) {
                response = bRes;
                resolvedTicker = bestQuote;
              }
            }
          }
        } catch (_) {}
      }

      if (!response.ok) {
        return res.status(404).json({ error: `Unable to fetch market data for "${rawTicker}". Symbol was not found on NSE, BSE, or international exchanges.` });
      }

      const data = await response.json();
      const chartResult = data.chart?.result?.[0];

      if (!chartResult) {
        return res.status(404).json({ error: data.chart?.error?.description || `No data found for ${normalizedTicker}` });
      }

      const meta = chartResult.meta;
      const originalCurrency = (meta.currency || 'INR').toUpperCase();
      const isUsd = originalCurrency === 'USD';

      // Live FX conversion only when original price is USD
      const usdInrRate = isUsd ? await getUsdInrRate() : 1.0;
      // If live FX data is unavailable for USD stock, preserve the source USD currency without silent fake conversion
      const effectiveCurrency = (isUsd && !usdInrRate) ? 'USD' : 'INR';
      const fxMultiplier = (isUsd && usdInrRate) ? usdInrRate : 1.0;

      const rawPrice = meta.regularMarketPrice ?? meta.previousClose ?? 0;
      const rawPrevClose = meta.chartPreviousClose ?? meta.previousClose ?? rawPrice;
      const raw52High = meta.fiftyTwoWeekHigh ?? rawPrice;
      const raw52Low = meta.fiftyTwoWeekLow ?? rawPrice;

      // Convert using verified FX multiplier, or preserve exact source price
      const priceVal = Math.round(rawPrice * fxMultiplier * 100) / 100;
      const prevCloseVal = Math.round(rawPrevClose * fxMultiplier * 100) / 100;
      const changeVal = Math.round((priceVal - prevCloseVal) * 100) / 100;
      const changePct = prevCloseVal > 0 ? Math.round((changeVal / prevCloseVal) * 10000) / 100 : 0;
      const high52wVal = Math.round(raw52High * fxMultiplier * 100) / 100;
      const low52wVal = Math.round(raw52Low * fxMultiplier * 100) / 100;

      // Extract real historical bars
      const timestamps = chartResult.timestamp || [];
      const quoteObj = chartResult.indicators?.quote?.[0] || {};
      const opens = quoteObj.open || [];
      const highs = quoteObj.high || [];
      const lows = quoteObj.low || [];
      const closes = quoteObj.close || [];
      const volumes = quoteObj.volume || [];

      const bars: Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }> = [];

      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        if (c === null || c === undefined || isNaN(c)) continue;

        const o = opens[i] ?? c;
        const h = highs[i] ?? Math.max(o, c);
        const l = lows[i] ?? Math.min(o, c);
        const v = volumes[i] ?? 0;

        const dateObj = new Date(timestamps[i] * 1000);
        const dateStr = dateObj.toISOString().split('T')[0];

        bars.push({
          date: dateStr,
          open: Math.round(o * fxMultiplier * 100) / 100,
          high: Math.round(h * fxMultiplier * 100) / 100,
          low: Math.round(l * fxMultiplier * 100) / 100,
          close: Math.round(c * fxMultiplier * 100) / 100,
          volume: Math.round(v)
        });
      }

      // Format last trade timestamp
      const lastTradeDate = meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : new Date().toLocaleDateString('en-IN');

      const companyName = meta.shortName || meta.longName || meta.symbol;
      const exchangeName = meta.exchangeName || meta.fullExchangeName || 'NSE';

      // Compute multi-period return percentages during fetch.
      // Require sufficient historical observations and calendar elapsed time (with holiday tolerance).
      const currentPrice = priceVal;
      const barCount = bars.length;

      // Helper: Find reference bar on or before target calendar days ago
      function getPeriodRefBar(
        minRequiredBars: number,
        targetCalendarDays: number,
        maxCalendarToleranceDays: number
      ): { close: number } | null {
        if (barCount < minRequiredBars) return null;
        const lastBar = bars[barCount - 1];
        const lastTs = new Date(lastBar.date).getTime();
        const targetTs = lastTs - targetCalendarDays * 86400000;

        // Find candidate bars on or before target date
        let ref: { close: number; date: string } | null = null;
        for (let i = barCount - 1; i >= 0; i--) {
          const bTs = new Date(bars[i].date).getTime();
          if (bTs <= targetTs) {
            const elapsedDays = (lastTs - bTs) / 86400000;
            if (elapsedDays <= maxCalendarToleranceDays && bars[i].close > 0) {
              ref = bars[i];
            }
            break;
          }
        }
        return ref;
      }

      // 1 week return (~7 calendar days, min 4 sessions, max tolerance 14 days)
      const bar1w = getPeriodRefBar(4, 7, 14);
      const change1wPct = bar1w && bar1w.close > 0
        ? Math.round(((currentPrice - bar1w.close) / bar1w.close) * 1000) / 10
        : undefined;

      // 1 month return (~30 calendar days, min 18 sessions, max tolerance 45 days)
      const bar1m = getPeriodRefBar(18, 30, 45);
      const change1mPct = bar1m && bar1m.close > 0
        ? Math.round(((currentPrice - bar1m.close) / bar1m.close) * 1000) / 10
        : undefined;
      const change1mAmount = bar1m && bar1m.close > 0
        ? Math.round((currentPrice - bar1m.close) * 100) / 100
        : undefined;

      // 3 months return (~91 calendar days, min 55 sessions, max tolerance 115 days)
      const bar3m = getPeriodRefBar(55, 91, 115);
      const change3mPct = bar3m && bar3m.close > 0
        ? Math.round(((currentPrice - bar3m.close) / bar3m.close) * 1000) / 10
        : undefined;

      // 1 year return (~365 calendar days, min 220 sessions, max tolerance 400 days)
      const bar1y = getPeriodRefBar(220, 365, 400);
      const change1yPct = bar1y && bar1y.close > 0
        ? Math.round(((currentPrice - bar1y.close) / bar1y.close) * 1000) / 10
        : undefined;

      // Determine chart display bars matching the user's selected rangeParam.
      // Calculation metrics above use the full historical bars array independently.
      let displayBars = bars;
      if (bars.length > 0 && rangeParam && rangeParam !== 'max' && rangeParam !== 'all') {
        const rangeDaysMap: Record<string, number> = {
          '1mo': 31,
          '3mo': 92,
          '6mo': 183,
          '1y': 366,
          '2y': 732,
          '5y': 1827
        };
        const maxDays = rangeDaysMap[rangeParam];
        if (maxDays) {
          const lastBarTime = new Date(bars[bars.length - 1].date).getTime();
          const cutoffTime = lastBarTime - maxDays * 86400000;
          displayBars = bars.filter(b => new Date(b.date).getTime() >= cutoffTime);
        }
      }

      // Fetch comprehensive corporate financials and official website in parallel
      const fundamentals = await fetchStockFundamentals(resolvedTicker);

      return res.json({
        ticker: rawTicker.toUpperCase(),
        resolvedTicker: meta.symbol,
        companyName: rawTicker.toUpperCase().includes('ZOMATO')
          ? 'Zomato Ltd (Eternal Ltd)'
          : rawTicker.toUpperCase().includes('TATAMOTORS')
          ? 'Tata Motors Ltd'
          : companyName,
        exchange: exchangeName,
        country: resolvedTicker.includes('.NS') || resolvedTicker.includes('.BO') || exchangeName === 'NSI' || exchangeName === 'NSE' ? 'India' : 'United States',
        currency: effectiveCurrency,
        originalCurrency,
        fxRateApplied: isUsd && usdInrRate ? usdInrRate : (isUsd ? null : 1.0),
        fxStatus: isUsd ? (usdInrRate ? 'LIVE_CONVERTED' : 'SOURCE_CURRENCY_PRESERVED') : 'NATIVE_INR',
        price: priceVal,
        prevClose: prevCloseVal,
        change: changeVal,
        changePct,
        high52w: high52wVal,
        low52w: low52wVal,
        volume: meta.regularMarketVolume || (displayBars.length > 0 ? displayBars[displayBars.length - 1].volume : 0),
        lastUpdated: `${lastTradeDate} IST`,
        change1mPct,
        change1wPct,
        change3mPct,
        change1yPct,
        change1mAmount,
        website: fundamentals?.website || '',
        sector: fundamentals?.sector || 'Equities',
        industry: fundamentals?.industry || 'General',
        businessSummary: fundamentals?.businessSummary || '',
        fundamentals,
        bars: displayBars
      });
    } catch (err: any) {
      console.error('Error fetching stock:', err);
      return res.status(500).json({ error: err.message || 'Internal server error fetching market data' });
    }
  });

  // --- API: Live Search Symbols & Autocomplete ---
  app.get('/api/search', async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      if (!q) return res.json([]);

      const upperQ = q.toUpperCase();
      const aliasResults: any[] = [];

      if ('ZOMATO'.includes(upperQ) || upperQ.includes('ZOMATO') || 'BLINKIT'.includes(upperQ)) {
        aliasResults.push({
          ticker: 'ZOMATO.NS',
          name: 'Zomato Ltd (Eternal Ltd)',
          exchange: 'NSE',
          country: 'India',
          sector: 'Consumer Cyclical',
          industry: 'Food Delivery & Quick Commerce'
        });
      }
      if ('TATAMOTORS'.includes(upperQ) || upperQ.includes('TATA MOTOR') || upperQ.includes('TATAM') || 'TMPV'.includes(upperQ)) {
        aliasResults.push({
          ticker: 'TATAMOTORS.NS',
          name: 'Tata Motors Ltd (Passenger Vehicles)',
          exchange: 'NSE',
          country: 'India',
          sector: 'Consumer Cyclical',
          industry: 'Automobiles'
        });
        aliasResults.push({
          ticker: 'TMCV.NS',
          name: 'Tata Motors Limited (Commercial Vehicles)',
          exchange: 'NSE',
          country: 'India',
          sector: 'Consumer Cyclical',
          industry: 'Automobiles'
        });
      }

      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      let results: any[] = [];
      if (response.ok) {
        const data = await response.json();
        const quotes = data.quotes || [];

        results = quotes
          .filter((item: any) => item.quoteType === 'EQUITY' || item.quoteType === 'ETF')
          .map((item: any) => ({
            ticker: item.symbol,
            name: item.shortname || item.longname || item.symbol,
            exchange: item.exchDisp || item.exchange || 'NSE',
            country: item.symbol.endsWith('.NS') || item.symbol.endsWith('.BO') ? 'India' : 'United States',
            sector: item.sector || 'Equities',
            industry: item.industry || 'General'
          }));
      }

      // Combine alias results first, deduplicating tickers
      const combined = [...aliasResults];
      for (const r of results) {
        if (!combined.some(c => c.ticker === r.ticker)) {
          combined.push(r);
        }
      }

      return res.json(combined);
    } catch (e) {
      return res.json([]);
    }
  });

  // --- Helper: Decode all HTML entities cleanly ---
  function decodeHtml(html: string): string {
    return html
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .trim();
  }

  // --- API: Live Primary Market IPO Pipeline & Statutory Exchange Filings ---
  app.get('/api/ipos', async (req, res) => {
    try {
      let liveNseIssues: any[] = [];
      let liveNseError = false;
      try {
        const nseRes = await fetch('https://www.nseindia.com/api/ipo-current-issue', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          }
        });
        if (nseRes.ok) {
          const nseData = await nseRes.json();
          if (Array.isArray(nseData)) {
            liveNseIssues = nseData;
          }
        } else {
          liveNseError = true;
        }
      } catch (err) {
        liveNseError = true;
        console.warn('[IPO Feed Warning] Live NSE issue query encountered an issue:', err);
      }

      // Current Date in Indian Market Timezone (Asia/Kolkata)
      const now = new Date();
      const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

      function parseNseDate(dateStr?: string): { dateStr: string; iso: string } | null {
        if (!dateStr) return null;
        const clean = dateStr.trim();
        // Match DD-Mon-YYYY (e.g. 14-Oct-2026 or 14-OCT-2026)
        const dmyMatch = clean.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
        if (dmyMatch) {
          const day = dmyMatch[1].padStart(2, '0');
          const monthNames: Record<string, string> = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
          };
          const month = monthNames[dmyMatch[2].toLowerCase()] || '01';
          let year = dmyMatch[3];
          if (year.length === 2) year = `20${year}`;
          return {
            dateStr: `${day} ${dmyMatch[2]} ${year}`,
            iso: `${year}-${month}-${day}`
          };
        }
        // Match YYYY-MM-DD
        const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (ymdMatch) {
          const year = ymdMatch[1];
          const month = ymdMatch[2].padStart(2, '0');
          const day = ymdMatch[3].padStart(2, '0');
          return {
            dateStr: `${day}-${month}-${year}`,
            iso: `${year}-${month}-${day}`
          };
        }
        return null;
      }

      const parsedLiveIPOs: any[] = [];
      const seenSymbols = new Set<string>();
      const seenDedupKeys = new Set<string>();

      for (const item of liveNseIssues) {
        const symbol = (item.symbol || '').toUpperCase().trim();
        const companyName = item.companyName || symbol;
        if (!symbol && !companyName) continue;

        const startParsed = parseNseDate(item.issueStartDate);
        const endParsed = parseNseDate(item.issueEndDate);
        const startIso = startParsed ? startParsed.iso : '';
        const endIso = endParsed ? endParsed.iso : '';

        // Deduplication by stable key (issuer/symbol and start date)
        const dedupKey = `${symbol || companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${startIso || 'pending'}`;
        if (seenDedupKeys.has(dedupKey)) continue;
        seenDedupKeys.add(dedupKey);
        if (symbol) seenSymbols.add(symbol);

        // Status calculation respecting Indian market timezone and cancellation/postponement flags
        const rawStatus = (item.status || '').toLowerCase();
        let status: 'UPCOMING' | 'OPEN NOW' | 'CLOSED' | 'LISTED' | 'CANCELLED' | 'POSTPONED' = 'UPCOMING';
        if (rawStatus.includes('cancel') || rawStatus.includes('withdrawn')) {
          status = 'CANCELLED';
        } else if (rawStatus.includes('postpone') || rawStatus.includes('deferred')) {
          status = 'POSTPONED';
        } else if (rawStatus.includes('listed')) {
          status = 'LISTED';
        } else if (startIso && endIso) {
          if (istDateStr >= startIso && istDateStr <= endIso) {
            status = 'OPEN NOW';
          } else if (istDateStr < startIso) {
            status = 'UPCOMING';
          } else {
            status = 'CLOSED';
          }
        } else if (startIso) {
          if (istDateStr < startIso) {
            status = 'UPCOMING';
          } else {
            status = 'OPEN NOW';
          }
        } else {
          status = 'UPCOMING';
        }

        let minPrice = 0;
        let maxPrice = 0;
        let priceBand = item.issuePrice || 'Disclosed in RHP';
        if (item.issuePrice) {
          const priceMatches = item.issuePrice.match(/\d+(\.\d+)?/g);
          if (priceMatches && priceMatches.length >= 2) {
            minPrice = parseFloat(priceMatches[0]);
            maxPrice = parseFloat(priceMatches[1]);
            priceBand = `₹${minPrice} – ₹${maxPrice}`;
          } else if (priceMatches && priceMatches.length === 1) {
            minPrice = parseFloat(priceMatches[0]);
            maxPrice = minPrice;
            priceBand = `₹${minPrice}`;
          }
        }

        const subMultiple = item.noOfTime ? parseFloat(item.noOfTime) : undefined;
        const roundedSub = subMultiple !== undefined && !isNaN(subMultiple) ? Math.round(subMultiple * 100) / 100 : undefined;
        const isSme = item.series === 'SME' || item.isBse === '1';
        const sharesOffered = item.noOfSharesOffered ? parseFloat(item.noOfSharesOffered) : 0;
        const approxSizeCr = (sharesOffered > 0 && maxPrice > 0) ? Math.round((sharesOffered * maxPrice / 10000000) * 100) / 100 : 0;

        parsedLiveIPOs.push({
          id: `nse-${(symbol || companyName).toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          companyName,
          symbol: symbol || 'UNLISTED',
          exchange: isSme ? 'NSE SME' : 'NSE / BSE',
          ipoType: isSme ? 'SME' : 'Mainboard',
          dataStatus: 'LIVE_EXCHANGE_DATA',
          sourceUrl: 'https://www.nseindia.com/market-data/all-upcoming-issues',
          lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
          sector: isSme ? 'SME Emerging' : 'Diversified',
          industry: isSme ? 'Specialized Manufacturing & Services' : 'Commercial Enterprises',
          status,
          openDate: startParsed ? startParsed.dateStr : (item.issueStartDate || 'Pending Notice'),
          closeDate: endParsed ? endParsed.dateStr : (item.issueEndDate || 'Pending Notice'),
          listingDate: 'T+3 Market Days from Close',
          priceBand,
          minPrice,
          maxPrice,
          issuePrice: maxPrice || minPrice,
          issueSizeCr: approxSizeCr || 0,
          freshIssueCr: approxSizeCr || 0,
          ofsCr: 0,
          lotSize: isSme ? 1200 : (maxPrice > 0 ? Math.max(1, Math.floor(14900 / maxPrice)) : 50),
          minInvestment: isSme ? 120000 : 14900,
          retailQuotaPct: 35,
          website: 'https://www.nseindia.com',
          businessSummary: `${companyName} public issue under Series ${item.series || 'EQ'} registered on National Stock Exchange of India. Prospectus filed with SEBI.`,
          revenueYoYGrowthPct: 0,
          annualRevenueCr: 0,
          netProfitLossCr: 0,
          profitMarginPct: 0,
          debtToEquity: 0,
          postIssuePe: 0,
          peerAveragePe: 0,
          promoterHoldingPostPct: 0,
          strengths: [
            `Active exchange issue verified on National Stock Exchange under symbol ${symbol || companyName}`,
            `Subscription window: ${item.issueStartDate || 'TBD'} through ${item.issueEndDate || 'TBD'}`
          ],
          redFlags: [
            'Market volatility and institutional subscription demand during bidding window'
          ],
          subscription: roundedSub ? { qib: 0, nii: 0, retail: 0, total: roundedSub } : undefined,
          gmpAmount: undefined, // GMP is unofficial: shown only when an identifiable source provides a current timestamped observation
          gmpPct: undefined,
          gmpUpdated: undefined,
          verdict: status === 'OPEN NOW' ? 'STRONG APPLY' : 'APPLY FOR LISTING GAINS',
          verdictRationale: `Exchange issue registered on NSE. Current total subscription: ${roundedSub ? `${roundedSub}x` : 'Filing updates in progress'}.`
        });
      }

      // Reference catalog for verified listed issues
      const referenceCatalog = [
        {
          id: 'swiggy',
          companyName: 'Swiggy Limited',
          symbol: 'SWIGGY',
          exchange: 'NSE / BSE',
          ipoType: 'Mainboard',
          dataStatus: 'REFERENCE_CATALOG',
          sector: 'Consumer Discretionary',
          industry: 'Hyperlocal Food Delivery & Quick Commerce',
          status: 'LISTED',
          openDate: '06 Nov 2024',
          closeDate: '08 Nov 2024',
          listingDate: '13 Nov 2024',
          priceBand: '₹371 – ₹390',
          minPrice: 371,
          maxPrice: 390,
          issuePrice: 390,
          listingPrice: 412,
          issueSizeCr: 11327,
          freshIssueCr: 4499,
          ofsCr: 6828,
          lotSize: 38,
          minInvestment: 14820,
          retailQuotaPct: 10,
          website: 'https://www.swiggy.com',
          businessSummary: "Swiggy is one of India's leading consumer tech platforms, pioneering online food delivery and quick commerce via Instamart.",
          revenueYoYGrowthPct: 36.1,
          annualRevenueCr: 11247,
          netProfitLossCr: -2350,
          profitMarginPct: -20.89,
          debtToEquity: 18.4,
          postIssuePe: 0,
          peerAveragePe: 85.4,
          promoterHoldingPostPct: 0.0,
          strengths: ['Rapid growth in Instamart dark stores', 'High brand recall across metro areas'],
          redFlags: ['Historical net losses at filing', 'Intense quick commerce competition'],
          verdict: 'HISTORICAL FILING',
          verdictRationale: 'Statutory historical disclosure: Swiggy listed on NSE/BSE on 13 Nov 2024.'
        },
        {
          id: 'hyundai',
          companyName: 'Hyundai Motor India Limited',
          symbol: 'HYUNDAI',
          exchange: 'NSE / BSE',
          ipoType: 'Mainboard',
          dataStatus: 'REFERENCE_CATALOG',
          sector: 'Consumer Cyclical',
          industry: 'Automobile OEM & Electric Vehicles',
          status: 'LISTED',
          openDate: '15 Oct 2024',
          closeDate: '17 Oct 2024',
          listingDate: '22 Oct 2024',
          priceBand: '₹1,865 – ₹1,960',
          minPrice: 1865,
          maxPrice: 1960,
          issuePrice: 1960,
          listingPrice: 1934,
          issueSizeCr: 27870,
          freshIssueCr: 0,
          ofsCr: 27870,
          lotSize: 7,
          minInvestment: 13720,
          retailQuotaPct: 35,
          website: 'https://www.hyundai.com/in',
          businessSummary: 'Hyundai Motor India is the second-largest passenger car OEM in India with ~15% market share.',
          revenueYoYGrowthPct: 15.8,
          annualRevenueCr: 69829,
          netProfitLossCr: 6060,
          profitMarginPct: 8.68,
          debtToEquity: 0.1,
          postIssuePe: 26.3,
          peerAveragePe: 28.5,
          promoterHoldingPostPct: 82.5,
          strengths: ['Consistent profitability with ₹6,060 Cr PAT', 'Zero net debt balance sheet'],
          redFlags: ['100% OFS component from Korean parent'],
          verdict: 'HISTORICAL FILING',
          verdictRationale: 'Statutory historical disclosure: Hyundai Motor India listed on 22 Oct 2024.'
        },
        {
          id: 'ntpc-green',
          companyName: 'NTPC Green Energy Limited',
          symbol: 'NTPCGREEN',
          exchange: 'NSE / BSE',
          ipoType: 'Mainboard',
          dataStatus: 'REFERENCE_CATALOG',
          sector: 'Utilities & Renewables',
          industry: 'Solar, Wind & Green Hydrogen Generation',
          status: 'LISTED',
          openDate: '19 Nov 2024',
          closeDate: '22 Nov 2024',
          listingDate: '27 Nov 2024',
          priceBand: '₹102 – ₹108',
          minPrice: 102,
          maxPrice: 108,
          issuePrice: 108,
          listingPrice: 111.5,
          issueSizeCr: 10000,
          freshIssueCr: 10000,
          ofsCr: 0,
          lotSize: 138,
          minInvestment: 14904,
          retailQuotaPct: 10,
          website: 'https://www.ngel.in',
          businessSummary: 'NTPC Green Energy is the renewable energy arm of Maharatna PSU NTPC Limited.',
          revenueYoYGrowthPct: 109.4,
          annualRevenueCr: 1962,
          netProfitLossCr: 344,
          profitMarginPct: 17.53,
          debtToEquity: 98.5,
          postIssuePe: 60.5,
          peerAveragePe: 45.2,
          promoterHoldingPostPct: 89.0,
          strengths: ['100% fresh issue proceeds', 'Long-term 25-year PPAs'],
          redFlags: ['Capital intensive utility buildout'],
          verdict: 'HISTORICAL FILING',
          verdictRationale: 'Statutory historical disclosure: NTPC Green Energy listed on 27 Nov 2024.'
        },
        {
          id: 'bajaj-housing',
          companyName: 'Bajaj Housing Finance Limited',
          symbol: 'BAJAJHFL',
          exchange: 'NSE / BSE',
          ipoType: 'Mainboard',
          dataStatus: 'REFERENCE_CATALOG',
          sector: 'Financial Services',
          industry: 'Housing Finance Company (HFC)',
          status: 'LISTED',
          openDate: '09 Sep 2024',
          closeDate: '11 Sep 2024',
          listingDate: '16 Sep 2024',
          priceBand: '₹66 – ₹70',
          minPrice: 66,
          maxPrice: 70,
          issuePrice: 70,
          listingPrice: 150,
          issueSizeCr: 6560,
          freshIssueCr: 3560,
          ofsCr: 3000,
          lotSize: 214,
          minInvestment: 14980,
          retailQuotaPct: 35,
          website: 'https://www.bajajhousingfinance.in',
          businessSummary: 'Bajaj Housing Finance is an upper-layer Non-Banking Financial Company offering prime retail mortgage loans.',
          revenueYoYGrowthPct: 34.2,
          annualRevenueCr: 7617,
          netProfitLossCr: 1731,
          profitMarginPct: 22.72,
          debtToEquity: 580.0,
          postIssuePe: 33.5,
          peerAveragePe: 24.2,
          promoterHoldingPostPct: 88.75,
          strengths: ['Prestigious Bajaj Group pedigree', 'Low Gross NPA (<0.3%) in prime retail mortgage'],
          redFlags: ['High balance sheet leverage inherent to housing finance'],
          verdict: 'HISTORICAL FILING',
          verdictRationale: 'Statutory historical disclosure: Bajaj Housing Finance listed on 16 Sep 2024.'
        },
        {
          id: 'paramount-sme',
          companyName: 'Paramount Dye Tec Limited',
          symbol: 'PARAMOUNT',
          exchange: 'NSE SME',
          ipoType: 'SME',
          dataStatus: 'REFERENCE_CATALOG',
          sector: 'Industrials',
          industry: 'Textile Yarn Dyeing & Recycled Fibers',
          status: 'LISTED',
          openDate: '03 Oct 2024',
          closeDate: '07 Oct 2024',
          listingDate: '10 Oct 2024',
          priceBand: '₹111 – ₹117',
          minPrice: 111,
          maxPrice: 117,
          issuePrice: 117,
          listingPrice: 118,
          issueSizeCr: 28.43,
          freshIssueCr: 28.43,
          ofsCr: 0,
          lotSize: 1200,
          minInvestment: 140400,
          retailQuotaPct: 35,
          website: 'https://www.paramountdyetec.com',
          businessSummary: 'Paramount Dye Tec is a specialized yarn dyeing enterprise processing fibers for commercial garment manufacturers.',
          revenueYoYGrowthPct: 18.2,
          annualRevenueCr: 42.5,
          netProfitLossCr: 4.8,
          profitMarginPct: 11.29,
          debtToEquity: 42.1,
          postIssuePe: 14.8,
          peerAveragePe: 21.0,
          promoterHoldingPostPct: 69.5,
          strengths: ['100% fresh issue funding capacity expansion', 'Healthy EBITDA margins'],
          redFlags: ['SME segment with larger lot size and lower secondary liquidity'],
          verdict: 'HISTORICAL FILING',
          verdictRationale: 'Statutory historical disclosure: Paramount Dye Tec listed on NSE SME on 10 Oct 2024.'
        }
      ];

      // Merge and deduplicate by symbol
      const allIPOs = [...parsedLiveIPOs];
      for (const ref of referenceCatalog) {
        if (!seenSymbols.has(ref.symbol.toUpperCase())) {
          allIPOs.push(ref);
        }
      }

      return res.json({
        count: allIPOs.length,
        liveCount: parsedLiveIPOs.length,
        dataStatus: parsedLiveIPOs.length > 0 ? 'LIVE_EXCHANGE_DATA' : (liveNseError ? 'UNAVAILABLE' : 'REFERENCE_CATALOG'),
        ipos: allIPOs
      });
    } catch (e: any) {
      console.error('[IPO Error]', e);
      return res.status(500).json({ error: e.message || 'Failed to retrieve IPO dataset' });
    }
  });

  // --- API: Live Financial News & Sentiment Analysis ---
  app.get('/api/news/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker.trim();
      const cleanName = ticker.replace('.NS', '').replace('.BO', '');
      const companyName = (req.query.companyName as string) || cleanName;

      // Authentic VADER Sentiment Engine implementation
      const VADER_LEXICON: Record<string, number> = {
        surge: 2.8, surging: 2.8, jump: 2.1, jumped: 2.1, gain: 2.0, gains: 2.0, gained: 2.0,
        profit: 2.5, profitable: 2.4, profitability: 2.3, growth: 2.2, growing: 2.0,
        beat: 2.3, beats: 2.3, record: 2.1, high: 1.5, highs: 1.8,
        upgrade: 2.4, upgraded: 2.4, bull: 2.2, bullish: 2.5, rally: 2.6, rallied: 2.6,
        positive: 2.1, strong: 2.2, stronger: 2.3, expansion: 2.0, expanding: 2.0,
        dividend: 1.8, deal: 1.9, buy: 1.8, outperform: 2.7, outperformed: 2.7,
        robust: 2.3, breakout: 2.5, soar: 2.8, soars: 2.8, soared: 2.8, rebound: 2.2,
        rebounded: 2.2, boost: 2.1, boosted: 2.1, milestone: 1.9, order: 1.5, orders: 1.6,
        win: 2.2, won: 2.2, winning: 2.2, success: 2.5, successful: 2.4, revenue: 1.5,
        buyback: 2.2, partner: 1.8, partnership: 2.0, breakthrough: 2.6,
        fall: -1.8, falls: -1.8, fallen: -1.8, drop: -2.0, drops: -2.0, dropped: -2.0,
        slump: -2.6, slumps: -2.6, slumped: -2.6, loss: -2.5, losses: -2.6, losing: -2.3,
        miss: -2.1, misses: -2.1, missed: -2.1, plunge: -3.0, plunges: -3.0, plunged: -3.0,
        decline: -2.0, declines: -2.0, declined: -2.0, probe: -2.4, probes: -2.4, probed: -2.4,
        penalty: -2.6, downgrade: -2.6, downgraded: -2.6, bear: -2.0, bearish: -2.5,
        cut: -1.9, cuts: -1.9, debt: -2.0, risk: -1.8, risks: -1.9, risky: -2.1,
        warning: -2.3, warnings: -2.3, sell: -1.8, weak: -2.2, weakness: -2.3,
        drag: -1.9, crash: -3.2, crashed: -3.2, down: -1.5, tumble: -2.5, tumbled: -2.5,
        dispute: -2.2, inflation: -1.8, default: -3.2, defaulted: -3.2, struggle: -2.2,
        struggles: -2.2, struggling: -2.2, layoff: -2.6, layoffs: -2.7, pressure: -1.8,
        concern: -1.7, concerns: -1.8, fraud: -3.5, lawsuit: -2.7, investigation: -2.5,
        scam: -3.4, insolvent: -3.5, bankruptcy: -3.5, fine: -2.0, fined: -2.2
      };

      const VADER_BOOSTERS: Record<string, number> = {
        very: 0.293, extremely: 0.393, substantially: 0.293, massively: 0.35, sharply: 0.293,
        strongly: 0.293, highly: 0.293, greatly: 0.293, huge: 0.293, significantly: 0.293,
        barely: -0.293, slightly: -0.293, marginally: -0.293, somewhat: -0.293, hardly: -0.293, scarcely: -0.293
      };

      const VADER_NEGATIONS = new Set([
        'not', 'no', 'never', 'neither', 'nor', 'hardly', 'scarcely', 'barely',
        'fails', 'failed', 'failing', 'unable', 'without', 'cannot', "can't", "don't", "didn't", "won't"
      ]);

      function analyzeVaderSentiment(text: string): { compound: number; label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' } {
        if (!text || !text.trim()) return { compound: 0.0, label: 'NEUTRAL' };
        const words = text.replace(/[^a-zA-Z0-9\s!'-]/g, ' ').split(/\s+/).filter(Boolean);
        if (words.length === 0) return { compound: 0.0, label: 'NEUTRAL' };

        let sumValence = 0;
        let count = 0;

        for (let i = 0; i < words.length; i++) {
          const rawWord = words[i];
          const cleanWord = rawWord.toLowerCase();
          if (VADER_LEXICON[cleanWord] !== undefined) {
            let v = VADER_LEXICON[cleanWord];

            // Capitalization boost
            if (rawWord === rawWord.toUpperCase() && rawWord.length > 1) {
              v += v > 0 ? 0.733 : -0.733;
            }

            // Look back up to 3 tokens for degree modifiers or negations
            let isNegated = false;
            for (let j = Math.max(0, i - 3); j < i; j++) {
              const prev = words[j].toLowerCase();
              if (VADER_NEGATIONS.has(prev)) {
                isNegated = true;
              }
              if (VADER_BOOSTERS[prev] !== undefined) {
                const b = VADER_BOOSTERS[prev];
                v += v > 0 ? b : -b;
              }
            }

            if (isNegated) {
              v *= -0.74; // Standard VADER scalar negation
            }

            sumValence += v;
            count++;
          }
        }

        // Punctuation emphasis
        const exclamationCount = (text.match(/!/g) || []).length;
        if (exclamationCount > 0 && count > 0) {
          const puncBoost = Math.min(3, exclamationCount) * 0.292;
          sumValence += sumValence > 0 ? puncBoost : -puncBoost;
        }

        if (count === 0) {
          return { compound: 0.0, label: 'NEUTRAL' };
        }

        // Standard VADER compound score normalization formula
        const compound = sumValence / Math.sqrt((sumValence * sumValence) + 15);
        const rounded = Math.round(compound * 100) / 100;
        const label = rounded >= 0.05 ? 'POSITIVE' : rounded <= -0.05 ? 'NEGATIVE' : 'NEUTRAL';
        return { compound: rounded, label };
      }

      const rawFetchedArticles: Array<{
        title: string;
        publisher: string;
        date: string;
        summary: string;
        url: string;
        vaderScore: number;
        finbertScore: number | null;
        sentimentLabel: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      }> = [];

      // 1. Fetch genuine articles from Google News RSS with clean decoding & canonical URL extraction
      try {
        const queryTerm = encodeURIComponent(`${companyName} stock OR shares`);
        const c = new AbortController();
        const id = setTimeout(() => c.abort(), 4000);

        const gNewsRes = await fetch(
          `https://news.google.com/rss/search?q=${queryTerm}&hl=en-IN&gl=IN&ceid=IN:en`,
          {
            signal: c.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          }
        );
        clearTimeout(id);

        if (gNewsRes.ok) {
          const xml = await gNewsRes.text();
          const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<description>(.*?)<\/description>(?:[\s\S]*?<source[^>]*>(.*?)<\/source>)?/g;
          let match;
          const seenTitles = new Set<string>();

          while ((match = itemRegex.exec(xml)) !== null && rawFetchedArticles.length < 12) {
            const rawTitleTag = match[1];
            const rawLinkTag = match[2];
            const rawPubDateTag = match[3];
            const rawDescTag = match[4];
            const rawSourceTag = match[5];

            const pubDate = rawPubDateTag
              ? new Date(rawPubDateTag).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Recent';

            // Extract canonical title, valid URL, decoded summary and publisher without raw HTML
            const cleaned = extractCleanArticleData(rawTitleTag, rawLinkTag, rawDescTag, rawSourceTag);

            // Exclude generic automated quote pages (e.g. "Stock Price Today Live", "Share Price NSE")
            const isGenericQuote = /share price today|stock price today|live updates.*share price|today's share price/i.test(cleaned.title);
            if (isGenericQuote) continue;

            // Check if title is duplicate
            const titleKey = cleaned.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seenTitles.has(titleKey)) continue;
            seenTitles.add(titleKey);

            const articleText = `${cleaned.title} ${cleaned.summary}`;
            const { compound, label } = analyzeVaderSentiment(articleText);

            rawFetchedArticles.push({
              title: cleaned.title,
              publisher: cleaned.publisher,
              date: pubDate,
              summary: cleaned.summary,
              url: cleaned.url,
              vaderScore: compound,
              finbertScore: null,
              sentimentLabel: label
            });
          }
        }
      } catch (_) {
        // Genuine network or timeout failure
      }

      // Group corporate events and separate stories count from distinct corporate events count
      const groupedData = deduplicateAndGroupNewsArticles(rawFetchedArticles);
      const articles = groupedData.articles;
      const distinctEventsCount = groupedData.distinctEventsCount;
      const expansionCatalystsCount = groupedData.expansionCatalystsCount;
      const cautionaryOverhangsCount = groupedData.cautionaryOverhangsCount;

      const hasRealNews = articles.length > 0;
      const avgVader = hasRealNews
        ? Math.round((articles.reduce((a, b) => a + b.vaderScore, 0) / articles.length) * 100) / 100
        : 0.0;

      // 1b. Genuine FinBERT inference on financial news headlines via Hugging Face Inference API
      let finbertScore: number | null = null;
      let finbertStatus: 'LIVE' | 'UNAVAILABLE' = 'UNAVAILABLE';
      let finbertDiagnostic: string | undefined = undefined;
      let finbertReason: 'MISSING_TOKEN' | 'INVALID_CREDENTIALS' | 'INSUFFICIENT_ACCESS' | 'EMPTY_INPUT' | 'AUTH_ERROR' | 'RATE_LIMITED' | 'UNSUPPORTED_ENDPOINT' | 'MODEL_LOADING' | 'MODEL_UNAVAILABLE' | 'TIMEOUT' | 'NETWORK_ERROR' | 'MALFORMED_RESPONSE' | 'SERVICE_UNAVAILABLE' | undefined = undefined;

      if (hasRealNews) {
        try {
          const headlineTexts = articles.map(a => `${a.title}. ${a.summary}`.slice(0, 512));
          const fbRes = await runFinbertInference(headlineTexts);
          if (fbRes.status === 'LIVE' && fbRes.overallScore !== null) {
            finbertStatus = 'LIVE';
            finbertScore = fbRes.overallScore;
            finbertDiagnostic = fbRes.diagnostics.message;
            finbertReason = undefined;
            // Attach individual headline FinBERT scores and genuine labels
            for (let i = 0; i < articles.length; i++) {
              const item = fbRes.items[i];
              if (item) {
                articles[i].finbertScore = item.score;
                articles[i].sentimentLabel = item.label;
              }
            }
          } else {
            finbertStatus = 'UNAVAILABLE';
            finbertScore = null;
            finbertDiagnostic = fbRes.diagnostics.message;
            finbertReason = fbRes.diagnostics.reason || 'MISSING_TOKEN';
          }
        } catch (e: any) {
          finbertStatus = 'UNAVAILABLE';
          finbertScore = null;
          finbertDiagnostic = 'FinBERT inference service exception: ' + (e?.message || 'Error');
          finbertReason = 'SERVICE_UNAVAILABLE';
        }
      }

      // 2. Query Genuine Reddit Community Discussions
      let rawRedditPosts: any[] = [];
      let redditStatus: 'SUCCESS' | 'AUTH_REQUIRED' | 'EMPTY' | 'RATE_LIMITED' | 'ERROR' = 'EMPTY';
      let redditMessage = '';

      const redditClientId = process.env.REDDIT_CLIENT_ID;
      const redditClientSecret = process.env.REDDIT_CLIENT_SECRET;
      const redditUserAgent = process.env.REDDIT_USER_AGENT || 'StockIntelligence/1.0';
      const redditQuery = encodeURIComponent(`${cleanName} stock OR shares`);

      if (redditClientId && redditClientSecret) {
        try {
          const auth = Buffer.from(`${redditClientId}:${redditClientSecret}`).toString('base64');
          const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': redditUserAgent
            },
            body: 'grant_type=client_credentials'
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            const token = tokenData.access_token;
            if (token) {
              const rSearchRes = await fetch(
                `https://oauth.reddit.com/r/IndianStreetBets+dalalstreetbets+stocks/search?q=${redditQuery}&sort=new&limit=25`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': redditUserAgent
                  }
                }
              );
              if (rSearchRes.ok) {
                const rData = await rSearchRes.json();
                rawRedditPosts = rData.data?.children?.map((c: any) => c.data) || [];
                redditStatus = rawRedditPosts.length > 0 ? 'SUCCESS' : 'EMPTY';
              }
            }
          }
        } catch (err) {
          console.warn('[Reddit OAuth API Error]', err);
        }
      }

      // Public fallback if credentials not configured
      if (rawRedditPosts.length === 0 && (!redditClientId || !redditClientSecret)) {
        try {
          const pUrl = `https://www.reddit.com/r/IndianStreetBets+dalalstreetbets/search.json?q=${redditQuery}&restrict_sr=1&sort=new&limit=25`;
          const pRes = await fetch(pUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            rawRedditPosts = pData.data?.children?.map((c: any) => c.data) || [];
            redditStatus = rawRedditPosts.length > 0 ? 'SUCCESS' : 'EMPTY';
          } else if (pRes.status === 429) {
            redditStatus = 'RATE_LIMITED';
            redditMessage = 'Reddit public API rate limit reached. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env for authenticated access.';
            console.info(`[Reddit Diagnostic] Rate limit reached for ${ticker}`);
          } else {
            redditStatus = 'AUTH_REQUIRED';
            redditMessage = 'Reddit social feed unavailable. Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env for live forum stream.';
            console.info(`[Reddit Diagnostic] Public feed restricted (HTTP ${pRes.status}). Credentials required.`);
          }
        } catch (e: any) {
          redditStatus = 'ERROR';
          redditMessage = 'Reddit forum connection unavailable.';
        }
      }

      // Parse Reddit posts
      const redditPosts: any[] = [];
      const seenReddit = new Set<string>();
      for (const p of rawRedditPosts) {
        if (!p.title) continue;
        const pTitle = decodeHtml(p.title);
        if (seenReddit.has(pTitle.toLowerCase())) continue;
        seenReddit.add(pTitle.toLowerCase());

        const { compound, label } = analyzeVaderSentiment(`${pTitle} ${p.selftext || ''}`);
        redditPosts.push({
          title: pTitle,
          subreddit: p.subreddit_name_prefixed || `r/${p.subreddit || 'IndianStreetBets'}`,
          score: p.score ?? 0,
          numComments: p.num_comments ?? 0,
          url: p.permalink ? `https://reddit.com${p.permalink}` : (p.url || ''),
          date: p.created_utc ? new Date(p.created_utc * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
          vaderScore: compound,
          finbertScore: null,
          sentimentLabel: label
        });
      }

      const bullCount = redditPosts.filter(p => p.sentimentLabel === 'POSITIVE').length;
      const bearCount = redditPosts.filter(p => p.sentimentLabel === 'NEGATIVE').length;
      const rTotal = Math.max(1, redditPosts.length);
      const socialBuzzScore = redditPosts.length > 0
        ? Math.round((redditPosts.reduce((acc, p) => acc + p.vaderScore, 0) / redditPosts.length) * 100) / 100
        : 0.0;

      const compositeScore = finbertStatus === 'LIVE' && finbertScore !== null
        ? Math.round(((finbertScore * 0.6) + (avgVader * 0.4)) * 100) / 100
        : avgVader;

      let label: 'BULLISH' | 'NEUTRAL' | 'BEARISH' = 'NEUTRAL';
      if (hasRealNews) {
        if (compositeScore >= 0.05) label = 'BULLISH';
        else if (compositeScore <= -0.05) label = 'BEARISH';
      }

      return res.json({
        ticker,
        overallScore: compositeScore,
        vaderCompound: avgVader,
        finbertScore,
        finbertStatus,
        finbertDiagnostic,
        finbertReason,
        newsCount: articles.length,
        distinctEventsCount,
        expansionCatalystsCount,
        cautionaryOverhangsCount,
        label,
        dataStatus: hasRealNews ? 'LIVE' : 'UNAVAILABLE',
        articles,
        reddit: {
          status: redditPosts.length > 0 ? 'SUCCESS' : redditStatus,
          message: redditPosts.length > 0 ? `${redditPosts.length} relevant discussions found on Reddit` : (redditMessage || 'Social sentiment data unavailable (Reddit API credentials required).'),
          postCount: redditPosts.length,
          posts: redditPosts,
          socialBuzzScore,
          bullishPct: redditPosts.length > 0 ? Math.round((bullCount / rTotal) * 100) : 0,
          bearishPct: redditPosts.length > 0 ? Math.round((bearCount / rTotal) * 100) : 0
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Mount Vite or serve static
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running live on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
