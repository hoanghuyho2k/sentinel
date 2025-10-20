import '../styles/Report.css'
import {reportsData} from "../data/reportData.js";
import {LineChart, Line, XAxis, CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer, YAxis} from "recharts";



function Reports() {

    const {projects, riskTrend, contributorStats} = reportsData;

    return (
        <div className="reports-page">
            <h2>System Reports</h2>

            {/*Summary*/}
            <section className="summary-cards">
                <div className="card">
                    <h3>Total Project</h3>
                    <p>{projects.length}</p>
                </div>
                <div className="card">
                    <h3>Total Contributors</h3>
                    <p>{contributorStats.total}</p>
                </div>
                <div className="card">
                    <h3>Average Risk Score</h3>
                    <p>{
                        projects.reduce((acc, project) => acc + project.risk_score, 0) / projects.length
                    }</p>
                </div>
                <div className="card">
                    <h3>Freeze Requests</h3>
                    <p>{
                        projects.reduce((acc, project) => acc + (project.freeze_request ? 1 : 0), 0)
                    }</p>
                </div>
            </section>

            {/*Charts*/}
            <section className="charts">
                <div className="chart-card">
                    <h3>Risk Trend (Last 7 days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={riskTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="avgRisk" stroke="#f97316" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-card">
                    <h3>Commits per Contributor</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={contributorStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="user" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="commits" fill="#2563eb" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/*Table Summary*/}
            <section className="project-summary">
                <h3>Project Performance Summary</h3>
                <table>
                    <thead>
                    <tr>
                        <th>Project</th>
                        <th>Total Commits</th>
                        <th>Avg Risk</th>
                        <th>Avg Confidence</th>
                        <th>Freeze Requests</th>
                    </tr>
                    </thead>
                    <tbody>
                    {projects.map((p, i) => (
                        <tr key={i}>
                            <td>{p.name}</td>
                            <td>{p.totalCommits}</td>
                            <td>{p.avgRisk}</td>
                            <td>{p.avgConfidence}%</td>
                            <td>{p.freezeRequests}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </section>

            {/*Optional AI Insight*/}
            <section className="ai-insights">
                <h3>AI Insights</h3>
                <p>⚠️ Backend and ModelTrainer show higher risk trends. Recommend reviewing recent commits before next deployment.</p>
            </section>

            {/* Export Buttons */}
            <section className="export-section">
                <button>📄 Export as PDF</button>
                <button>📊 Export as CSV</button>
            </section>

        </div>
    )
}

export default Reports;