import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.compliance_checker import check_compliance
from services.risk_predictor import predict_risk_score, extract_features
from dotenv import load_dotenv
import asyncpg
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Sentinel Core API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://sentinel-frontend-c2ph.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        # Fix for Render: ensure proper connection string
        if "+asyncpg" in database_url:
            database_url = database_url.replace("+asyncpg", "")
        
        # For Render PostgreSQL, use SSL
        if "render.com" in database_url and "sslmode" not in database_url:
            database_url += "?sslmode=require"
        
        try:
            app.state.db_pool = await asyncpg.create_pool(database_url)
            print("✅ Database connection established")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            # Don't disable database - let it fail so we can fix it
            raise e
    else:
        print("⚠️  DATABASE_URL not set")
        app.state.db_pool = None

@app.on_event("shutdown")
async def shutdown():
    if app.state.db_pool:
        await app.state.db_pool.close()

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
        "timestamp": datetime.utcnow().isoformat()
    }
@app.post("/api/compliance-check")
def compliance_check_endpoint(payload: ComplianceInput):
    result = check_compliance(
        commit_message=payload.commit_message,
        changed_files=payload.files or [],
        pr_title="",
        pr_labels=payload.labels or []
    )
    return result

@app.post("/api/risk-score")
def risk_score_endpoint(payload: RiskInput):
    features = extract_features({
        "files": payload.files or [],
        "lines_changed": int(payload.lines_changed or 0),
        "prev_bugs": int(payload.prev_bugs or 0),
        "test_coverage": int(payload.test_coverage or 100)
    })
    risk = predict_risk_score(features)
    return risk

@app.post("/api/save-result")
async def save_result(payload: dict):
    if not app.state.db_pool:
        raise HTTPException(status_code=500, detail="Database not configured")

    pool = app.state.db_pool
    async with pool.acquire() as conn:
        async with conn.transaction():
            comp = payload.get("compliance", {})
            risk = payload.get("risk", {})
            files_arr = payload.get("files_changed") or payload.get("files") or []
            labels_arr = payload.get("labels") or []

            # 🔧 Ensure lists are JSON-encoded before saving
            files_json = json.dumps(files_arr)
            labels_json = json.dumps(labels_arr)
            factors_json = json.dumps(risk.get("factors") or {})

            # insert compliance
            await conn.execute("""
                INSERT INTO compliance_results
                (commit_hash, repo_name, commit_message, files_changed, labels,
                 is_compliant, compliance_message, compliance_title, category, confidence)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            """,
                payload.get("commit_hash"),
                payload.get("repo_name"),
                payload.get("commit_message"),
                files_json,
                labels_json,
                comp.get("is_compliant"),
                comp.get("message"),
                comp.get("title"),
                comp.get("category"),
                float(comp.get("confidence") or 0.0)
            )

            # insert risk
            await conn.execute("""
                INSERT INTO risk_scores
                (commit_hash, repo_name, risk_score, factors, risk_message)
                VALUES ($1,$2,$3,$4,$5)
            """,
                payload.get("commit_hash"),
                payload.get("repo_name"),
                float(risk.get("risk_score") or 0.0),
                factors_json,
                risk.get("message")
            )

    return {"status": "ok"}


@app.get("/api/history")
async def get_history(limit: int = 100):
    if not app.state.db_pool:
        raise HTTPException(status_code=500, detail="Database not configured")

    pool = app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
           SELECT c.id, c.commit_hash, c.repo_name, c.commit_message, c.files_changed,
                  c.is_compliant, c.compliance_message, c.compliance_title, c.category, c.confidence,
                  r.risk_score, r.factors, r.risk_message, c.created_at
           FROM compliance_results c
           LEFT JOIN risk_scores r ON c.id = r.compliance_id
           ORDER BY c.created_at DESC
           LIMIT $1
        """, limit)

        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "commit_hash": r["commit_hash"],
                "repo_name": r["repo_name"],
                "commit_message": r["commit_message"],
                "files_changed": r["files_changed"],
                "is_compliant": r["is_compliant"],
                "compliance_message": r["compliance_message"],
                "compliance_title": r["compliance_title"],
                "category": r["category"],
                "confidence": float(r["confidence"]) if r["confidence"] is not None else None,
                "risk_score": float(r["risk_score"]) if r["risk_score"] is not None else None,
                "factors": r["factors"],
                "risk_message": r["risk_message"],
                "created_at": r["created_at"].isoformat()
            })
        return result

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
