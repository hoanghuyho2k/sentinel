from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import json, os
from services.compliance_checker import check_compliance
from services.risk_predictor import predict_risk_score, extract_features
from pathlib import Path
from fastapi.responses import StreamingResponse
import csv, io
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import random, traceback
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RAW_PATH = Path("/app/data/raw_commits.json")
PROCESSED_PATH = Path("/app/data/prototype.json")


def read_data():
    if not os.path.exists(PROCESSED_PATH):
        return []
    with open(PROCESSED_PATH, "r") as f:
        return json.load(f)


def write_data(data):
    with open(PROCESSED_PATH, "w") as f:
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


@app.get("/api/insights")
def get_ai_insights():
    """Generate AI-style commit summary."""
    try:
        if not PROCESSED_PATH.exists():
            return {"insight": "No data available."}

        with open(PROCESSED_PATH, "r") as f:
            commits = json.load(f)

        if not commits:
            return {"insight": "No commits to analyze."}

        # Compute summary
        avg_risk = sum(c["risk_score"] for c in commits) / len(commits)
        avg_conf = sum(c["confident_score"] for c in commits) / len(commits)
        freeze_count = sum(1 for c in commits if c["freeze_request"])
        project_count = len(set(c["project"] for c in commits))

        insight = (
            f"Across {project_count} active projects, "
            f"average risk is {avg_risk:.1f}% and confidence is {avg_conf:.1f}%. "
            f"There are {freeze_count} freeze requests recorded."
        )

        return {"insight": insight}

    except Exception as e:
        return {"error": str(e)}


@app.get("/api/export/csv")
def export_csv():
    """Export commit data as CSV"""
    if not PROCESSED_PATH.exists():
        return {"error": "No data to export"}

    with open(PROCESSED_PATH, "r") as f:
        commits = json.load(f)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=commits[0].keys())
    writer.writeheader()
    writer.writerows(commits)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=report_data.csv"},
    )


@app.get("/api/export/pdf")
def export_pdf():
    """Export commit summary as PDF"""
    if not PROCESSED_PATH.exists():
        return {"error": "No data to export"}

    with open(PROCESSED_PATH, "r") as f:
        commits = json.load(f)

    avg_risk = sum(c["risk_score"] for c in commits) / len(commits)
    avg_conf = sum(c["confident_score"] for c in commits) / len(commits)
    freeze_count = sum(1 for c in commits if c["freeze_request"])
    project_count = len(set(c["project"] for c in commits))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()

    content = [
        Paragraph("<b>Sentinel AI Report Summary</b>", styles["Title"]),
        Spacer(1, 20),
        Paragraph(f"Projects Analyzed: {project_count}", styles["Normal"]),
        Paragraph(f"Average Risk Score: {avg_risk:.1f}%", styles["Normal"]),
        Paragraph(f"Average Confidence Score: {avg_conf:.1f}%", styles["Normal"]),
        Paragraph(f"Freeze Requests: {freeze_count}", styles["Normal"]),
        Spacer(1, 20),
        Paragraph("Generated automatically by Sentinel Analytics Dashboard.", styles["Italic"]),
    ]

    doc.build(content)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=report_summary.pdf"},
    )


@app.get("/auth/login")
def fake_login():
    """Simulated GitHub login for demo."""
    return {"username": "dinhson", "avatar": "https://github.com/images/avatar-demo.png"}


@app.post("/api/github/fetch_commits")
def fetch_commits():
    path = "data/prototype.json"
    if not os.path.exists(path):
        return {"error": "prototype.json not found"}
    with open(path) as f:
        data = json.load(f)
    return data


@app.post("/api/process_commits")
def process_commits():
    """
    Process commits from raw_commits.json → analyze risk/compliance,
    merge into prototype.json (sorted), and clear raw_commits.json.
    """
    try:
        if not RAW_PATH.exists():
            return {"error": "raw_commits.json not found"}

        # Load raw commits
        with open(RAW_PATH, "r") as f:
            raw_data = json.load(f)

        if not raw_data:
            return {"message": "No new commits to process."}

        processed = []
        for commit in raw_data:
            # Risk prediction
            features = extract_features({
                "lines_changed": commit.get("lines_changed", 40),
                "prev_bugs": commit.get("prev_bugs", 1),
                "test_coverage": commit.get("test_coverage", 90),
                "files": commit.get("file_modified", []),
            })
            risk_result = predict_risk_score(features)

            # Compliance check
            compliance = check_compliance(
                commit_message=commit.get("commit_message", ""),
                changed_files=commit.get("file_modified", []),
                pr_title="",
                pr_labels=[]
            )

            freeze_request = (
                    risk_result["risk_score"] > 50 or not compliance["is_compliant"]
            )

            processed.append({
                **commit,
                "risk_score": round(risk_result["risk_score"], 1),
                "confident_score": int(100 - risk_result["risk_score"] / 1.5),
                "freeze_request": freeze_request,
                "feedback": compliance["message"],
            })

        # Load existing processed data
        existing_data = []
        if PROCESSED_PATH.exists():
            with open(PROCESSED_PATH, "r") as f:
                existing_data = json.load(f)

        # Merge unique commits by commit_hash
        existing_hashes = {c.get("commit_hash") for c in existing_data}
        merged_data = existing_data + [
            c for c in processed if c.get("commit_hash") not in existing_hashes
        ]

        # ✅ Normalize timestamps & sort DESCENDING (newest first)
        def parse_time(ts):
            try:
                return datetime.fromisoformat(ts.replace("Z", ""))
            except Exception:
                return datetime.min

        merged_data.sort(key=lambda c: parse_time(c["timestamp"]), reverse=True)

        # Save sorted prototype.json
        with open(PROCESSED_PATH, "w") as f:
            json.dump(merged_data, f, indent=2)

        # ✅ Clear raw_commits.json after successful processing
        with open(RAW_PATH, "w") as f:
            json.dump([], f, indent=2)

        return {
            "message": (
                f"✅ Processed {len(processed)} new commits. "
                f"Prototype updated with {len(merged_data)} total entries (sorted)."
            ),
            "count": len(merged_data),
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai_explain")
async def ai_explain(request: Request):
    try:
        data = await request.json()
        print("🧠 Incoming AI Explain request:", data)

        # Ensure data is a dict
        if not isinstance(data, dict):
            return {"ai_explanation": "Invalid input format — expected JSON object."}

        # Extract safely
        risk = data.get("risk_score", 0)
        conf = data.get("confident_score", 0)
        freeze = data.get("freeze_request", False)
        message = data.get("commit_message", "")

        # AI-like reasoning
        if freeze:
            reason = (
                f"The commit '{message}' shows a high risk score ({risk}) and "
                f"lower confidence ({conf}%). The system recommends a freeze to "
                f"prevent unstable releases."
            )
        else:
            reason = (
                f"The commit '{message}' is stable with risk {risk} and confidence {conf}%. "
                f"No freeze required; safe to deploy."
            )

        variations = [
            reason,
            f"AI analysis: '{message}' classified as {'risky' if freeze else 'stable'} "
            f"(risk={risk}, confidence={conf}). Decision: {'freeze' if freeze else 'continue'}.",
            f"This commit {'may cause instability' if freeze else 'is low-risk and stable'} "
            f"based on its metrics and history.",
        ]

        return {"ai_explanation": random.choice(variations)}

    except Exception as e:
        print("❌ AI Explain error:", e)
        traceback.print_exc()
        return {"ai_explanation": f"⚠️ Internal error: {str(e)}"}