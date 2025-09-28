import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery = Celery("sentinel", broker=redis_url, backend=redis_url)

@celery.task
def process_commit_async(commit_payload):
    from services.compliance_checker import check_compliance
    from services.risk_predictor import extract_features, predict_risk_score
    res = check_compliance(commit_payload.get("commit_message",""), commit_payload.get("files",[]), "", commit_payload.get("labels",[]))
    features = extract_features({
        "files": commit_payload.get("files",[]),
        "lines_changed": commit_payload.get("lines_changed",0),
        "prev_bugs": commit_payload.get("prev_bugs",0),
        "test_coverage": commit_payload.get("test_coverage",100)
    })
    risk = predict_risk_score(features)
    return {"compliance": res, "risk": risk}
