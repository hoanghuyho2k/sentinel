// src/App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";

const API_BASE =
  process.env.REACT_APP_API_BASE || "https://sentinel-backend-sdit.onrender.com";

// ---------- small UI helpers ----------
function Badge({ children, active }) {
  const style = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 6,
    background: active ? "#fff4f4" : "#e6ffed",
    color: active ? "#a61b1b" : "#0a7a3a",
    border: `1px solid ${active ? "#a61b1b" : "#0a7a3a"}`,
    fontWeight: 600,
  };
  return <span style={style}>{children}</span>;
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  const color =
    safeValue > 70 ? "#c53030" : safeValue > 40 ? "#d69e2e" : "#2f855a";
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
          fontWeight: 700,
        }}
      >
        {safeValue}%
      </div>
    </div>
  );
}

// ---------- Login Page ----------
function Login() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!username.trim()) {
      alert("Please enter a username.");
      return;
    }
    localStorage.setItem("sentinel_user", username.trim());
    navigate("/");
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>👤 Sentinel Login</h2>
      <p>Enter your username to start tracking commits.</p>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="e.g. huy_dev"
        style={{ padding: 8, width: 300 }}
      />
      <button onClick={handleLogin} style={{ marginLeft: 10 }}>
        Login
      </button>
    </div>
  );
}

// ---------- Dashboard Page ----------
function Dashboard() {
  const [project, setProject] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [files, setFiles] = useState("");
  const [freezeRequest, setFreezeRequest] = useState(false);
  const [linesChanged, setLinesChanged] = useState(0);
  const [prevBugs, setPrevBugs] = useState(0);
  const [testCoverage, setTestCoverage] = useState(100);

  const [complianceResult, setComplianceResult] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const user = localStorage.getItem("sentinel_user");

  const handleCheck = async () => {
    if (!user) return alert("Please log in first.");
    setComplianceResult(null);
    setRiskResult(null);

    const filesArr = files
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      // compliance
      const comp = await axios.post(`${API_BASE}/api/compliance-check`, {
        commit_message: commitMessage,
        files: filesArr,
      });
      setComplianceResult(comp.data);

      // risk
      const risk = await axios.post(`${API_BASE}/api/risk-score`, {
        commit_message: commitMessage,
        files: filesArr,
        lines_changed: Number(linesChanged || 0),
        prev_bugs: Number(prevBugs || 0),
        test_coverage: Number(testCoverage || 100),
      });
      setRiskResult(risk.data);

      // save to DB
      setSaving(true);
      await axios.post(`${API_BASE}/api/save-result`, {
        project,
        repo_url: repoUrl,
        user_id: user,
        commit_message: commitMessage,
        files_changed: filesArr,
        freeze_request: freezeRequest, // replaces is_compliant
        compliance: comp.data,
        risk: risk.data || {
          risk_score: 0,
          factors: {},
          message: "No risk data",
        },
      });

      alert("✅ Result saved to history.");
    } catch (err) {
      console.error(err);
      alert("❌ Error connecting to backend or saving result.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🚨 Sentinel — Dashboard</h1>

      <div style={{ marginTop: 10 }}>
        <label>Project</label>
        <br />
        <input
          style={{ width: 700, padding: 8 }}
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="e.g. Sentinel Platform"
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Repository URL</label>
        <br />
        <input
          style={{ width: 700, padding: 8 }}
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/hoanghuyho2k/sentinel"
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Commit message</label>
        <br />
        <input
          style={{ width: 700, padding: 8 }}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="fix: correct null pointer in login"
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Files changed (comma separated)</label>
        <br />
        <input
          style={{ width: 700, padding: 8 }}
          value={files}
          onChange={(e) => setFiles(e.target.value)}
          placeholder="auth/login.py, core/db/transaction.py"
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={freezeRequest}
            onChange={(e) => setFreezeRequest(e.target.checked)}
          />{" "}
          Freeze request (formerly “is_compliant”)
        </label>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
        <div>
          <label>Lines changed</label>
          <br />
          <input
            type="number"
            value={linesChanged}
            onChange={(e) => setLinesChanged(e.target.value)}
          />
        </div>
        <div>
          <label>Previous bugs (count)</label>
          <br />
          <input
            type="number"
            value={prevBugs}
            onChange={(e) => setPrevBugs(e.target.value)}
          />
        </div>
        <div>
          <label>Test coverage %</label>
          <br />
          <input
            type="number"
            value={testCoverage}
            onChange={(e) => setTestCoverage(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={handleCheck}
          style={{ padding: "10px 16px", fontSize: 16 }}
        >
          Run Sentinel Check
        </button>
        {saving && <span style={{ marginLeft: 12 }}>Saving result…</span>}
      </div>

      {/* Results */}
      <div style={{ marginTop: 24 }}>
        {complianceResult && (
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              backgroundColor: "#f7f7f7",
              border: "1px solid #ddd",
            }}
          >
            <h3>Compliance</h3>
            <p>{complianceResult.message}</p>
            <small>{complianceResult.category}</small>
          </div>
        )}
        {riskResult && (
          <div
            style={{
              padding: 16,
              marginTop: 16,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            <h3>Risk Prediction</h3>
            <ProgressBar value={Math.round(riskResult.risk_score)} />
            <pre
              style={{
                background: "#f7f7f7",
                padding: 8,
                borderRadius: 6,
                marginTop: 8,
              }}
            >
              {JSON.stringify(riskResult.factors, null, 2)}
            </pre>
            <p>{riskResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- History Page with Filters ----------
function History() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/history?limit=100`);
      if (Array.isArray(res.data)) {
        setRows(res.data);
        setFiltered(res.data);
        setProjects([...new Set(res.data.map((r) => r.project).filter(Boolean))]);
        setUsers([...new Set(res.data.map((r) => r.user).filter(Boolean))]);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let f = [...rows];
    if (projectFilter) f = f.filter((r) => r.project === projectFilter);
    if (userFilter) f = f.filter((r) => r.user === userFilter);
    setFiltered(f);
  }, [projectFilter, userFilter, rows]);

  return (
    <div style={{ padding: 20 }}>
      <h1>📚 History</h1>
      <div style={{ marginBottom: 10, display: "flex", gap: 12 }}>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <button onClick={fetchHistory}>🔄 Refresh</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>
            <th>Time</th>
            <th>User</th>
            <th>Project</th>
            <th>Commit</th>
            <th>Freeze Request</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.user || "—"}</td>
              <td>{r.project || "—"}</td>
              <td>{r.commit_message || "(no message)"}</td>
              <td>
                <Badge active={r.freeze_request}>
                  {r.freeze_request ? "FROZEN" : "ACTIVE"}
                </Badge>
              </td>
              <td style={{ width: 200 }}>
                <ProgressBar value={Math.round(r.risk_score || 0)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- App Root ----------
function App() {
  const user = localStorage.getItem("sentinel_user");
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("sentinel_user");
    navigate("/login");
  };

  return (
    <>
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #eee",
          display: "flex",
          gap: 12,
        }}
      >
        <Link to="/">Dashboard</Link>
        <Link to="/history">History</Link>
        <div style={{ marginLeft: "auto" }}>
          {user ? (
            <>
              👤 {user} <button onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}
