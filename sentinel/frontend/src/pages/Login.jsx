import { useState } from "react";
import "../styles/Login.css";

function Login() {
    const [username, setUsername] = useState("");

    function handleLogin(e) {
        e.preventDefault();
        if (!username) return alert("Please enter your username");

        const user = { username };
        localStorage.setItem("sentinel_user", JSON.stringify(user));
        window.location.href = "/data-record";
    }

    return (
        <div className="login-page">
            <h2>🔐 Sentinel Login</h2>
            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    placeholder="Enter username (e.g. dinhson, pooja, admin)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button type="submit">Login</button>
            </form>
        </div>
    );
}

export default Login;