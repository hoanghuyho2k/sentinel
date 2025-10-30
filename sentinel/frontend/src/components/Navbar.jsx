import {Link} from "react-router-dom";
import "../styles/Navbar.css"

export default function Navbar() {

    return (
        <nav className="navbar">
            <div className="navbar-container">

                {/*Logo*/}
                <Link to="/" className="navbar-logo" style={{color: "lightblue", textDecoration: "none"}}>💻 Sentinel</Link>

                {/*Link*/}
                <ul className="navbar-links">
                    <li><Link to="/" style={{color: "lightblue", textDecoration: "none"}}>Dashboard</Link></li>
                    <li><Link to="/data-record" style={{color: "lightblue", textDecoration: "none"}}>Data Records</Link>
                    </li>
                    <li><Link to="/reports" style={{color: "lightblue", textDecoration: "none"}}>Reports</Link></li>
                    <li><Link to="/history" style={{color: "lightblue", textDecoration: "none"}}>History</Link></li>
                </ul>

                {/*Buttons*/}
                <div className="navbar-buttons">
                    <Link to="/login" style={{color: "lightblue", textDecoration: "none"}}>🔐</Link>
                    <Link to="/settings" style={{color: "lightblue", textDecoration: "none"}}>⚙️</Link>
                </div>

            </div>
        </nav>
    );
}