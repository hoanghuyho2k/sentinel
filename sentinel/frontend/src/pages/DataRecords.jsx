import { useEffect, useState } from "react";
import "../styles/dataRecords.css";
import { fetchProcessed, processCommits, aiExplain } from "../api";

function DataRecords() {
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loading, setLoading] = useState(false);
    const [AIInsight, setAIInsight] = useState("");
    const [fetching, setFetching] = useState(false);

    const user = JSON.parse(localStorage.getItem("sentinel_user"));

    // Redirect if not logged in
    useEffect(() => {
        if (!user) window.location.href = "/";
    }, [user]);

    // Load processed data (prototype.json) on mount
    useEffect(() => {
        async function loadProcessedData() {
            try {
                setLoading(true);
                const data = await fetchProcessed();
                if (data && Array.isArray(data)) {
                    // Sort DESCENDING (newest first)
                    const sorted = data.sort(
                        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                    );
                    setRecords(sorted);
                }
            } catch (err) {
                console.error("Failed to load processed data:", err);
            } finally {
                setLoading(false);
            }
        }
        loadProcessedData();
    }, []);

    // --- Fetch new data and replace old ---
    async function handleFetchCommits() {
        try {
            setFetching(true);
            console.log("🔄 Starting fetch and process from raw_commits.json...");

            // Step 1: Process new commits in backend
            await processCommits();

            // Step 2: Fetch updated prototype.json
            const data = await fetchProcessed();

            // Step 3: Sort DESCENDING (newest first)
            const sorted = data.sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            );
            setRecords(sorted);

            console.log("✅ Data successfully refreshed:", sorted.length, "records");
        } catch (err) {
            console.error("❌ Fetch failed:", err);
            alert("Failed to fetch commits: " + err.message);
        } finally {
            setFetching(false);
        }
    }

    // --- AI Insight ---
    async function handleAIExplain(record) {
        try {
            const res = await aiExplain(record);
            setAIInsight(res.ai_explanation);
        } catch (e) {
            setAIInsight("⚠️ Failed to retrieve AI insight.");
        }
    }

    return (
        <div className="data-records-page">
            <div className="header-row">
                <h2>Data Records</h2>
                <button
                    className="fetch-btn"
                    onClick={handleFetchCommits}
                    disabled={fetching}
                >
                    {fetching ? "Fetching..." : "🔄 Fetch from GitHub"}
                </button>
            </div>

            {loading ? (
                <p className="loading-message">Loading records...</p>
            ) : records.length === 0 ? (
                <p className="empty-message">
                    No records found. Click “Fetch from GitHub” to process new commits.
                </p>
            ) : (
                <table className="records-table">
                    <thead>
                    <tr>
                        <th>User</th>
                        <th>Project</th>
                        <th>Message</th>
                        <th>Risk</th>
                        <th>Confidence</th>
                        <th>Freeze</th>
                        <th>Timestamp</th>
                        <th>Details</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((r, i) => (
                        <tr
                            key={i}
                            className={`${r.freeze_request ? "freeze-row" : ""} ${
                                r.risk_score > 50 ? "high-risk" : ""
                            }`}
                        >
                            <td>{r.user}</td>
                            <td>{r.project}</td>
                            <td title={r.commit_message}>{r.commit_message}</td>
                            <td>{r.risk_score}</td>
                            <td>{r.confident_score}%</td>
                            <td>{r.freeze_request ? "✅" : "—"}</td>
                            <td>{new Date(r.timestamp).toLocaleString()}</td>
                            <td>
                                <button onClick={() => setSelectedRecord(r)}>View</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

            {selectedRecord && (
                <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Commit Details</h3>
                        <p><strong>User:</strong> {selectedRecord.user}</p>
                        <p><strong>Project:</strong> {selectedRecord.project}</p>
                        <p><strong>Message:</strong> {selectedRecord.commit_message}</p>
                        <p><strong>Commit Hash:</strong> {selectedRecord.commit_hash}</p>
                        <p>
                            <strong>Repo:</strong>{" "}
                            <a
                                href={selectedRecord.repo_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {selectedRecord.repo_url}
                            </a>
                        </p>
                        <p><strong>Risk Score:</strong> {selectedRecord.risk_score}</p>
                        <p><strong>Confidence:</strong> {selectedRecord.confident_score}%</p>
                        <p><strong>Freeze Request:</strong> {selectedRecord.freeze_request ? "Yes" : "No"}</p>
                        <p><strong>Timestamp:</strong> {new Date(selectedRecord.timestamp).toLocaleString()}</p>
                        <p><strong>Feedback:</strong> {selectedRecord.feedback}</p>
                        <p><strong>Files Added:</strong> {selectedRecord.file_added.join(", ") || "None"}</p>
                        <p><strong>Files Modified:</strong> {selectedRecord.file_modified.join(", ") || "None"}</p>
                        <p><strong>Files Removed:</strong> {selectedRecord.file_removed.join(", ") || "None"}</p>

                        <hr />
                        <h4>🤖 AI Insight</h4>
                        <p className="ai-insight">{AIInsight || "Click Explain to get insight."}</p>
                        <div className="modal-actions">
                            <button onClick={() => handleAIExplain(selectedRecord)}>
                                🔍 Explain Decision
                            </button>
                            <button className="close-btn" onClick={() => setSelectedRecord(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataRecords;