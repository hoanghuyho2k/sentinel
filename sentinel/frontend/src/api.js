import axios from "axios";

// Base URL for backend API
const API_BASE_URL = "http://localhost:8000";

/**
 * Fetch commit history from the backend
 * @returns {Promise<*|*[]>}
 */
export async function fetchHistory() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/history`);
        return response.data;
    } catch (error) {
        console.error("❌ Failed to fetch history:", error);
        return [];
    }
}

/**
 * Add a new commit history record to the backend
 * @param payload
 * @returns {Promise<*|null>}
 */
export async function addRecord(payload) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/add`, payload);
        return response.data;
    } catch (error) {
        console.error("❌ Failed to add record:", error);
        return null;
    }
}

/**
 * Fetch AI insights from the backend
 * @returns {Promise<*|{insight: string}>}
 */
export async function fetchInsights() {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/insights`);
        return res.data;
    } catch (err) {
        console.error("Failed to fetch insights:", err);
        return { insight: "Error fetching AI insights." };
    }
}