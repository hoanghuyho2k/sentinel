# import xgboost as xgb
import os


MODEL_PATH = os.getenv("RISK_MODEL_PATH", "/app/models/risk_predictor.json")
MODEL_LOADED = False
MODEL = None

# Only load if xgboost is available later
if os.path.exists(MODEL_PATH):
    try:
        import xgboost as xgb
        MODEL = xgb.Booster()
        MODEL.load_model(MODEL_PATH)
        MODEL_LOADED = True
    except ImportError:
        MODEL_LOADED = False


def extract_features(payload: dict):
    return {
        "lines_changed": payload.get("lines_changed", 0),
        "prev_bugs": payload.get("prev_bugs", 0),
        "test_coverage": payload.get("test_coverage", 100),
        "touches_core": int(any(f.startswith("core/") or f.startswith("db/") for f in payload.get("files", [])))
    }

def predict_risk_score(features: dict):
    if not MODEL_LOADED:
        safety = 100.0
        if features["lines_changed"] > 100: safety -= 20
        elif features["lines_changed"] > 50: safety -= 10
        if features["touches_core"]: safety -= 30
        safety -= features["prev_bugs"] * 5
        if features["test_coverage"] < 80: safety -= (80 - features["test_coverage"]) * 0.5
        safety = max(0.0, min(100.0, safety))
        # Convert to RISK (higher = more dangerous)
        risk = 100.0 - safety
        return {"risk_score": risk, "factors": features, "message": f"Risk score (heuristic): {risk:.1f}% (safety={safety:.1f}%)"}
    import pandas as pd
    row = pd.DataFrame([features])
    # dmat = xgb.DMatrix(row)
    pred = MODEL.predict(dmat)[0]
    safety = float(pred) * 100.0
    return {"risk_score": round(risk,2), "factors": features, "message": f"Risk score (model): {risk:.2f}%"}
