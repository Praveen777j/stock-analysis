# NEXUS — Professional AI Stock Analysis & Decision Support Platform

> **A disciplined, production-grade financial analysis web application combining keyless real-time market data, deterministic financial sentiment (VADER + Financial Context Engine), audited corporate fundamentals, SEBI DRHP IPO intelligence, walk-forward backtesting, additive factor decomposition, and quantitative risk management.**

---

## 🏛️ Project Architecture & Design Philosophy

Nexus is engineered as a unified, high-integrity financial intelligence application designed to run locally with zero mandatory configuration and deploy seamlessly on **Render's Free Tier** (or any modern cloud container).

```text
                                  ┌────────────────────────┐
                                  │      Client (SPA)      │
                                  │  React 19 + Tailwind   │
                                  └───────────┬────────────┘
                                              │ HTTP / JSON
                                              ▼
                                  ┌────────────────────────┐
                                  │   Express Backend API  │
                                  │   Node 22 / TypeScript │
                                  └─────┬──────────────┬───┘
                                        │              │
                   ┌────────────────────┴───┐      ┌───┴────────────────────┐
                   ▼                        ▼      ▼                        ▼
        ┌───────────────────────┐  ┌──────────────┐ ┌───────────────┐ ┌──────────────┐
        │ Yahoo Finance v8 API  │  │ Google News  │ │ VADER Context │ │  SEBI DRHP   │
        │ Quotes, OHLCV Candles │  │  RSS Wire &  │ │ Engine (Local │ │ Statutory IPO│
        │ Statements (Keyless)  │  │   Clusters   │ │  Deterministic│ │   Catalog    │
        └───────────────────────┘  └──────────────┘ └───────────────┘ └──────────────┘
```

### Core Design Principles
1. **Zero Mandatory Paid APIs**: Out-of-the-box operation using keyless institutional feeds, Yahoo Finance v8 chart data, Google News RSS, and deterministic VADER + Financial Context Engine.
2. **Strict Data Integrity**: Missing financial ratios or settlement data are never silently converted to zero. Stale or unavailable fields explicitly display `N/A` or `Unavailable`.
3. **No Fabricated Accuracy**: Machine learning benchmarks use chronological `TimeSeriesSplit` cross-validation with an explicit 5-day directional return target ($\pm 1.5\%$) rather than lookahead-biased metrics.
4. **Transparent Sentiment Engine**: Sentiment analysis is driven by local, deterministic VADER lexical scoring and a Financial Context lexicon (<150MB RSS). Legacy `finbertScore` and `distilbertScore` fields are retained as schema-compatibility stubs only if downstream API consumers or UI mocks expect them.
5. **No Secret Leaks**: Strict redaction in logs; no credentials, session tokens, or API keys are ever bundled into client JavaScript.

---

## 🧭 The 6 Core Navigation Sections

The user experience is structured around 6 purpose-built financial views:

1. **Dashboard (`dashboard`)**:
   - Live benchmark indices (**NIFTY 50**, **SENSEX**, **S&P 500**, **NASDAQ**).
   - Global stock search with instant autocomplete across Indian (NSE/BSE) and US equities.
   - Pinned watchlist summary with local persistence.
   - Active market movers from the audited universe catalog.
   - Real-time financial news wire with sentiment indicators.
   - Comprehensive **System & Data Health Strip** (Phase 17 audit).

2. **Stock Analysis (`stock-analysis`)**:
   - **Central Candlestick & Volume Chart**: Interactive SVG charts across 1M, 3M, 6M, 1Y, 3Y, 5Y, and Max timeframes with EMA 20, EMA 50, EMA 200, and VWAP overlays.
   - **Next-Day Tactical Trade Plan**: Algorithmic entry triggers, hard stop-loss levels, and dual targets enforcing a strict $1:2.5$ asymmetric risk-to-reward ratio.
   - **Technical Indicators**: RSI(14), MACD(12,26,9), Stochastic Oscillator (%K, %D), Bollinger Bands, ATR(14) historical volatility range, Floor Trader & Fibonacci Pivots (R1–R3, S1–S3).
   - **Financial News & Sentiment**: Attributed articles, corporate event clustering, and VADER + Financial Context Engine sentiment.
   - **Reddit Community**: Retail investor discussions, upvotes, buzz scores, and sentiment ratios.
   - **Decision Reconciliation**: Integrated multi-timeframe reconciliation addressing short-term tactical setups vs multi-year fundamental moats.

3. **Company Research (`research`)**:
   - **12-Dimension Moat Framework**: Economic moat, pricing power, ROE, capital efficiency, balance sheet leverage, and governance scoring.
   - **Annual P&L Trajectory**: Multi-year financial statements (Revenue, EBITDA, PAT, EPS, margins).
   - **Solvency & Balance Sheet Audit**: Debt-to-Equity, Current Ratio, Operating Cash Flow, Free Cash Flow, and Altman Z-Score indicators.
   - **Peer Valuation Multiples**: Sectoral comparison of P/E, P/B, and growth metrics.

4. **IPO Centre (`ipos`)**:
   - **Audited Primary Pipeline**: Categorized into Upcoming, Open Now, Closed / Awaiting Listing, and Historical Reference Filings.
   - **Statutory Disclosures**: Issue size, Price band, Lot size, Listing date, Subscription rates, Promoters, and Objects of the Issue.
   - **Unofficial Grey Market Premium (GMP)**: Transparent GMP tracking with timestamps and prominent regulatory risk warnings.

5. **Model Lab (`model-lab`)**:
   - **Documented Prediction Target**: 5-day forward directional classification ($+1$ if return $> 1.5\%$, $-1$ if return $< -1.5\%$, $0$ neutral).
   - **Empirical Out-of-Fold Benchmarking**: Supervised comparison (Logistic Regression, Random Forest, Gradient Boosting) against Buy-and-Hold and Majority-Class baselines.
   - **Additive Factor Attribution**: Mathematical decomposition quantifying active indicator and engine contributions.
   - **Strategy Backtesting**: Walk-forward simulation with realistic transaction slippage (10 bps) and execution fees, equity curve vs Buy-and-Hold, metrics, and trade logs.

6. **Watchlist & Risk (`watchlist-risk`)**:
   - **Persistent Watchlist**: Add/remove stocks stored in `localStorage` with live price and change polling.
   - **Quantitative Risk Profile**: Historical Annualized Volatility (30D & 1Y), Historical 1-day 95% Value at Risk (VaR), Maximum Drawdown (1Y), and estimated Beta.
   - **Multi-Exchange Screener**: Multi-criteria filtering by Exchange, Sector, Price, Market Cap, RSI conditions, and EMA trend alignment.

---

## 🛠️ Directory Structure

```text
nexus/
├── .env.example               # Environment variables template (no secrets)
├── .gitignore                 # Excludes cookies, tokens, build artifacts, env
├── index.html                 # HTML entry point with synchronized SEO meta
├── metadata.json              # Platform identity and capabilities
├── package.json               # Full-stack Node scripts & dependencies
├── server.ts                  # Express server + Vite middleware + API endpoints
├── tsconfig.json              # TypeScript compilation configuration
├── vite.config.ts             # Vite frontend bundler config with Tailwind v4
├── src/
│   ├── App.tsx                # Master 6-section navigation container
│   ├── main.tsx               # React 19 DOM entry point
│   ├── types.ts               # Strict TypeScript definitions & interfaces
│   ├── dataEngine.ts          # Financial calculations, technicals, backtest
│   ├── financialSentiment.ts  # Deterministic VADER + financial context engine
│   ├── ipoCatalog.ts          # SEBI DRHP filing data & GMP tracking
│   ├── newsIntelligence.ts    # Google News RSS parser, article clustering
│   ├── universeCatalog.ts     # Curated stock universe & sector classifications
│   └── components/
│       ├── ChartsPage.tsx     # Custom interactive SVG candlestick/line chart
│       ├── BacktestPage.tsx   # Walk-forward strategy backtest & equity curve
│       ├── HelpModal.tsx      # Quantitative methodology documentation
│       ├── pages/
│       │   ├── DashboardPage.tsx         # Section 1: Dashboard
│       │   ├── StockAnalysisPage.tsx     # Section 2: Stock Analysis Hub
│       │   ├── CompanyResearchPage.tsx   # Section 3: Company Research
│       │   ├── TomorrowTradePage.tsx     # 1-Day Tactical Action Plan
│       │   ├── TechnicalIndicatorsPage.tsx# RSI, MACD, ATR, Pivots
│       │   ├── FinancialNewsPage.tsx     # Institutional News & Clusters
│       │   ├── RedditSentimentPage.tsx   # Retail Community Analytics
│       │   ├── BalanceSheetPage.tsx      # Annual P&L & Solvency
│       │   ├── InvestmentAnalysisPage.tsx# 12-Dimension Moat Framework
│       │   ├── DecisionSummaryPage.tsx   # Multi-Timeframe Reconciliation
│       │   ├── ModelLabPage.tsx          # Section 5: Model Lab
│       │   └── WatchlistRiskPage.tsx     # Section 6: Watchlist & Risk
│       └── tabs/
│           ├── UpcomingIPOsTab.tsx       # Section 4: IPO Centre
│           ├── EvaluationTab.tsx         # ML Benchmark Table
│           ├── ExplainabilityTab.tsx     # SHAP Factor Attribution
│           └── ScannerTab.tsx            # Multi-Exchange Stock Screener
└── tests/
    ├── audit_verification.ts             # Invariants, math, and data tests
    ├── data_integrations.ts              # Provider parsing & formatting tests
    ├── financial_sentiment.ts            # VADER & corporate context tests
    └── master_upgrade_verification.ts    # Moat, clustering & signal verification
```

