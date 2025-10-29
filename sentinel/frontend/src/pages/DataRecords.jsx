import { useState } from "react";
import {recordData} from "../data/recordData.js";
import "../styles/dataRecords.css"

function DataRecords() {
    const [selectedRecord, setSelectedRecord] = useState(null);

    return (
        <div className="data-records-page">
            <h2>Data Records</h2>


            <table className="records-table">
                <thead>
                <tr>
                    <th>User</th>
                    <th>Project</th>
                    <th>Message</th>
                    <th>Risk Score</th>
                    <th>Confident Score</th>
                    <th>Freeze Request</th>
                    <th>Time</th>
                    <th>Details</th>
                </tr>
                </thead>
                <tbody>
                {recordData.map((record, index) => (
                    <tr key={index} className={record.freeze_request ? "freeze-row" : ""}>
                        <td>{record.user}</td>
                        <td>{record.project}</td>
                        <td>{record.commit_message}</td>
                        <td>{record.risk_score}</td>
                        <td>{record.confident_score}%</td>
                        <td>{record.freeze_request ? "Yes" : "No"}</td>
                        <td>{new Date(record.timestamp).toLocaleString()}</td>
                        <td>
                            <button onClick={() => setSelectedRecord(record)}>Details</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {selectedRecord && (
                <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Record Details:</h3>
                        <p><strong>User:</strong> {selectedRecord.user}</p>
                        <p><strong>Project:</strong> {selectedRecord.project}</p>
                        <p><strong>Message:</strong> {selectedRecord.commit_message}</p>
                        <p><strong>Commit Hash:</strong> {selectedRecord.commit_hash}</p>
                        <p><strong>Repo:</strong> <a href={selectedRecord.repo_url} target="_blank">{selectedRecord.repo_url}</a> </p>
                        <p><strong>Risk Score:</strong> {selectedRecord.risk_score}</p>
                        <p><strong>Confident Score:</strong> {selectedRecord.confident_score}%</p>
                        <p><strong>Freeze Request:</strong> {selectedRecord.freeze_request ? "Yes" : "No"}</p>
                        <p><strong>Time:</strong> {new Date(selectedRecord.timestamp).toLocaleString()}</p>
                        <p><strong>Feedback:</strong> {selectedRecord.feedback}</p>
                        <p><strong>File Modified:</strong> {selectedRecord.file_modified.join(", ") || "None"}</p>
                        <p><strong>Files Added:</strong> {selectedRecord.file_added.join(", ") || "None"}</p>
                        <p><strong>Files Removed:</strong> {selectedRecord.file_removed.join(", ") || "None"}</p>
                        <button onClick={() => setSelectedRecord(null)}>Close</button>
                    </div>
                </div>
            )}

        </div>
    )
}

export default DataRecords;