def _rule_intent(text: str):
    """Rule-based commit classification."""
    t = text.strip().lower()
    if t.startswith("fix") or "bug" in t:
        return "bug_fix", 0.9
    if t.startswith("feat") or "feature" in t:
        return "feature", 0.9
    if "refactor" in t:
        return "refactor", 0.85
    if "doc" in t or "readme" in t:
        return "documentation", 0.9
    if "test" in t:
        return "test", 0.9
    if "perf" in t or "performance" in t:
        return "performance", 0.85
    if "security" in t:
        return "security", 0.95
    if "chore" in t:
        return "chore", 0.8
    return "other", 0.6


def check_compliance(commit_message: str, changed_files: list, pr_title: str = "", pr_labels: list = []):
    """Simplified compliance logic — no ML dependencies."""
    labels_lower = [l.lower() for l in (pr_labels or [])]
    if any(l in ("allow-during-freeze", "hotfix") for l in labels_lower):
        return {
            "is_compliant": True,
            "category": "label_override",
            "confidence": 1.0,
            "message": "Allowed via label override"
        }

    text = (pr_title + " " + commit_message).strip()
    intent, confidence = _rule_intent(text)

    high_risk = any(f.startswith("core/") or f.endswith(".sql") for f in (changed_files or []))
    allowed = ["bug_fix", "feature", "documentation", "test", "chore"]

    if intent in allowed and not high_risk:
        return {
            "is_compliant": True,
            "category": intent,
            "confidence": confidence,
            "message": f"{intent} allowed"
        }
    else:
        return {
            "is_compliant": False,
            "category": intent,
            "confidence": confidence,
            "message": f"{intent} not allowed"
        }