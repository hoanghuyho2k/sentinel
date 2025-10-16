import os

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
    model = None
    tokenizer = None
    classifier = None
    MODEL_AVAILABLE = False
    model_dir = os.getenv("COMPLIANCE_MODEL_DIR", "/app/models/compliance_checker")
    if os.path.exists(model_dir):
        tokenizer = AutoTokenizer.from_pretrained(model_dir)
        model = AutoModelForSequenceClassification.from_pretrained(model_dir)
        classifier = pipeline("text-classification", model=model, tokenizer=tokenizer)
        MODEL_AVAILABLE = True
except Exception:
    MODEL_AVAILABLE = False

def _rule_intent(text: str):
    t = text.strip().lower()
    if t.startswith("fix") or "fix:" in t or "bug" in t:
        return "bug_fix", 0.9
    if t.startswith("feat") or "feature" in t:
        return "feature", 0.9
    if "refactor" in t:
        return "refactor", 0.85
    if "doc" in t or "readme" in t or "documentation" in t:
        return "documentation", 0.9
    if "test" in t or "spec" in t:
        return "test", 0.9
    if "perf" in t or "performance" in t:
        return "performance", 0.85
    if "security" in t or "vulnerability" in t:
        return "security", 0.95
    if "chore" in t or "cleanup" in t:
        return "chore", 0.8
    if "experiment" in t or "proof of concept" in t:
        return "experimental", 0.7
    return "other", 0.6


def check_compliance(commit_message: str, changed_files: list, pr_title: str = "", pr_labels: list = []):
    labels_lower = [l.lower() for l in (pr_labels or [])]
    if any(l in ("allow-during-freeze", "hotfix") for l in labels_lower):
        return {"is_compliant": True, "title": "Label override", "message": "Allowed via label.", "category": "label_override", "confidence": 0.99}

    text = (pr_title + " " + commit_message).strip()
    if MODEL_AVAILABLE:
        try:
            pred = classifier(text)
            label = pred[0]['label'].lower()
            score = float(pred[0]['score'])
            intent = label
            confidence = score
        except Exception:
            intent, confidence = _rule_intent(text)
    else:
        intent, confidence = _rule_intent(text)

    high_risk = any(f.startswith("core/") or f.startswith("db/") or f.endswith(".sql") for f in (changed_files or []))

    allowed_categories = ["bug_fix", "feature", "documentation", "test", "chore"]
    
    if intent in allowed_categories and not high_risk:
        return {"is_compliant": True, "category": intent, "confidence": confidence, "message": f"{intent.replace('_',' ').title()} allowed."}
    else:
        return {"is_compliant": False, "category": intent, "confidence": confidence, "message": f"Change classified as '{intent}', not allowed."}
