import { NavLink, Link } from "react-router-dom";
import "../styles/Navbar.css";

const links = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/data-record", label: "Data Records" },
    { to: "/reports", label: "Reports" },
];

export default function Navbar() {
    return (
        <nav className="navbar" aria-label="Main navigation">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo" aria-label="Sentinel home">
                    <span className="navbar-mark" aria-hidden="true">S</span>
                    <span>Sentinel</span>
                </Link>

                <ul className="navbar-links">
                    {links.map(({ to, label, end }) => (
                        <li key={to}>
                            <NavLink to={to} end={end} className={({ isActive }) => isActive ? "active" : ""}>
                                {label}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                <div className="navbar-buttons">
                    <NavLink to="/login" className="nav-action" aria-label="Demo sign in" title="Demo sign in">Sign in</NavLink>
                    <NavLink to="/settings" className="nav-icon" aria-label="Settings" title="Settings">⚙</NavLink>
                </div>
            </div>
        </nav>
    );
}
