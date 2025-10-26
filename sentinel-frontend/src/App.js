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

const API_BASE = process.env.REACT_APP_API_BASE || "https://sentinel-backend-sdit.onrender.com";

// ------------------ Login Page ------------------
function Login() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!username.trim()) return alert("Please enter your username.");
    localStorage.setItem("sentinel_user", username.trim());
    navigate("/"); // go back to dashboard
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>👤 Sentinel Login</h2>
      <p>Enter your name to start tracking commits.</p>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="e.g. huy_dev"
        style={{ padding: 8, width: 300 }}
      />
      <button onClick={handleLogin} style={{ marginLeft: 10 }}>Login</button>
    </div>
  );
}

// ------------------ Dashboard ------------------
function Dashboard() {
  const [project, setProject] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [files, setFiles] = useState("");
  const [freezeRequest, setFreezeRequest] = useState(false);

  const [complianceResult, setComplianceResult] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const user = localStorage.getItem("sentinel_user");

  const handleCheck = async () => {
    if (!user) return alert("Please log in first.");
    const filesArr = files.split(",").map((f) => f.trim()).filter(Boolean);

    try {
      const comp = await axios.post(`${API_BASE}/api/compliance-check`, {
        commit_message: commitMessage,
        files: filesArr,
      });

      const risk = await axios.post(`${API_BASE}/api/risk-score`, {
        commit_message: commitMessage,
        files: filesArr,
      });

      setComplianceResult(comp.data);
      setRiskResult(risk.data);

      // Save result
      setSaving(true);
      await axios.post(`${API_BASE}/api/save-result`, {
        project,
        repo_url: repoUrl,
        user_id: user,
        commit_message: commitMessage,
        files_changed: filesArr,
        freeze_request: freezeRequest,
        compliance: comp.data,
        risk: risk.data
      });
      alert("✅ Result saved to history.");
    } catch (err) {
      console.error(err);
      alert("Error connecting to backend or saving result.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🚀 Sentinel Dashboard</h1>

      <div style={{ marginBottom: 10 }}>
        <label>Project</label><br />
        <input
          style={{ width: 400, padding: 8 }}
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="e.g. Sentinel Platform"
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Repository URL</label><br />
        <input
          style={{ width: 400, padding: 8 }}
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/hoanghuyho2k/sentinel"
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Commit Message</label><br />
        <input
          style={{ width: 400, padding: 8 }}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="fix: security bug in token validation"
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Files Changed</label><br />
        <input
          style={{ width: 400, padding: 8 }}
          value={files}
          onChange={(e) => setFiles(e.target.value)}
          placeholder="core/auth.py, core/security.py"
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={freezeRequest}
            onChange={(e) => setFreezeRequest(e.target.checked)}
          /> Freeze Deployment Request
        </label>
      </div>

      <button onClick={handleCheck}>Run Sentinel Check</button>
      {saving && <span>Saving...</span>}

      {complianceResult && (
        <div style={{ marginTop: 20 }}>
          <h3>Compliance</h3>
          <p>{complianceResult.message}</p>
        </div>
      )}
      {riskResult && (
        <div style={{ marginTop: 20 }}>
          <h3>Risk Score: {riskResult.risk_score}%</h3>
          <pre>{JSON.stringify(riskResult.factors, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ------------------ Router ------------------
function App() {
  const user = localStorage.getItem("sentinel_user");
  return (
    <Router>
      <div style={{ padding: 10, borderBottom: "1px solid #ccc" }}>
        <Link to="/">Dashboard</Link> | <Link to="/history">History</Link> |{" "}
        {user ? <span>👤 {user}</span> : <Link to="/login">Login</Link>}
      </div>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
