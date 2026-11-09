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
            <h2>Sentinel Demo Sign-in</h2>
            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    placeholder="Choose a demo username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button type="submit">Enter demo</button>
            </form>
        </div>
    );
}

export default Login;