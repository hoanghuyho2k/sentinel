import os

# ------------------------------------------------------------
# Optional ML model loading (XGBoost)
# ------------------------------------------------------------
MODEL_PATH = os.getenv("RISK_MODEL_PATH", "/app/models/risk_predictor.json")
MODEL_LOADED = False
MODEL = None

try:
    import xgboost as xgb
    import pandas as pd

    if os.path.exists(MODEL_PATH):
        MODEL = xgb.Booster()
        MODEL.load_model(MODEL_PATH)
        MODEL_LOADED = True
        print(f"✅ Risk model loaded successfully from {MODEL_PATH}")
    else:
        print(f"⚠️ Risk model file not found at {MODEL_PATH}. Using heuristic fallback.")

except ImportError as e:
    print(f"⚠️ XGBoost or Pandas not installed ({e}). Using fallback mode.")
    MODEL_LOADED = False


# ------------------------------------------------------------
# Feature extraction
# ------------------------------------------------------------
def extract_features(payload: dict):
    """
    Convert commit data into numerical features for risk analysis.
    """
    return {
        "lines_changed": payload.get("lines_changed", 0),
        "prev_bugs": payload.get("prev_bugs", 0),
        "test_coverage": payload.get("test_coverage", 100),
        "touches_core": int(
            any(f.startswith("core/") or f.startswith("db/") for f in payload.get("files", []))
        ),
    }


# ------------------------------------------------------------
# Risk prediction logic
# ------------------------------------------------------------
def predict_risk_score(features: dict):
    """
    Predict the risk score based on code change features.
    Uses ML model if available, otherwise a heuristic fallback.
    Returns a dict with risk score, contributing factors, and message.
    """

    # ML model path (if available)
    if MODEL_LOADED and MODEL is not None:
        try:
            import pandas as pd
            import xgboost as xgb

            df = pd.DataFrame([features])
            dmat = xgb.DMatrix(df)
            pred = MODEL.predict(dmat)[0]

            # Interpret model output (assume higher value = higher risk)
            risk = float(pred) * 100.0
            risk = max(0.0, min(100.0, risk))

            return {
                "risk_score": round(risk, 2),
                "factors": features,
                "message": f"Risk score (model): {risk:.2f}%",
            }

        except Exception as e:
            print(f"⚠️ Model inference failed: {e}. Falling back to heuristic.")
            return _heuristic_risk(features)

    # Default fallback
    return _heuristic_risk(features)


# ------------------------------------------------------------
# Heuristic fallback risk estimation
# ------------------------------------------------------------
def _heuristic_risk(features: dict):
    """
    Fallback rule-based heuristic for estimating risk if model not available.
    Lower safety = higher risk.
    """
    safety = 100.0

    # Penalize large diffs
    lines = features.get("lines_changed", 0)
    if lines > 100:
        safety -= 25
    elif lines > 50:
        safety -= 10

    # Core or DB file changes
    if features.get("touches_core"):
        safety -= 30

    # Previous bug count
    safety -= features.get("prev_bugs", 0) * 5

    # Low test coverage
    coverage = features.get("test_coverage", 100)
    if coverage < 80:
        safety -= (80 - coverage) * 0.5

    # Clamp safety between 0–100
    safety = max(0.0, min(100.0, safety))

    # Convert to risk score
    risk = 100.0 - safety

    return {
        "risk_score": round(risk, 2),
        "factors": features,
        "message": f"Risk score (heuristic): {risk:.2f}% (safety={safety:.2f}%)",
    }