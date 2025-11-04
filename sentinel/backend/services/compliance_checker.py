import re
from datetime import datetime

AUTHORIZED_AUTHORS = ["huy@gmail.com", "son@gmail.com", "pooja@gmail.com", "kas@gmail.com", "gayan@gmail.com"]
PROTECTED_DIRS = ["core/", "db/", "auth/"]
APPROVED_LABELS = ["@approved", "allow-during-freeze", "hotfix"]
TEMP_FILE_EXTENSIONS = [".tmp", ".bak", "~"]
PREFIXES = ["fix:", "feat:", "test:", "docs:"]

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


def check_compliance(commit_message: str, changed_files: list, pr_title: str = "", pr_labels: list = [], author_email: str = None, timestamp: str = None):
    labels_lower = [l.lower() for l in (pr_labels or [])]

    # Rule 0: Label override
    if any(l in APPROVED_LABELS for l in labels_lower):
        return {
            "is_compliant": True,
            "category": "label_override",
            "confidence": 1.0,
            "message": "Allowed via label override"
        }

    text = (pr_title + " " + commit_message).strip()
    intent, confidence = _rule_intent(text)
    warnings = []

    # Rule 1: Prefix validation
    if not any(commit_message.lower().startswith(p) for p in PREFIXES):
        warnings.append("Commit prefix missing or invalid")
        confidence *= 0.7

    # Rule 2: Protected directories
    if any(f.startswith(tuple(PROTECTED_DIRS)) for f in (changed_files or [])):
        if not any(l in labels_lower for l in APPROVED_LABELS):
            warnings.append("Protected directory modified without approval")
            confidence *= 0.6

    # Rule 3: Empty/short message
    if len(commit_message.strip()) < 10:
        warnings.append("Commit message too short")
        confidence *= 0.5

    # Rule 4: Risky keywords
    risky_keywords = ["temporary", "quick fix", "test only"]
    if any(k in commit_message.lower() for k in risky_keywords):
        warnings.append("Contains risky keyword")
        confidence *= 0.7

    # Rule 5: Multiple prefixes
    if len(re.findall(r"\b(fix|feat|test|docs):", commit_message.lower())) > 1:
        warnings.append("Multiple prefixes detected")
        confidence *= 0.85

    # Rule 6: File type
    if any(f.endswith(tuple(TEMP_FILE_EXTENSIONS)) for f in (changed_files or [])):
        warnings.append("Contains temporary/backup files")
        confidence *= 0.6

    # Rule 7: Author validation
    if author_email and author_email not in AUTHORIZED_AUTHORS:
        warnings.append(f"Unauthorized author: {author_email}")
        confidence *= 0.8

    # Rule 8: Branch protection – handled in main.py / Git workflow

    # Rule 9: Message format
    if not re.match(r"^\w+(\(\w+\))?: .+", commit_message):
        warnings.append("Message format incorrect")
        confidence *= 0.9

    # Rule 10: Commit length
    if len(commit_message.splitlines()) > 100:
        warnings.append("Commit message too long")
        confidence *= 0.85

    # Rule 11: Timestamp validation
    if timestamp:
        try:
            commit_time = datetime.fromisoformat(timestamp.replace("Z",""))
            if commit_time > datetime.now():
                warnings.append("Commit timestamp is in the future")
                confidence *= 0.9
        except Exception:
            warnings.append("Invalid timestamp")
            confidence *= 0.9

    is_compliant = len(warnings) == 0
    message = " | ".join(warnings) if warnings else f"{intent} allowed"

    return {
        "is_compliant": is_compliant,
        "category": intent,
        "confidence": round(confidence, 2),
        "message": message
    }
