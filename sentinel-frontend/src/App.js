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

// ---------- Login Bar ----------
function LoginBar() {
  const [user, setUser] = useState(localStorage.getItem("username") || "");

  const handleLogin = () => {
    if (user.trim()) {
      localStorage.setItem("username", user.trim());
      alert(`✅ Logged in as ${user}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    setUser("");
    alert("👋 Logged out");
  };

  return (
    <div style={{ padding: 10, borderBottom: "1px solid #ddd", background: "#f7f7f7" }}>
      <input
        type="text"
        placeholder="Enter username"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        style={{ padding: 6, marginRight: 8 }}
      />
      <button onClick={handleLogin} style={{ marginRight: 6 }}>Login</button>
      <button onClick={handleLogout}>Logout</button>
      {user && <span style={{ marginLeft: 10 }}>👤 {user}</span>}
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
  const [project, setProject] = useState("Sentinel");
  const [repoUrl, setRepoUrl] = useState("https://github.com/hoanghuyho2k/sentinel");

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

    const currentUser = localStorage.getItem("username") || "anonymous";

    try {
      const comp = await axios.post(`${API_BASE}/api/compliance-check`, {
        commit_message: commitMessage,
        files: filesArr,
      });

      setComplianceResult(comp.data);

      const risk = await axios.post(`${API_BASE}/api/risk-score`, {
        commit_message: commitMessage,
        files: filesArr,
        lines_changed: Number(linesChanged || 0),
        prev_bugs: Number(prevBugs || 0),
        test_coverage: Number(testCoverage || 100),
      });

      setRiskResult(risk.data);

      // Save to DB for history
      try {
        setSaving(true);
        await axios.post(`${API_BASE}/api/save-result`, {
          user_id: currentUser,
          project: project,
          repo_url: repoUrl,
          commit_hash: null,
          repo_name: "sentinel-core",
          commit_message: commitMessage,
          files_changed: filesArr,
          file_added: [],
          file_removed: [],
          freeze_request: !comp.data.is_compliant, // using freeze_request instead of is_compliant
          feedback: null,
          labels: [],
          compliance: comp.data,
          risk: risk.data || { risk_score: 0, factors: {}, message: "No risk data" }
        });
        alert("✅ Result saved successfully!");
      } catch (e) {
        console.warn("Save result failed:", e?.response?.data || e.message);
        alert("❌ Error connecting to backend or saving result.");
      } finally {
        setSaving(false);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error connecting to backend. Is it running?");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🚨 Sentinel — Dashboard</h1>

      <div style={{ marginTop: 10 }}>
        <label>Project Name</label><br />
        <input
          style={{ width: 700, padding: 8 }}
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Repository URL</label><br />
        <input
          style={{ width: 700, padding: 8 }}
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />
      </div>

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
          <label>Previous bugs</label><br />
          <input type="number" value={prevBugs} onChange={(e) => setPrevBugs(e.target.value)} />
        </div>
        <div>
          <label>Test coverage %</label><br />
          <input type="number" value={testCoverage} onChange={(e) => setTestCoverage(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleCheck} style={{ padding: "10px 16px", fontSize: 16 }}>
          Run Sentinel Check
        </button>
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
            <h3>Compliance</h3>
            <Badge ok={complianceResult.is_compliant}>
              {complianceResult.is_compliant ? "PASS" : "FREEZE REQUEST"}
            </Badge>
            <p><strong>Category:</strong> {complianceResult.category}</p>
            <p><strong>Confidence:</strong> {(complianceResult.confidence ?? 0).toFixed(2)}</p>
            <p>{complianceResult.message}</p>
          </div>
        )}

        {riskResult && (
          <div style={{ padding: 16, marginTop: 16, borderRadius: 8, border: "1px solid #ddd" }}>
            <h3>Risk Prediction</h3>
            <ProgressBar value={Math.round(riskResult.risk_score)} />
            <pre style={{ background: "#f7f7f7", padding: 8, borderRadius: 6, marginTop: 10 }}>
              {JSON.stringify(riskResult.factors, null, 2)}
            </pre>
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

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/history?limit=100`);
      setRows(res.data);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>📚 History</h1>
      <button onClick={fetchHistory}>🔄 Refresh</button>

      <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ccc" }}>
            <th>User</th>
            <th>Project</th>
            <th>Commit Message</th>
            <th>Freeze Request</th>
            <th>Risk Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{r.user || "—"}</td>
              <td>{r.project || "—"}</td>
              <td>{r.commit_message}</td>
              <td>{r.freeze_request ? "🧊 Yes" : "✅ No"}</td>
              <td><ProgressBar value={r.risk_score || 0} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- App Root ----------
function App() {
  return (
    <Router>
      <LoginBar />
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
