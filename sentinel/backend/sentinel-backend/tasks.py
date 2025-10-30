import os
import sys
import json
from celery import Celery
from dotenv import load_dotenv

# ------------------------------------------------------------
# Load environment and set paths
# ------------------------------------------------------------
load_dotenv()

# Ensure correct import path (for backend/services)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)
    sys.path.append(os.path.join(BASE_DIR, "services"))

# ------------------------------------------------------------
# Redis / Celery setup
# ------------------------------------------------------------
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery = Celery(
    "sentinel",
    broker=redis_url,
    backend=redis_url,
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

# ------------------------------------------------------------
# Celery task definitions
# ------------------------------------------------------------
@celery.task(name="sentinel.process_commit_async")
def process_commit_async(commit_payload):
    """
    Run compliance + risk prediction asynchronously.
    This can be called from backend API or triggered by frontend.
    """
    try:
        from services.compliance_checker import check_compliance
        from services.risk_predictor import extract_features, predict_risk_score

        # Compliance check
        compliance_result = check_compliance(
            commit_payload.get("commit_message", ""),
            commit_payload.get("files", []),
            "",
            commit_payload.get("labels", []),
        )

        # Risk prediction
        features = extract_features({
            "files": commit_payload.get("files", []),
            "lines_changed": commit_payload.get("lines_changed", 0),
            "prev_bugs": commit_payload.get("prev_bugs", 0),
            "test_coverage": commit_payload.get("test_coverage", 100),
        })
        risk_result = predict_risk_score(features)

        # Combined result
        result = {"compliance": compliance_result, "risk": risk_result}
        print("✅ Celery processed commit:", json.dumps(result, indent=2))
        return result

    except Exception as e:
        print(f"❌ Error in process_commit_async: {e}")
        return {"error": str(e)}


# ------------------------------------------------------------
# Confirm task registration
# ------------------------------------------------------------
if __name__ == "__main__":
    print("🚀 Celery worker ready. Registered tasks:")
    print(celery.tasks.keys())