---

## ⚡ Prerequisites & Local Installation

### Prerequisites
- **Node.js**: Version `22.12.0` or newer (Recommended: Node 22 LTS).
- **npm**: Version `10` or newer.
- Modern web browser (Chrome, Edge, Firefox, Safari).

### Local Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/nexus.git
   cd nexus
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment (Optional)**:
   ```bash
   cp .env.example .env
   ```
   *Note: All core features operate out-of-the-box with zero keys.*

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

---

## 🧪 Running Tests & Build Verification

Nexus includes a comprehensive suite of automated unit, integration, and regression tests.

```bash
# 1. Run all automated test suites
npm test

# 2. Run TypeScript static type checking
npm run lint

# 3. Create production bundle
npm run build
```

### Test Coverage Summary:
- **`tests/financial_sentiment.ts`**: Tests deterministic VADER polarity scoring, financial context dictionary, catalyst detection, and zero-token local execution.
- **`tests/audit_verification.ts`**: Verifies dynamic 1:2.5 R:R calculation, ATR historical volatility labelling, absence of zero-converted delivery volume, and SEBI IPO catalog integrity.
- **`tests/data_integrations.ts`**: Verifies RSS headline sanitization, number formatting, currency conversion, sentiment engine offline reporting, and missing-data guards.
- **`tests/master_upgrade_verification.ts`**: Tests 12-dimension moat framework, timeframe disagreement reconciliation, corporate event clustering, and signal weighting.

---

## 🔐 Environment Variables & Secret Safety

| Variable | Required? | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `3000` | Port for Express server (automatically injected by Render). |
| `NODE_ENV` | Optional | `development` | Set to `production` in production environments. |
| `NEWS_API_KEY` | Optional | `""` | NewsAPI key. Keyless Google News RSS is used by default. |
| `REDDIT_CLIENT_ID` | Optional | `""` | Reddit OAuth Client ID for live Reddit API queries. |
| `REDDIT_CLIENT_SECRET` | Optional | `""` | Reddit OAuth Client Secret. |

### Security Rules:
- Private keys must never be committed to git or bundled in client JS.
- `.gitignore` strictly excludes `.env`, `cookies.txt`, `*.token`, and `data_cache/`.
- If session cookies or access tokens were ever previously stored, invalidate them at the provider immediately and clean repository history.

---

## 🚀 Render Deployment Guide (Free Web Service)

Nexus is pre-configured for 1-click deployment on **Render's Free Web Service tier**.

### Step 1: Push Code to GitHub
```bash
git init
git add .
git commit -m "feat: complete Nexus professional financial intelligence platform"
git branch -M main
git remote add origin https://github.com/your-username/nexus.git
git push -u origin main
```

### Step 2: Configure Render Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\to$ **Web Service**.
3. Connect your GitHub repository `nexus`.
4. Configure the service settings:
   - **Name**: `nexus-stock-intelligence`
   - **Language / Runtime**: `Node`
   - **Branch**: `main`
   - **Region**: Closest to your users (e.g., `Singapore` or `Frankfurt`).
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (0.1 CPU, 512MB RAM)

5. **Environment Variables** (in Render Dashboard):
   - `NODE_ENV` = `production`
   - *(Leave all optional API keys blank for 100% keyless operation).*

6. Click **Deploy Web Service**. Render will automatically build the React bundle and launch the Express backend on port `3000`.

### Step 3: Health Check Endpoint
Render monitors service health via:
```text
GET /api/health
```
Returns HTTP 200 with system uptime, RAM consumption, and status of all data providers.

---

## ⚠️ Free-Tier Limitations & Realities

1. **Render Free Sleep Cycle**:
   - Free instances spin down after 15 minutes of inactivity. The first request after sleep may take 30–50 seconds to boot.
2. **512 MB RAM Limit**:
   - The in-memory Node/Express process requires ~220–350 MB RSS.
   - The platform utilizes a lightweight deterministic VADER + Financial Context Engine (<150 MB RAM footprint), easily fitting within free-tier resource limits with zero external token dependencies.
3. **Public Rate Limits**:
   - Public Yahoo Finance endpoints can occasionally rate-limit excessive bursts. The server implements request caching (60s TTL) to prevent throttling.
4. **NSE Delivery Volume**:
   - Exchange delivery settlement files are published by NSE India only after market hours. Intraday delivery percentages will show `N/A` rather than misleading static numbers.

---

## 📜 Statutory Financial Disclaimer

Nexus is an educational and analytical research software platform. Nexus does not provide personalized investment advice, brokerage services, or financial recommendations. Financial markets involve substantial risk of loss. Past performance, backtest simulations, and algorithmic trade setups do not guarantee future results.
