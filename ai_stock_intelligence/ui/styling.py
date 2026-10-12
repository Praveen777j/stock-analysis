"""
Streamlit styling and visual themes.
"""

def get_custom_css() -> str:
    return """
    <style>
        .main-header {
            font-size: 2.2rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 0.1rem;
        }
        .sub-header {
            font-size: 1.05rem;
            color: #94a3b8;
            margin-bottom: 1.2rem;
        }
        .signal-card {
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            padding: 1.4rem;
            text-align: center;
            background: rgba(15, 23, 42, 0.5);
            margin: 1rem 0;
        }
        .disclaimer-card {
            border-top: 1px solid rgba(255, 255, 255, 0.12);
            padding-top: 1.2rem;
            margin-top: 2rem;
            color: #94a3b8;
            font-size: 0.85rem;
        }
    </style>
    """
