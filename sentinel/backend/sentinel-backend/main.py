import os
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncpg

# Internal logic
from services.compliance_checker import check_compliance
from services.risk_predictor import predict_risk_score, extract_features

# ------------------------------------------------------------
# Environment and setup
# ------------------------------------------------------------
load_dotenv()
DATA_DIR = os.path.join(os.path.dirname(__file__), "../../data")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database lifecycle safely."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        if "+asyncpg" in database_url:
            database_url = database_url.replace("+asyncpg", "")
        if "render.com" in database_url and "sslmode" not in database_url:
            database_url += "?sslmode=require"
        try:
            app.state.db_pool = await asyncpg.create_pool(database_url)
            print("✅ Database connection established")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            app.state.db_pool = None
    else:
        print("⚠️ DATABASE_URL not set — running in local demo mode")
        app.state.db_pool = None

    yield  # Application runs here

    if app.state.db_pool:
        await app.state.db_pool.close()
        print("🧹 Database connection closed")

app = FastAPI(title="Sentinel Core API", lifespan=lifespan)

# Allow local frontend (Vite, Render, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://sentinel-frontend-c2ph.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# Pydantic input models
# ------------------------------------------------------------
class ComplianceInput(BaseModel):
    commit_message: str
    code_snippet: Optional[str] = None
    files: Optional[List[str]] = []
    labels: Optional[List[str]] = []

class RiskInput(BaseModel):
    commit_message: str
    code_snippet: Optional[str] = None
    files: Optional[List[str]] = []
    lines_changed: Optional[int] = 0
    prev_bugs: Optional[int] = 0
    test_coverage: Optional[int] = 100

# ------------------------------------------------------------
# Health check
# ------------------------------------------------------------
@app.get("/health")
async def health():
    db_status = "unknown"
    if app.state.db_pool:
        try:
            async with app.state.db_pool.acquire() as conn:
                await conn.execute("SELECT 1")
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
    else:
        db_status = "no_pool"

    return {
        "status": "ok",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
    }

# ------------------------------------------------------------
# Compliance and Risk APIs
# ------------------------------------------------------------
@app.post("/api/compliance-check")
def compliance_check_endpoint(payload: ComplianceInput):
    result = check_compliance(
        commit_message=payload.commit_message,
        changed_files=payload.files or [],
        pr_title="",
        pr_labels=payload.labels or [],
    )
    return result

@app.post("/api/risk-score")
def risk_score_endpoint(payload: RiskInput):
    features = extract_features({
        "files": payload.files or [],
        "lines_changed": int(payload.lines_changed or 0),
        "prev_bugs": int(payload.prev_bugs or 0),
        "test_coverage": int(payload.test_coverage or 100),
    })
    risk = predict_risk_score(features)
    return risk

# ------------------------------------------------------------
# Local Data API (Prototype)
# ------------------------------------------------------------
@app.get("/api/prototype")
async def get_prototype():
    """Return local prototype.json for frontend demo."""
    file_path = os.path.join(DATA_DIR, "prototype.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="prototype.json not found")
    with open(file_path, "r") as f:
        data = json.load(f)
    return data

# ------------------------------------------------------------
# Save combined result (database)
# ------------------------------------------------------------
@app.post("/api/save-result")
async def save_result(payload: dict):
    if not app.state.db_pool:
        raise HTTPException(status_code=500, detail="Database not configured")
    pool = app.state.db_pool
    async with pool.acquire() as conn:
        async with conn.transaction():
            comp = payload.get("compliance", {})
            risk = payload.get("risk", {})
            row = await conn.fetchrow("""
                                      INSERT INTO compliance_results
                                      (project, user_id, repo_url, commit_hash, commit_message,
                                       files_changed, file_added, file_removed, freeze_request,
                                       feedback, compliance_message, compliance_title, category, confidence)
                                      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                                          RETURNING id
                                      """,
                                      payload.get("project"),
                                      payload.get("user"),
                                      payload.get("repo_url"),
                                      payload.get("commit_hash"),
                                      payload.get("commit_message"),
                                      json.dumps(payload.get("files_changed") or []),
                                      json.dumps(payload.get("file_added") or []),
                                      json.dumps(payload.get("file_removed") or []),
                                      bool(payload.get("freeze_request", False)),
                                      payload.get("feedback"),
                                      comp.get("message"),
                                      comp.get("title"),
                                      comp.get("category"),
                                      float(comp.get("confidence") or 0.0)
                                      )
            comp_id = row["id"]
            if risk:
                await conn.execute("""
                                   INSERT INTO risk_scores
                                   (compliance_id, commit_hash, repo_name, risk_score, factors, risk_message)
                                   VALUES ($1,$2,$3,$4,$5,$6)
                                   """,
                                   comp_id,
                                   payload.get("commit_hash"),
                                   payload.get("repo_name") or payload.get("repo_url"),
                                   float(risk.get("risk_score") or 0.0),
                                   json.dumps(risk.get("factors") or {}),
                                   risk.get("message")
                                   )
    return {"status": "ok"}

# ------------------------------------------------------------
# History API
# ------------------------------------------------------------
@app.get("/api/history")
async def get_history(limit: int = 100):
    if not app.state.db_pool:
        raise HTTPException(status_code=500, detail="Database not configured")
    pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
                                SELECT c.id, c.project, c.user_id AS user, c.repo_url, c.commit_hash,
                   c.commit_message, c.files_changed, c.file_added, c.file_removed,
                   c.freeze_request, c.feedback,
                   c.compliance_message, c.category, c.confidence,
                   r.risk_score, r.factors, r.risk_message, c.created_at
                                FROM compliance_results c
                                    LEFT JOIN risk_scores r ON c.id = r.compliance_id
                                ORDER BY c.created_at DESC
                                    LIMIT $1
                                """, limit)
        result = []
        for r in rows:
            result.append({
                "project": r["project"],
                "id": r["id"],
                "user": r["user"],
                "repo_url": r["repo_url"],
                "commit_hash": r["commit_hash"],
                "commit_message": r["commit_message"],
                "files_changed": json.loads(r["files_changed"]) if r["files_changed"] else [],
                "file_added": json.loads(r["file_added"]) if r["file_added"] else [],
                "file_removed": json.loads(r["file_removed"]) if r["file_removed"] else [],
                "freeze_request": r["freeze_request"],
                "feedback": r["feedback"],
                "compliance_message": r["compliance_message"],
                "category": r["category"],
                "confidence": float(r["confidence"]) if r["confidence"] is not None else None,
                "risk_score": float(r["risk_score"]) if r["risk_score"] is not None else None,
                "factors": json.loads(r["factors"]) if r["factors"] else {},
                "risk_message": r["risk_message"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None
            })
        return result

# ------------------------------------------------------------
# Feedback Chat
# ------------------------------------------------------------
@app.post("/api/feedback")
async def post_feedback(payload: dict):
    if not app.state.db_pool:
        raise HTTPException(status_code=500, detail="Database not configured")
    pool = app.state.db_pool
    async with pool.acquire() as conn:
        await conn.execute("""
                           INSERT INTO feedback_chat (user_id, commit_hash, message)
                           VALUES ($1, $2, $3)
                           """,
                           payload.get("user_id"),
                           payload.get("commit_hash"),
                           payload.get("message")
                           )
    return {"status": "ok"}