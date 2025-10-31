import '../styles/Dashboard.css';
import { useEffect, useState } from 'react';
import { fetchHistory } from '../api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area,
    ComposedChart, BarChart, Bar, Scatter,
    PieChart, Pie, Cell,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

function Dashboard() {
    const [commits, setCommits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const data = await fetchHistory();
            setCommits(data || []);
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading) return <p>Loading dashboard...</p>;

    // --- Summary ---
    const totalCommits = commits.length;
    const totalProjects = new Set(commits.map(c => c.project)).size;
    const avgRiskScore = commits.length
        ? (commits.reduce((sum, c) => sum + c.risk_score, 0) / commits.length).toFixed(1)
        : 0;
    const freezeRequests = commits.filter(c => c.freeze_request).length;
    const freezeByProject = Object.entries(
        commits.reduce((acc, c) => {
            acc[c.project] = acc[c.project] || 0;
            if (c.freeze_request) acc[c.project]++;
            return acc;
        }, {})
    ).map(([project, freezeCount]) => ({ project, freezeCount }));

    // --- Chart Data ---
    const commitsByDate = Object.entries(
        commits.reduce((acc, c) => {
            const date = new Date(c.timestamp).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {})
    ).map(([date, commits]) => ({ date, commits }));

    const riskConfidence = Object.entries(
        commits.reduce((acc, c) => {
            const date = new Date(c.timestamp).toISOString().split('T')[0];
            if (!acc[date]) acc[date] = { date, riskTotal: 0, confTotal: 0, count: 0 };
            acc[date].riskTotal += c.risk_score;
            acc[date].confTotal += c.confident_score;
            acc[date].count++;
            return acc;
        }, {})
    ).map(([date, v]) => ({
        date,
        avgRisk: (v.riskTotal / v.count).toFixed(1),
        avgConf: (v.confTotal / v.count).toFixed(1),
    }));

    const projectRisk = Object.entries(
        commits.reduce((acc, c) => {
            acc[c.project] = acc[c.project] || [];
            acc[c.project].push(c.risk_score);
            return acc;
        }, {})
    ).map(([project, scores]) => ({
        project,
        avgRisk: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    }));

    const topContributors = Object.entries(
        commits.reduce((acc, c) => {
            acc[c.user] = (acc[c.user] || 0) + 1;
            return acc;
        }, {})
    ).map(([user, count]) => ({ user, count }));

    const COLORS = ['#2563eb', '#82ca9d', '#f97316', '#8884d8', '#ef4444', '#22d3ee'];

    const recentCommits = [...commits]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 6);

    return (
        <div className="dashboard-page">
            <h2>Sentinel Analytics Dashboard</h2>

            {/* Summary */}
            <section className="summary-cards">
                <div className="card"><h3>Total Commits</h3><p>{totalCommits}</p></div>
                <div className="card"><h3>Total Projects</h3><p>{totalProjects}</p></div>
                <div className="card"><h3>Avg Risk Score</h3><p>{avgRiskScore}</p></div>
                <div className="card"><h3>Freeze Requests</h3><p>{freezeRequests}</p></div>
            </section>

            {/* Charts Grid */}
            <section className="charts-grid">

                {/* Line Chart */}
                <div className="chart-card">
                    <h3>Commits Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={commitsByDate}>
                            <CartesianGrid stroke="#e2e8f0" strokeDasharray="5 5" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="commits" stroke="#2563eb" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Area Chart */}
                <div className="chart-card">
                    <h3>Risk vs Confidence Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={riskConfidence}>
                            <defs>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip />
                            <Area type="monotone" dataKey="avgRisk" stroke="#f97316" fillOpacity={1} fill="url(#colorRisk)" />
                            <Area type="monotone" dataKey="avgConf" stroke="#82ca9d" fillOpacity={1} fill="url(#colorConf)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Composed Chart */}
                <div className="chart-card">
                    <h3>Risk vs Confidence Scatter</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={riskConfidence}>
                            <CartesianGrid stroke="#e2e8f0" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avgRisk" barSize={20} fill="#8884d8" name="Avg Risk" />
                            <Line type="monotone" dataKey="avgConf" stroke="#82ca9d" name="Avg Confidence" />
                            <Scatter dataKey="avgRisk" fill="#f97316" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="chart-card">
                    <h3>Top Contributors</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={topContributors}
                                dataKey="count"
                                nameKey="user"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {topContributors.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Radar Chart */}
                <div className="chart-card">
                    <h3>Project Risk Profile</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={projectRisk}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="project" />
                            <PolarRadiusAxis />
                            <Radar name="Risk" dataKey="avgRisk" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
                            <Legend />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div className="chart-card">
                    <h3>Freeze Requests by Project</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={freezeByProject}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="project" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="freezeCount" fill="#3b82f6" name="Freeze Requests" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Table */}
            <section className="recent-commits">
                <h3>Recent Commits</h3>
                <table>
                    <thead>
                    <tr>
                        <th>User</th>
                        <th>Project</th>
                        <th>Message</th>
                        <th>Risk</th>
                        <th>Confidence</th>
                        <th>Timestamp</th>
                    </tr>
                    </thead>
                    <tbody>
                    {recentCommits.map((c, i) => (
                        <tr key={i}>
                            <td>{c.user}</td>
                            <td>{c.project}</td>
                            <td>{c.commit_message}</td>
                            <td>{c.risk_score}</td>
                            <td>{c.confident_score}</td>
                            <td>{new Date(c.timestamp).toLocaleString()}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

export default Dashboard;