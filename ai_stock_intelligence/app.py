"""
Streamlit application entry point for Explainable AI Stock Analysis & Decision Support System.
"""

from dotenv import load_dotenv

load_dotenv()

from ai_stock_intelligence.ui.dashboard import run_dashboard

if __name__ == "__main__":
    run_dashboard()
