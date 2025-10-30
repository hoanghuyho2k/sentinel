from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json, os
from services.compliance_checker import check_compliance
from services.risk_predictor import predict_risk_score, extract_features
from pathlib import Path
from fastapi.responses import StreamingResponse
import csv, io
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path("/app/data/prototype.json")

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


@app.get("/api/insights")
def get_ai_insights():
    """Generate AI-style commit summary."""
    try:
        if not DATA_FILE.exists():
            return {"insight": "No data available."}

        with open(DATA_FILE, "r") as f:
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
    if not DATA_FILE.exists():
        return {"error": "No data to export"}

    with open(DATA_FILE, "r") as f:
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
    if not DATA_FILE.exists():
        return {"error": "No data to export"}

    with open(DATA_FILE, "r") as f:
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