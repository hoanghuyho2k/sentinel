import { useEffect, useState } from "react";
import { fetchHistory } from "../api";
import "../styles/dataRecords.css";

function DataRecords() {
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchHistory();
                setRecords((data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
            } catch (err) {
                console.error("Failed to load records:", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <p className="loading">Loading records...</p>;

    return (
        <div className="data-records-page">
            <h2>Data Records</h2>

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
                            <a href={selectedRecord.repo_url} target="_blank" rel="noreferrer">
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

                        <button className="close-btn" onClick={() => setSelectedRecord(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataRecords;