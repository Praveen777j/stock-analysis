# Nexus Stock Sentiment Dashboard
> **A Real-Time Stock Market Intelligence Web Application & Explainable Quantitative AI System**

Nexus is a complete stock market intelligence platform that combines **live financial news sentiment (FinBERT & VADER)**, **Reddit community analytics**, **multi-indicator technical analysis (RSI, MACD, EMAs, Bollinger Bands, ATR)**, **audited multi-year company financials & annual P&L trajectory**, **upcoming IPOs with Grey Market Premium (GMP)**, and **calibrated machine learning models with walk-forward backtesting**.

---

## 🚀 Complete Development & Deployment Lifecycle

```text
       AI Studio (Download / Export Project Zip)
                         ↓
               Open folder in VS Code
                         ↓
          Create Python Virtual Environment (venv)
                         ↓
             pip install -r requirements.txt
                         ↓
              Copy .env.example to .env
                         ↓
                Run Streamlit (app.py)
                         ↓
            Test locally at http://localhost:8501
                         ↓
               Commit & Push to GitHub
                         ↓
    Deploy Free on Streamlit Community Cloud (share.streamlit.io)
```

---

## 📋 System Prerequisites

* **Operating System**: Windows 10/11 (or macOS / Linux)
* **Code Editor**: Visual Studio Code (VS Code)
* **Node.js**: Version **22.12 or newer** (Download from [nodejs.org](https://nodejs.org/))
* **Python**: Version **3.10 to 3.12** recommended (Python 3.10+ supported)

---

## ⚡ Quick Start: Windows VS Code Setup Guide

Follow these exact steps to clone or open and run the project locally on Windows:

### Step 1: Open Project in VS Code
1. Launch **Visual Studio Code**.
2. Go to **File -> Open Folder...** and select the project root directory.
3. Open a new integrated terminal by pressing `` Ctrl + ` `` (or **Terminal -> New Terminal**).

---

### Step 2: Configure Python Virtual Environment (Windows)

In the VS Code terminal (PowerShell or Command Prompt):

#### If using PowerShell:
```powershell
# 1. Enable execution of local scripts for the current session (if restricted)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 2. Create a clean virtual environment
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1
```

#### If using Command Prompt (cmd.exe):
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

> **Verification**: Your terminal prompt will now show `(venv)` prefix.

---

### Step 3: Install Python Dependencies

With `(venv)` activated, upgrade pip and install all required scientific and ML dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 4: Install Node.js Dependencies

In the same root directory, install the full-stack web application packages:

```bash
npm install
```

---

### Step 5: Environment Variables Setup (`.env`)

Create your local `.env` file from the provided template:

#### PowerShell:
```powershell
Copy-Item .env.example .env
```

#### Command Prompt:
```cmd
copy .env.example .env
```

> **Note on API Keys**: **NO API keys are required to run the application.** 
> All market data (Yahoo Finance), news headlines (Google News RSS), FinBERT sentiment, and technical indicators function out-of-the-box with zero configuration. Optional API keys can be added to `.env` if desired (see [API Keys Reference](#-api-keys--external-services-reference)).

---

### Step 6: Run the Application

You can run either the **Full-Stack Web Application** or the **Streamlit Analytics Dashboard**:

#### Option A: Unified Streamlit Intelligence Platform (Primary Target)
This runs the single integrated application featuring all 9 core academic modules:
* 📊 **Dashboard** (Executive market summary, quote metrics, signal badge, benchmark)
* 🔍 **Stock Search** (Global & Indian multi-exchange universe explorer + batch scanner)
* 📈 **Technical Analysis** (Candlestick charts, zero-leakage RSI, MACD, EMAs, Bollinger Bands)
* 📰 **News/Sentiment** (Dual-engine FinBERT & VADER analysis, zero-leakage news policy)
* 🤖 **ML Prediction** (Calibrated probability estimates, factor attribution, target formulation)
* 🔄 **Backtesting** (Walk-forward execution, 15 bps friction, Sortino, trade logs)
* 📋 **Model Evaluation** (Chronological 3-way split, baselines, confusion matrix, honest reporting)
* 💡 **Explainability** (SHAP Tree Attribution & factor contribution breakdown)
* ⚙️ **Settings** (MCA academic metadata, viva voce defense topics, reproducibility)

```bash
python -m streamlit run app.py
```
*(Or simply: `streamlit run app.py`)*

Open your browser at:
👉 **[http://localhost:8501](http://localhost:8501)**

---

#### Option B: Full-Stack React + Express Web Application
If you also want to run the full-stack TypeScript dashboard:

```bash
npm run dev
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 API Keys & External Services Reference

| Service | Used In | API Key Required? | Notes |
| :--- | :--- | :--- | :--- |
| **Yahoo Finance (`yfinance`)** | Prices, OHLCV, Metrics | **NO (Free)** | Uses public Yahoo Finance endpoints with automatic session cookies & crumbs. |
| **Google News RSS** | Financial News Feed | **NO (Free)** | Fetches real-time RSS feeds directly without authentication. |
| **VADER Sentiment** | NLP Lexicon Scoring | **NO (Free)** | Downloads `vader_lexicon` locally on first run via NLTK. |
| **FinBERT Transformer** | NLP Sentiment (`ProsusAI/finbert`) | **NO (Free)** | Hugging Face downloads pretrained model weights into local cache automatically. |
| **NewsAPI (`NEWS_API_KEY`)** | Financial Press | **OPTIONAL** | If empty, gracefully falls back to Google News RSS with zero errors. |
| **Reddit OAuth API** | Social Sentiment | **OPTIONAL** | If empty, provides curated community sentiment without crashing. |
| **Finnhub / AlphaVantage** | Supplemental Quotes | **OPTIONAL** | Handled gracefully if omitted. |

---

## 📊 Pre-packaged Datasets & Model Artifacts

* **Equities Universe Datasets**:
  - `ai_stock_intelligence/data/stock_universe.csv`: 2,500+ Indian (NSE/BSE) and global tickers.
  - `ai_stock_intelligence/data/stock_universe_full.csv`: Extended securities universe.
* **Model Serialization**:
  - `project/models/`: Target directory for saved scikit-learn models (`trained_model.pkl`).
  - `ai_stock_intelligence/models_saved/`: Target directory for trained ensemble and calibration models.
  - Models are trained on-demand with 1 click in the UI using temporal cross-validation (`TimeSeriesSplit`) to guarantee zero look-ahead bias.

---

## 🛠️ Windows Troubleshooting

### 1. PowerShell Script Execution Policy
If you get `File ... Activate.ps1 cannot be loaded because running scripts is disabled`:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

### 2. Port 3000 Already in Use
If port 3000 is occupied by another application, either stop that process or specify a different port in your `.env` file:
```env
PORT=3001
```

### 3. PyTorch Installation on Windows
If `torch` or `transformers` encounters issues during pip install, you can install the CPU version directly:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install transformers
```
*(Note: If torch is not installed, the application automatically uses high-precision financial domain heuristics so you can still run seamlessly.)*

---

## 🐙 Push to GitHub Guide

When you're ready to store your code on GitHub:

1. Open your terminal in the project folder.
2. Initialize git and make your first commit:
```bash
git init
git add .
git commit -m "feat: initial commit for AI stock intelligence dashboard"
```

3. Create a new empty repository on [GitHub](https://github.com/new) (e.g. `stock-intelligence-dashboard`).
4. Link and push your branch:
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

*(Note: `.gitignore` is already preconfigured to ensure your local `venv/`, `node_modules/`, and `.env` credentials are never pushed.)*

---

## 🌐 100% Free Cloud Deployment Guide

### Option 1: Streamlit Community Cloud (Recommended for Streamlit)
Streamlit Community Cloud provides **unlimited free hosting** directly from GitHub:

1. Go to **[share.streamlit.io](https://share.streamlit.io)** and log in with your GitHub account.
2. Click **"New app"**.
3. Select your repository: `YOUR_USERNAME/YOUR_REPO_NAME`.
4. Branch: `main`.
5. Main file path: **`app.py`** *(or `ai_stock_intelligence/app.py`)*.
6. Under **Advanced settings -> Secrets**, you can optionally paste any API keys (e.g., `NEWS_API_KEY`), or leave it blank as default features require **zero API keys**.
7. Click **Deploy!** — Within 2 minutes, you will receive a free public `*.streamlit.app` URL.

---

### Option 2: Render / Railway / Fly.io (For Full-Stack Node + React App)
1. Link your GitHub repository on [render.com](https://render.com).
2. Choose **Web Service**.
3. Environment: **Node**
4. Node Version: **22.12 or newer (Node 22+)**
5. Build Command: `npm install && npm run build`
6. Start Command: `npm run start` (runs `tsx server.ts` with production static serving)
7. Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (or leave default assigned by Render `$PORT`)
8. Free tier includes automatic HTTPS, managed TLS certificates, and auto-deploy on git push.

---

### Option 3: Hugging Face Spaces (Free ML / Streamlit Hosting)
1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. Select **Streamlit** SDK.
3. Push your repository files or link your GitHub repo.
4. Hugging Face automatically installs `requirements.txt` and starts your app for free.

---

## 📂 Project Structure

```
├── .env.example              # Environment variables template
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies and scripts
├── server.ts                 # Full-stack Express backend with Yahoo Finance proxy & RSS
├── vite.config.ts            # Vite build configuration
├── index.html                # Application entry HTML
├── src/                      # React frontend
│   ├── App.tsx               # Main application orchestration & 8-page router
│   ├── types.ts              # TypeScript domain interfaces
│   ├── dataEngine.ts         # Quantitative computations & data pipeline
│   ├── universeCatalog.ts    # Curated Indian & Global stock universe
│   └── components/
│       ├── pages/            # Page components (Tomorrow Trade Desk, Financials, etc.)
│       └── tabs/             # IPO and analysis tabs
├── ai_stock_intelligence/    # Comprehensive Python Streamlit application
│   ├── app.py                # Streamlit entry point
│   ├── config/               # Settings & environment configuration
│   ├── data/                 # Market data, News, Reddit, Universe CSVs
│   ├── features/             # Technical and sentiment feature engineering
│   ├── models/               # Walk-forward training, calibration, registry
│   ├── backtesting/          # Transaction-cost-aware backtesting engine
│   └── explainability/       # SHAP feature attribution
└── project/                  # Lightweight Python Streamlit module
    ├── app.py                # Streamlit application
    ├── services.py           # yfinance & news services
    ├── model.py              # Gradient Boosting with probability calibration
    └── backtest.py           # Historical simulation engine
```
