"""
Root Streamlit Entry Point
Allows 1-command local execution:
    streamlit run app.py
and direct 1-click deployment on Streamlit Community Cloud (https://share.streamlit.io).
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure workspace root is in python search path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

load_dotenv()

from ai_stock_intelligence.ui.dashboard import run_dashboard

if __name__ == "__main__":
    run_dashboard()
