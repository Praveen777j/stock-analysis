"""
Standalone Lightweight FinBERT Inference Microservice (Optional Python Backend)
=============================================================================
Model ID: ProsusAI/finbert (https://huggingface.co/ProsusAI/finbert)
License: Apache 2.0 (Permissive Open Source)
Classes: positive, negative, neutral

Target Use Case:
- Local development or dedicated VM environments with Python >=3.10 and PyTorch >=2.0.
- On Render Free (512MB RAM ceiling), running PyTorch alongside Node.js/Express is
  memory-prohibitive (~1.2GB RAM). In that environment, the Node.js Express server
  uses in-process @xenova/transformers ONNX CPU inference (65MB model) or Hugging Face Router.
- This Python script is provided as a standalone reference service for users deploying
  on larger hardware or multi-service architectures.

Usage:
    pip install -r requirements.txt
    python scripts/finbert_service.py --port 8000
"""

import sys
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import argparse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FinBERT-Service")

# Global model state
MODEL_ID = "ProsusAI/finbert"
CLASSES = ["positive", "negative", "neutral"]
_tokenizer = None
_model = None
_torch = None
_model_load_error = None

def load_finbert():
    global _tokenizer, _model, _torch, _model_load_error
    if _model is not None:
        return _model, _tokenizer

    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        _torch = torch

        logger.info(f"Loading pretrained weights for {MODEL_ID} on CPU (eval mode)...")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        _model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
        _model.eval()  # Disable dropout and training behavior
        logger.info(f"Successfully loaded {MODEL_ID} (License: Apache 2.0)")
        return _model, _tokenizer
    except Exception as e:
        _model_load_error = str(e)
        logger.warning(f"Could not load PyTorch FinBERT model: {e}")
        return None, None

def classify_texts(texts):
    """
    Performs bounded sequence classification on an array of financial headlines.
    Returns: list of dicts with label, score (pos - neg), and class probabilities.
    """
    model, tokenizer = load_finbert()
    if model is None or tokenizer is None:
        return {
            "status": "UNAVAILABLE",
            "message": "FinBERT sentiment is temporarily unavailable.",
            "error": _model_load_error or "PyTorch/transformers dependencies missing",
            "items": []
        }

    clean_texts = [str(t).strip()[:512] for t in texts if str(t).strip()][:10]
    if not clean_texts:
        return {"status": "UNAVAILABLE", "message": "No input texts provided", "items": []}

    try:
        import torch
        with torch.no_grad():
            inputs = tokenizer(clean_texts, padding=True, truncation=True, max_length=512, return_tensors="pt")
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1).cpu().numpy()

        results = []
        for i, p in enumerate(probs):
            # Model output classes: 0 -> positive, 1 -> negative, 2 -> neutral
            pos = float(p[0])
            neg = float(p[1])
            neu = float(p[2])
            diff = round(pos - neg, 2)
            
            dominant = "NEUTRAL"
            if pos > neg and pos > neu:
                dominant = "POSITIVE"
            elif neg > pos and neg > neu:
                dominant = "NEGATIVE"

            results.append({
                "text": clean_texts[i],
                "label": dominant,
                "score": diff,
                "probabilities": {
                    "positive": round(pos, 3),
                    "neutral": round(neu, 3),
                    "negative": round(neg, 3)
                }
            })

        return {
            "status": "LIVE",
            "model": MODEL_ID,
            "classes": CLASSES,
            "sentimentFormula": "positive_probability - negative_probability",
            "items": results
        }
    except Exception as e:
        logger.error(f"Inference error: {e}")
        return {
            "status": "UNAVAILABLE",
            "message": "FinBERT sentiment is temporarily unavailable.",
            "error": str(e),
            "items": []
        }

class FinbertHTTPHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            is_loaded = _model is not None
            self._send_json(200, {
                "status": "ok",
                "service": "FinBERT Python Inference Microservice",
                "modelId": MODEL_ID,
                "modelLoaded": is_loaded,
                "classes": CLASSES,
                "license": "Apache 2.0"
            })
        else:
            self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
        if self.path == "/sentiment":
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0 or content_length > 1024 * 1024:
                self._send_json(400, {"error": "Invalid request payload size"})
                return

            body = self.rfile.read(content_length)
            try:
                payload = json.loads(body.decode("utf-8"))
                texts = payload.get("texts", [])
                if not isinstance(texts, list):
                    self._send_json(400, {"error": "'texts' must be an array of strings"})
                    return
                resp = classify_texts(texts)
                self._send_json(200, resp)
            except json.JSONDecodeError:
                self._send_json(400, {"error": "Malformed JSON"})
        else:
            self._send_json(404, {"error": "Not Found"})

def main():
    parser = argparse.ArgumentParser(description="FinBERT Python Inference Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default 8000)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (default 127.0.0.1)")
    args = parser.parse_args()

    server = HTTPServer((args.host, args.port), FinbertHTTPHandler)
    logger.info(f"FinBERT Microservice listening on http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server shutting down.")

if __name__ == "__main__":
    main()
