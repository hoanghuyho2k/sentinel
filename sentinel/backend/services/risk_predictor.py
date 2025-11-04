def extract_features(payload: dict):
    """Convert commit info into risk-related features."""
    files = payload.get("files", [])
    return {
        "lines_changed": payload.get("lines_changed", 0),
        "prev_bugs": payload.get("prev_bugs", 0),
        "test_coverage": payload.get("test_coverage", 100),
        "touches_core": int(any(f.startswith("core/") or f.startswith("db/") for f in files)),
        "num_files_modified": len(files),
    }


def predict_risk_score(features: dict):
    """Heuristic-only risk score prediction with detailed factor impact."""
    safety = 100.0
    factor_impact = {}

    # Lines changed
    lines = features.get("lines_changed", 0)
    if lines > 100:
        safety -= 25
        factor_impact["lines_changed"] = -25
    elif lines > 50:
        safety -= 10
        factor_impact["lines_changed"] = -10
    else:
        factor_impact["lines_changed"] = 0

    # Core files touched
    if features.get("touches_core"):
        safety -= 30
        factor_impact["touches_core"] = -30
    else:
        factor_impact["touches_core"] = 0

    # Previous bugs
    prev_bugs = features.get("prev_bugs", 0)
    safety -= prev_bugs * 5
    factor_impact["prev_bugs"] = -prev_bugs * 5

    # Test coverage
    coverage = features.get("test_coverage", 100)
    if coverage < 80:
        deduction = (80 - coverage) * 0.5
        safety -= deduction
        factor_impact["test_coverage"] = -deduction
    else:
        factor_impact["test_coverage"] = 0

    # Number of files modified
    num_files = features.get("num_files_modified", 0)
    if num_files > 10:
        safety -= 5
        factor_impact["num_files_modified"] = -5
    else:
        factor_impact["num_files_modified"] = 0

    # Clamp between 0–100
    safety = max(0, min(100, safety))
    risk = 100 - safety

    return {
        "risk_score": round(risk, 2),
        "factors": features,
        "factor_impact": factor_impact,
        "message": f"Heuristic risk: {risk:.2f}%",
    }
