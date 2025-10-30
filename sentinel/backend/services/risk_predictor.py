def extract_features(payload: dict):
    """Convert commit info into risk-related features."""
    return {
        "lines_changed": payload.get("lines_changed", 0),
        "prev_bugs": payload.get("prev_bugs", 0),
        "test_coverage": payload.get("test_coverage", 100),
        "touches_core": int(any(f.startswith("core/") or f.startswith("db/") for f in payload.get("files", []))),
    }


def predict_risk_score(features: dict):
    """Heuristic-only risk score prediction."""
    safety = 100.0
    lines = features.get("lines_changed", 0)
    if lines > 100:
        safety -= 25
    elif lines > 50:
        safety -= 10

    if features.get("touches_core"):
        safety -= 30

    safety -= features.get("prev_bugs", 0) * 5

    coverage = features.get("test_coverage", 100)
    if coverage < 80:
        safety -= (80 - coverage) * 0.5

    safety = max(0, min(100, safety))
    risk = 100 - safety

    return {
        "risk_score": round(risk, 2),
        "factors": features,
        "message": f"Heuristic risk: {risk:.2f}%",
    }