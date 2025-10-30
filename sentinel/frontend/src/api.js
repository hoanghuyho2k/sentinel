import axios from "axios";

// Base URL for backend API
const API_BASE_URL = "http://localhost:8000";

/**
 * Fetch all commit history records
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
 * Add a new record (demo purpose — sends payload to backend)
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