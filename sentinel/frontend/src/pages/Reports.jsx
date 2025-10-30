import "../styles/Report.css";
import {useEffect, useState} from "react";
import {fetchHistory, fetchInsights} from "../api";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

function Reports() {
    const [records, setRecords] = useState([]);
    const [insight, setInsight] = useState("Loading AI insights...");

    useEffect(() => {
        async function loadData() {
            const data = await fetchHistory();
            setRecords(data || []);

            const ai = await fetchInsights();
            setInsight(ai.insight || "No insight available.")
        }

        loadData();
    }, []);

    // ----- Data Aggregation -----
    const totalCommits = records.length;
    const avgRisk = records.reduce((a, b) => a + b.risk_score, 0) / (records.length || 1);
    const avgConfidence = records.reduce((a, b) => a + b.confident_score, 0) / (records.length || 1);
    const freezeCount = records.filter(r => r.freeze_request).length;

    const riskByProject = Object.entries(
        records.reduce((acc, r) => {
            acc[r.project] = acc[r.project] || [];
            acc[r.project].push(r.risk_score);
            return acc;
        }, {})
    ).map(([project, arr]) => ({
        project,
        avgRisk: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1),
    }));

    const COLORS = ["#2563eb", "#f97316", "#22c55e", "#a855f7", "#e11d48"];

    return (
        <div className="reports-page">
            <h2>📊 Sentinel Reports</h2>

            {/* Summary Cards */}
            <section className="summary-cards">
                <div className="card"><h3>Total Commits</h3><p>{totalCommits}</p></div>
                <div className="card"><h3>Avg Risk</h3><p>{avgRisk.toFixed(1)}</p></div>
                <div className="card"><h3>Avg Confidence</h3><p>{avgConfidence.toFixed(1)}%</p></div>
                <div className="card"><h3>Freeze Requests</h3><p>{freezeCount}</p></div>
            </section>

            {/* Charts */}
            <section className="charts">
                <div className="chart-card">
                    <h3>Risk by Project</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={riskByProject}>
                            <CartesianGrid strokeDasharray="3 3"/>
                            <XAxis dataKey="project"/>
                            <YAxis/>
                            <Tooltip/>
                            <Bar dataKey="avgRisk">
                                {riskByProject.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <h3>Freeze Requests Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={[
                                    {name: "Freeze Requests", value: freezeCount},
                                    {name: "Normal Commits", value: totalCommits - freezeCount},
                                ]}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                <Cell fill="#f97316"/>
                                <Cell fill="#22c55e"/>
                            </Pie>
                            <Tooltip/>
                            <Legend/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* AI Insights */}
            <div className="ai-insights">
                <h3>🤖 AI Insights</h3>
                <p>{insight}</p>
            </div>

            {/* Table */}
            <section className="project-summary">
                <h3>Project Summary</h3>
                <table>
                    <thead>
                    <tr>
                        <th>Project</th>
                        <th>Avg Risk</th>
                        <th>Commits</th>
                        <th>Freeze</th>
                    </tr>
                    </thead>
                    <tbody>
                    {riskByProject.map((p, i) => (
                        <tr key={i}>
                            <td>{p.project}</td>
                            <td>{p.avgRisk}</td>
                            <td>{records.filter(r => r.project === p.project).length}</td>
                            <td>{records.filter(r => r.project === p.project && r.freeze_request).length}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </section>

            {/* Export */}
            <div className="export-section">
                <button
                    onClick={() => window.open("http://localhost:8000/api/export/csv", "_blank")}
                >
                    📄 Export CSV
                </button>
                <button
                    onClick={() => window.open("http://localhost:8000/api/export/pdf", "_blank")}
                >
                    🧾 Export PDF
                </button>
            </div>
        </div>
    );
}

export default Reports;