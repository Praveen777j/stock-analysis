import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

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
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const cookie = cRes.headers.get('set-cookie');
      if (!cookie) return null;
      const crRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Cookie': cookie }
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
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(session.crumb)}&modules=financialData,defaultKeyStatistics,assetProfile,summaryDetail`;
        const qRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Cookie': session.cookie }
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

          return {
            website: prof?.website || '',
            sector: prof?.sector || 'Equities',
            industry: prof?.industry || 'General',
            businessSummary: prof?.longBusinessSummary || '',
            totalRevenue: fin?.totalRevenue?.fmt || 'N/A',
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
            pnlStatus: 'UNAVAILABLE',
            shareholdingStatus: 'UNAVAILABLE',
            annualPnL: [],
            shareholding: undefined
          };
        }
      }
    } catch (_) {}

    // Deterministic Catalog Fallback for known sample demonstration blue chips
    const isRel = symbol.includes('RELIANCE');
    const isTcs = symbol.includes('TCS');
    const isInfy = symbol.includes('INFY');
    const isAapl = symbol.includes('AAPL');
    if (isRel || isTcs || isInfy || isAapl) {
      return {
        website: isRel ? 'https://www.ril.com' : isTcs ? 'https://www.tcs.com' : isInfy ? 'https://www.infosys.com' : 'https://www.apple.com',
        sector: isRel ? 'Energy' : isAapl ? 'Consumer Tech' : 'Technology',
        industry: isRel ? 'Oil & Gas Refining & Marketing' : isAapl ? 'Consumer Electronics' : 'Information Technology Services',
        businessSummary: isRel ? 'Reliance Industries Limited is an Indian multinational conglomerate.' : isTcs ? 'Tata Consultancy Services is an Indian multinational IT services company.' : 'Enterprise operating in global technology markets.',
        totalRevenue: isRel ? '₹9,65,400 Cr' : isTcs ? '₹2,58,400 Cr' : isAapl ? '$415.2B' : 'N/A',
        revenueGrowthYoY: isRel ? '+7.4%' : isTcs ? '+8.4%' : '+6.0%',
        profitMarginPct: isRel ? 7.7 : isTcs ? 19.3 : 25.4,
        operatingMarginPct: isRel ? 18.5 : isTcs ? 26.6 : 30.5,
        debtToEquity: isRel ? 46.28 : isTcs ? 10.21 : 152.0,
        peRatio: isRel ? 21.57 : isTcs ? 15.29 : 38.2,
        pbRatio: isRel ? 1.78 : isTcs ? 6.95 : 3.4,
        eps: isRel ? 116.0 : isTcs ? 137.5 : 6.95,
        marketCap: isRel ? '₹15.8T' : isTcs ? '₹11.2T' : '$3.45T',
        dividendYield: isRel ? 0.35 : isTcs ? 2.1 : 0.5,
        roe: isRel ? 9.8 : isTcs ? 48.2 : 165.0,
        financialHealthGrade: isTcs ? 'A+ (Excellent)' : 'A (Strong)',
        profitSituation: 'Stable Expansion',
        dataStatus: 'SAMPLE_DATA',
        pnlStatus: 'SAMPLE_DATA',
        shareholdingStatus: 'SAMPLE_DATA',
        annualPnL: [],
        shareholding: undefined
      };
    }

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
      shareholding: undefined
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

      const articles: Array<{
        title: string;
        publisher: string;
        date: string;
        summary: string;
        vaderScore: number;
        finbertScore: number;
        sentimentLabel: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      }> = [];

      // 1. Fetch genuine articles from Google News RSS & Economic Times RSS
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
          while ((match = itemRegex.exec(xml)) !== null && articles.length < 8) {
            let rawTitle = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
            const pubDate = match[3] ? new Date(match[3]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
            const rawDesc = match[4].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
            let publisher = match[5] ? match[5].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

            // Clean title suffix like " - Livemint"
            if (!publisher && rawTitle.includes(' - ')) {
              const parts = rawTitle.split(' - ');
              publisher = parts[parts.length - 1].trim();
              rawTitle = parts.slice(0, -1).join(' - ').trim();
            } else if (publisher && rawTitle.endsWith(` - ${publisher}`)) {
              rawTitle = rawTitle.slice(0, -(publisher.length + 3)).trim();
            }

            const articleText = `${rawTitle} ${rawDesc}`;
            const { compound, label } = analyzeVaderSentiment(articleText);

            articles.push({
              title: rawTitle,
              publisher: publisher || 'Financial News',
              date: pubDate,
              summary: rawDesc.slice(0, 180) || rawTitle,
              vaderScore: compound,
              finbertScore: 0.0, // FinBERT PyTorch transformer runtime not connected in Node.js process
              sentimentLabel: label
            });
          }
        }
      } catch (_) {
        // Genuine network or timeout failure
      }

      // DO NOT invent synthetic articles when live news is unavailable.
      const hasRealNews = articles.length > 0;
      const avgVader = hasRealNews
        ? Math.round((articles.reduce((a, b) => a + b.vaderScore, 0) / articles.length) * 100) / 100
        : 0.0;
      // FinBERT transformer deep-learning model is unavailable in this environment
      const avgFinbert = 0.0;

      // DO NOT fabricate fake Reddit posts.
      // Authentic Reddit social discussions are returned empty when OAuth / public feed is not connected.
      const redditPosts: Array<{
        title: string;
        subreddit: string;
        score: number;
        numComments: number;
        url: string;
        date: string;
        vaderScore: number;
        finbertScore: number;
        sentimentLabel: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      }> = [];

      const compositeScore = avgVader;

      let label: 'BULLISH' | 'NEUTRAL' | 'BEARISH' = 'NEUTRAL';
      if (hasRealNews) {
        if (compositeScore >= 0.15) label = 'BULLISH';
        else if (compositeScore <= -0.15) label = 'BEARISH';
      }

      return res.json({
        ticker,
        overallScore: compositeScore,
        vaderCompound: avgVader,
        finbertScore: avgFinbert,
        newsCount: articles.length,
        label,
        dataStatus: hasRealNews ? 'LIVE' : 'UNAVAILABLE',
        articles,
        reddit: {
          status: 'EMPTY',
          message: 'Social sentiment data unavailable (Reddit API feed credentials required for live forum stream)',
          postCount: 0,
          posts: [],
          socialBuzzScore: 0.0,
          bullishPct: 0,
          bearishPct: 0
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
