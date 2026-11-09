# Sentinel – Release Risk & Compliance Dashboard

**Sentinel** is a full-stack analytics dashboard designed to help engineering teams monitor software releases, predict commit risks, and automate freeze/unfreeze recommendations.  
It combines **FastAPI** (backend) + **React** (frontend) + **Docker Compose** for modular deployment.

---

## Features

### Authentication
- For demo purposes, we have implemented a simulated GitHub login (`/auth/login`)
- Supports fake users (e.g., `dinhson`, `pooja`, `huyhoang`, `gayan`)
- Admin mode: view all commits; user mode: view only personal commits

### Commit Analysis
- Fetches commit records (from `raw_commits.json`)
- Backend analyzes commits using:
  - `risk_predictor.py`
  - `compliance_checker.py`
- Merges processed results into `prototype.json`  

### Risk & Compliance Insights
- Rule-based risk scoring from change size, protected files, previous bugs and test coverage.
- Commit-policy checks for message format, protected directories, labels and other configured rules.
- Deterministic summaries and metric-based explanations; no AI/LLM service is connected.
- Example output:
  > “The commit *‘Add LLM-based risk predictor’* shows a high risk score (56) and low confidence (62%).  
  > The system recommends a freeze to prevent unstable releases.”

### Dashboard Analytics
- Interactive charts powered by **Recharts**
- Displays project metrics, freeze counts, and confidence trends
- Responsive layout with multiple chart types (line, bar, radar, area, pie)

### Reports Page
- Detailed commit table with filter-by-user and modal details
- Metric-based freeze explanations per commit
- CSV and PDF export support via `/api/export/csv` and `/api/export/pdf`

### Data Pipeline
| File                             | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `data/raw_commits.json`          | Input data (sample commits supplied for processing) |
| `data/prototype.json`            | Processed commit results for visualization           |
| `services/risk_predictor.py`     | Risk scoring model                                   |
| `services/compliance_checker.py` | Rule-based message/file compliance checker           |

---

## Portfolio Demo Deployment

This repository contains a Render Blueprint and Dockerfile that build the React client and serve it with the FastAPI API from one web service.

1. Connect the public `hoanghuyho2k/sentinel` repository in Render using **New → Blueprint**.
2. Deploy the `sentinel-demo` service from `render.yaml`.
3. Open the service URL; `/health` should return `{"status":"ok"}`.

The login is simulated and is not real GitHub authentication. The dashboard uses project sample data and is a demonstration, not a production release-governance service. Data changed during a hosted demo may reset when the service restarts.

## Configuration and secrets

Do not commit `.env` files or OAuth credentials. The previous backend `.env` file was removed because it contained a populated GitHub client secret. Treat that credential as compromised and rotate it in GitHub Developer Settings. Removing the file from the latest commit does not remove it from earlier Git history.

---

## Setup & Run

### Clone the repo
```bash
git clone https://github.com/hoanghuyho2k/sentinel.git
cd sentinel/sentinel
```

### Run with Docker
```bash
docker compose up --build
```
This will start:
- 🧩 **Frontend:** React app on `http://localhost:5137`
- ⚙️ **Backend:** FastAPI service on `http://localhost:8000`

### Verify backend
```bash
curl http://localhost:8000/api/history
```

###  Verify frontend
Visit `http://localhost:5173`  
Open the **demo login** → choose **Load demo records** → review the sample dashboard and reports.

---

## Development Workflow

| Step | Description                                                         |
| ---- | ------------------------------------------------------------------- |
| 1    | Add new commits to `data/raw_commits.json`                          |
| 2    | Use **Load demo records** → backend processes any supplied sample data              |
| 3    | Processed results are appended to `prototype.json` (sorted by date) |
| 4    | `raw_commits.json` is cleared automatically                         |
| 5    | Open **Dashboard** or **Reports** to visualize results              |

---

## API Reference

| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/auth/login` | GET | Simulated GitHub login |
| `/api/history` | GET | Fetch all processed commits |
| `/api/process_commits` | POST | Analyze and append commits from `raw_commits.json` |
| `/api/github/fetch_commits` | POST | Retrieve commits from prototype file |
| `/api/export/csv` | GET | Export processed data as CSV |
| `/api/export/pdf` | GET | Export processed summary as PDF |
| `/api/ai_explain` | POST | Generate a metric-based explanation for a freeze decision |

---

## Project Structure

```
sentinel/
│
├── backend/
│   ├── main.py
│   ├── services/
│   │   ├── compliance_checker.py
│   │   ├── risk_predictor.py
│   │   └── __init__.py
│   ├── data/
│   │   ├── raw_commits.json
│   │   └── prototype.json
│   ├── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DataRecords.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Login.jsx
│   │   ├── styles/
│   │   │   ├── dashboard.css
│   │   │   ├── dataRecords.css
│   │   │   └── reports.css
│   │   ├── api.js
│   ├── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## Future Upgrades

### Planned Enhancement

- Real **GitHub OAuth** integration → replace `/auth/login` mock  
- `/api/fetch_commits` → fetch from GitHub REST API (`/repos/:owner/:repo/commits`)  
- Replace rule-based summaries with **LLM-based risk reasoning** (e.g., OpenAI API)  
- Add **team metrics dashboard** and **release readiness scoring**
