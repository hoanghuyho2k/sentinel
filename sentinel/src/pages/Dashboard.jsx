import '../styles/Dashboard.css'
import {dashboardData} from "../data/dashboardData.js";
import {LineChart, Line, XAxis, CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer, YAxis} from "recharts";


function Dashboard() {

    const {summary, commitsByDate, riskScores, recentCommits} = dashboardData;

    return (
        <div className="dashboard-page">
            <h2>Sentinal Dashboard</h2>


            {/*Summary Card*/}
            <section className="summary-cards">
                <div className="card">
                    <h3>Total Commits</h3>
                    <p>{summary.totalCommits}</p>
                </div>
                <div className="card">
                    <h3>Total Projects</h3>
                    <p>{summary.totalProjects}</p>
                </div>
                <div className="card">
                    <h3>Average Risk Score</h3>
                    <p>{summary.avgRiskScore}</p>
                </div>
                <div className="card">
                    <h3>Freeze Requests</h3>
                    <p>{summary.freezeRequests}</p>
                </div>
            </section>


            {/*Chart Section*/}
            <section className="charts">
                <div className="chart-card">
                    <h3>Commits Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={commitsByDate}>
                            <CartesianGrid strokeDasharray="3 3 "/>
                            <XAxis dataKey="date"/>
                            <YAxis/>
                            <Tooltip/>
                            <Line
                                type="monotone"
                                dataKey="commits"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={{r: 4, fill: "#2563eb"}}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <h3>Risk Score by Project</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={riskScores}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="project" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="risk" fill="#f97316" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/*Recent Commits*/}
            <section className="recent-commits">
                <h3>Recent Commits</h3>
                <table>
                    <thead>
                    <tr>
                        <th>User</th>
                        <th>Project</th>
                        <th>Message</th>
                        <th>Risk Score</th>
                        <th>Confident Score</th>
                        <th>Timestamp</th>
                    </tr>
                    </thead>
                    <tbody>
                    {recentCommits.map((commit, index) => (
                        <tr key={index}>
                            <td>{commit.user}</td>
                            <td>{commit.project}</td>
                            <td>{commit.message}</td>
                            <td>{commit.risk_score}</td>
                            <td>{commit.confident_score}</td>
                            <td>{new Date(commit.timestamp).toLocaleString()}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </section>


        </div>
    )
}

export default Dashboard;