from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json, os
from services.compliance_checker import check_compliance
from services.risk_predictor import predict_risk_score, extract_features

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "/app/data/prototype.json"

def read_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def write_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

@app.get("/api/history")
def get_history():
    """Return all commit records."""
    return read_data()

@app.post("/api/analyze")
def analyze_commit(payload: dict):
    """
    Analyze commit payload → combine compliance + risk → append to prototype.json.
    """
    try:
        compliance = check_compliance(
            commit_message=payload.get("commit_message", ""),
            changed_files=payload.get("file_modified", []),
            pr_title=payload.get("pr_title", ""),
            pr_labels=payload.get("pr_labels", []),
        )

        features = extract_features(payload)
        risk = predict_risk_score(features)

        record = {
            "id": payload.get("id") or int(os.urandom(1)[0]),
            "user": payload.get("user", "anonymous"),
            "project": payload.get("project", "Unknown"),
            "commit_message": payload.get("commit_message", ""),
            "commit_hash": payload.get("commit_hash", "N/A"),
            "repo_url": payload.get("repo_url", ""),
            "risk_score": risk["risk_score"],
            "confident_score": int(compliance.get("confidence", 0) * 100),
            "freeze_request": False,
            "feedback": compliance.get("message", ""),
            "file_added": payload.get("file_added", []),
            "file_removed": payload.get("file_removed", []),
            "file_modified": payload.get("file_modified", []),
            "timestamp": payload.get("timestamp"),
        }

        data = read_data()
        data.append(record)
        write_data(data)

        return {"status": "ok", "new_record": record}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))