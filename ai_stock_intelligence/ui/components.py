"""
Reusable Streamlit UI visual components.
"""

import streamlit as st
from typing import Dict, Any


def render_signal_card(signal: str, probabilities: Dict[str, float], confidence: str, horizon: str = "Next Trading Day"):
    color = "#10b981" if signal in ("BUY", "UP") else "#ef4444" if signal in ("SELL", "DOWN") else "#f59e0b"
    
    # Check if binary (UP/DOWN) or 3-class (BUY/HOLD/SELL)
    if "UP" in probabilities or "DOWN" in probabilities:
        p_up = int(probabilities.get("UP", 0.0) * 100)
        p_down = int(probabilities.get("DOWN", 0.0) * 100)
        prob_html = f"""
            <span>PROB(UP): <strong style="color: #10b981;">{p_up}%</strong></span>
            <span>PROB(DOWN): <strong style="color: #ef4444;">{p_down}%</strong></span>
        """
    else:
        p_buy = int(probabilities.get("BUY", 0.0) * 100)
        p_hold = int(probabilities.get("HOLD", 0.0) * 100)
        p_sell = int(probabilities.get("SELL", 0.0) * 100)
        prob_html = f"""
            <span>BUY: <strong style="color: #10b981;">{p_buy}%</strong></span>
            <span>HOLD: <strong style="color: #f59e0b;">{p_hold}%</strong></span>
            <span>SELL: <strong style="color: #ef4444;">{p_sell}%</strong></span>
        """

    st.markdown(f"""
    <div class="signal-card">
        <div style="font-size: 0.85rem; letter-spacing: 0.08em; color: #94a3b8; font-weight: 600;">CALIBRATED ML DECISION SIGNAL</div>
        <div style="font-size: 2.4rem; font-weight: 800; color: {color}; margin: 0.3rem 0; font-family: monospace;">{signal}</div>
        <div style="display: flex; justify-content: center; gap: 2rem; font-size: 1.05rem; font-family: monospace; font-weight: 600; margin: 0.6rem 0;">
            {prob_html}
        </div>
        <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.4rem;">
            Prediction Horizon: <strong style="color: #f1f5f9;">{horizon}</strong> &nbsp;·&nbsp;
            Confidence: <strong style="color: #f1f5f9;">{confidence}</strong>
        </div>
    </div>
    """, unsafe_allow_html=True)


def render_disclaimer():
    st.markdown("""
    <div class="disclaimer-card" style="margin-top: 2rem; padding: 1rem 1.25rem; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.04); font-size: 0.85rem; color: #94a3b8;">
        <strong style="color: #f87171;">Statistical & Academic Notice:</strong> Model output is a statistical estimate based on historical data and is not guaranteed future performance.
        Quantitative models, simulated backtests, and technical indicators are provided strictly for educational and academic research.
        Financial markets carry inherent risk of permanent capital loss; never risk funds you cannot afford to lose.
    </div>
    """, unsafe_allow_html=True)
