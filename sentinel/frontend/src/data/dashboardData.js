export const dashboardData = {
    summary: {
        totalCommits: 128,
        totalProjects: 4,
        avgRiskScore: 35,
        freezeRequests: 2
    },
    commitsByDate: [
        { date: '2025-10-07', commits: 10 },
        { date: '2025-10-08', commits: 18 },
        { date: '2025-10-09', commits: 25 },
        { date: '2025-10-10', commits: 15 },
        { date: '2025-10-11', commits: 28 },
        { date: '2025-10-12', commits: 20 },
        { date: '2025-10-13', commits: 30 }
    ],
    riskScores: [
        { project: 'Frontend', risk: 22 },
        { project: 'Backend', risk: 41 },
        { project: 'DataPipeline', risk: 57 },
        { project: 'ModelTrainer', risk: 33 }
    ],
    recentCommits: [
        {
            user: 'dinhson',
            project: 'Frontend',
            message: 'Improve navbar layout and color variables',
            risk_score: 20,
            confident_score: 92,
            timestamp: '2025-10-12T10:45:00Z'
        },
        {
            user: 'pooja',
            project: 'Backend',
            message: 'Refactor API commit handler',
            risk_score: 48,
            confident_score: 85,
            timestamp: '2025-10-12T09:15:00Z'
        },
        {
            user: 'kasthuri',
            project: 'ModelTrainer',
            message: 'Update risk threshold and training batch size',
            risk_score: 63,
            confident_score: 70,
            timestamp: '2025-10-11T18:20:00Z'
        },
        {
            user: 'son',
            project: 'DataPipeline',
            message: 'Fix large file ingestion bug',
            risk_score: 39,
            confident_score: 88,
            timestamp: '2025-10-11T13:05:00Z'
        }
    ]
};