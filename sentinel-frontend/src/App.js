// src/App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "https://sentinel-backend-sdit.onrender.com";

// ---------- small UI helpers ----------
function Badge({ children, ok }) {
  const style = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 6,
    background: ok ? "#e6ffed" : "#ffecec",
    color: ok ? "#0a7a3a" : "#a61b1b",
    border: `1px solid ${ok ? "#0a7a3a" : "#a61b1b"}`,
    fontWeight: 600
  };
  return <span style={style}>{children}</span>;
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  const color = safeValue > 70 ? "#c53030" : safeValue > 40 ? "#d69e2e" : "#2f855a";
  return (
    <div style={{ width: "100%", background: "#e6e6e6", borderRadius: 8 }}>
      <div
        style={{
          width: `${safeValue}%`,
          background: color,
          padding: "6px 0",
          color: "white",
          borderRadius: 8,
          textAlign: "center",
          fontWeight: 700
        }}
      >
        {safeValue}%
      </div>
    </div>
  );
}

// ---------- Dashboard Page ----------
function Dashboard() {
  const [commitMessage, setCommitMessage] = useState("");
  const [files, setFiles] = useState("");
  const [linesChanged, setLinesChanged] = useState(0);
  const [prevBugs, setPrevBugs] = useState(0);
  const [testCoverage, setTestCoverage] = useState(100);

  const [complianceResult, setComplianceResult] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCheck = async () => {
    setComplianceResult(null);
    setRiskResult(null);

    const filesArr = files
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      // call compliance
      const comp = await axios.post(`${API_BASE}/api/compliance-check`, {
        commit_message: commitMessage,
        files: filesArr,
      });
      setComplianceResult(comp.data);

      // call risk
      const risk = await axios.post(`${API_BASE}/api/risk-score`, {
        commit_message: commitMessage,
        files: filesArr,
        lines_changed: Number(linesChanged || 0),
        prev_bugs: Number(prevBugs || 0),
        test_coverage: Number(testCoverage || 100),
      });
      setRiskResult(risk.data);

      // save to DB for history
      try {
        setSaving(true);
        await axios.post(`${API_BASE}/api/save-result`, {
          commit_hash: null,
          repo_name: "sentinel-core",
          commit_message: commitMessage,
          files_changed: filesArr,
          labels: [],
          compliance: comp.data,
          risk: risk.data || { risk_score: 0, factors: {}, message: "No risk data" }
        });
      } catch (e) {
        console.warn("Save result failed:", e?.response?.data || e.message);
      } finally {
        setSaving(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to backend. Is it running?");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🚨 Sentinel — Dashboard</h1>

      {/* Inputs */}
      <div style={{ marginTop: 10 }}>
        <label>Commit message</label><br />
        <input
          style={{ width: 700, padding: 8 }}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="fix: correct null pointer in login"
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Files changed (comma separated)</label><br />
        <input
          style={{ width: 700, padding: 8 }}
          value={files}
          onChange={(e) => setFiles(e.target.value)}
          placeholder="auth/login.py, core/db/transaction.py"
        />
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
        <div>
          <label>Lines changed</label><br />
          <input type="number" value={linesChanged} onChange={(e) => setLinesChanged(e.target.value)} />
        </div>
        <div>
          <label>Previous bugs (count)</label><br />
          <input type="number" value={prevBugs} onChange={(e) => setPrevBugs(e.target.value)} />
        </div>
        <div>
          <label>Test coverage %</label><br />
          <input type="number" value={testCoverage} onChange={(e) => setTestCoverage(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleCheck} style={{ padding: "10px 16px", fontSize: 16 }}>Run Sentinel Check</button>
        {saving && <span style={{ marginLeft: 12 }}>Saving result…</span>}
      </div>

      {/* Results */}
      <div style={{ marginTop: 24 }}>
        {complianceResult && (
          <div style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: complianceResult.is_compliant ? "#e6ffed" : "#fff4f4",
            border: `1px solid ${complianceResult.is_compliant ? "#2f855a" : "#f56565"}`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Compliance</h3>
              <Badge ok={complianceResult.is_compliant}>
                {complianceResult.is_compliant ? "COMPLIANT" : "NOT COMPLIANT"}
              </Badge>
            </div>
            <p style={{ marginTop: 8, marginBottom: 8 }}>
              <strong>Category:</strong> {complianceResult.category} &nbsp; | &nbsp;
              <strong>Confidence:</strong> {(complianceResult.confidence ?? 0).toFixed(2)}
            </p>
            <p style={{ marginTop: 0 }}>{complianceResult.message}</p>
            {complianceResult.title && <small style={{ color: "#666" }}>{complianceResult.title}</small>}
          </div>
        )}

        {riskResult && (
          <div style={{ padding: 16, marginTop: 16, borderRadius: 8, border: "1px solid #ddd" }}>
            <h3>Risk Prediction</h3>
            <div style={{ marginBottom: 12 }}>
              <small>Score</small>
              <ProgressBar value={Math.round(riskResult.risk_score)} />
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>Factors</strong>
              <pre style={{ background: "#f7f7f7", padding: 8, borderRadius: 6 }}>{JSON.stringify(riskResult.factors, null, 2)}</pre>
            </div>
            <p>{riskResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- History Page ----------
function History() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/api/history?limit=100`);
      if (Array.isArray(res.data)) {
        setRows(res.data);
      } else {
        throw new Error("Invalid data from backend");
      }
    } catch (e) {
      console.error("Failed to load history:", e);
      setError("Failed to connect to backend API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h1>📚 History</h1>
        <p>Loading recent checks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h1>📚 History</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h1>📚 History</h1>
        <p>No records found yet. Run a Sentinel Check first.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>📚 History</h1>
      <p>Recent compliance & risk evaluations</p>
      <button onClick={fetchHistory} style={{ marginBottom: 12 }}>
        🔄 Refresh
      </button>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>Timestamp</th>
            <th>Commit Message</th>
            <th>Compliance</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>
                {r.created_at
                  ? new Date(r.created_at).toLocaleString()
                  : "—"}
              </td>
              <td style={{ padding: 8, maxWidth: 300 }}>
                {r.commit_message || "(no message)"}
              </td>
              <td style={{ padding: 8 }}>
                <Badge ok={r.is_compliant}>
                  {r.is_compliant ? "PASS" : "FAIL"}
                </Badge>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {r.compliance_message}
                </div>
              </td>
              <td style={{ padding: 8, width: 200 }}>
                <ProgressBar value={Math.round(r.risk_score || 0)} />
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {r.risk_message || "No risk message"}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ---------- App Root & Router ----------
function App() {
  return (
    <Router>
      <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", gap: 12 }}>
        <Link to="/">Dashboard</Link>
        <Link to="/history">History</Link>
      </div>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}

export default App;
