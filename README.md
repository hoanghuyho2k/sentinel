# Sentinel – AI-Powered Release Governance Dashboard

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

### AI Insights
- Each commit can trigger an **AI explanation** via `/api/ai_explain`
- Example output:
  > “The commit *‘Add LLM-based risk predictor’* shows a high risk score (56) and low confidence (62%).  
  > The system recommends a freeze to prevent unstable releases.”

### Dashboard Analytics
- Interactive charts powered by **Recharts**
- Displays project metrics, freeze counts, and confidence trends
- Responsive layout with multiple chart types (line, bar, radar, area, pie)

### Reports Page
- Detailed commit table with filter-by-user and modal details
- AI-generated freeze reasoning per commit
- CSV and PDF export support via `/api/export/csv` and `/api/export/pdf`

### Data Pipeline
| File                             | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `data/raw_commits.json`          | Input data (raw commits fetched from GitHub or mock) |
| `data/prototype.json`            | Processed commit results for visualization           |
| `services/risk_predictor.py`     | Risk scoring model                                   |
| `services/compliance_checker.py` | Rule-based message/file compliance checker           |

---

## Setup & Run

### Clone the repo
```bash
git clone https://github.com/dinhson/sentinel.git
cd sentinel
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
Click **“Sign in with GitHub”** → then **“Fetch from GitHub”** → view processed data.

---

## Development Workflow

| Step | Description                                                         |
| ---- | ------------------------------------------------------------------- |
| 1    | Add new commits to `data/raw_commits.json`                          |
| 2    | Click **“Fetch from GitHub”** → backend processes data              |
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
| `/api/ai_explain` | POST | Generate AI-style reasoning for freeze decisions |

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
