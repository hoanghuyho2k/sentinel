import './styles/App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from './pages/Dashboard.jsx';
import DataRecords from './pages/DataRecords.jsx';
import Navbar from "./components/Navbar.jsx";
import Reports from "./pages/Reports.jsx";
import Users from "./pages/Users.jsx";
import NotFound from "./pages/NotFound.jsx";
import Login from "./pages/Login.jsx";
import Settings from "./pages/Settings.jsx";

function App() {
    return (
        <Router>
            <Navbar />
            <div className="demo-banner" role="note">
                <span className="demo-banner-label">DEMO MODE</span>
                <span>Sample release data · Sign-in is simulated</span>
            </div>
            <main className="app-main">
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/data-record" element={<DataRecords />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/users" element={<Users />} />
                <Route path="/login" element={<Login />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
            </main>
        </Router>
    )
}

export default App;