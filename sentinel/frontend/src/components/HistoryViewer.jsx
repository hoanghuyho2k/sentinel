import { useEffect, useState } from "react";
import { fetchHistory } from "../api.js";

export default function HistoryViewer() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory()
            .then((res) => setData(res))
            .catch((err) => console.error("Error loading history:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p>Loading data...</p>;
    if (!data.length) return <p>No records found.</p>;

    return (
        <div style={{ padding: "1rem" }}>
            <h2>Commit History</h2>
            <table border="1" cellPadding="8">
                <thead>
                <tr>
                    <th>Project</th>
                    <th>User</th>
                    <th>Commit</th>
                    <th>Risk Score</th>
                    <th>Message</th>
                </tr>
                </thead>
                <tbody>
                {data.map((item) => (
                    <tr key={item.id}>
                        <td>{item.project}</td>
                        <td>{item.user}</td>
                        <td>{item.commit_hash}</td>
                        <td>{item.risk_score}</td>
                        <td>{item.commit_message}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}