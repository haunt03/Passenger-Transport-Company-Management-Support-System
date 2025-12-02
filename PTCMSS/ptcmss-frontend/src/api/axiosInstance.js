// Lightweight axios-like wrapper to keep dashboards API compatible
import { apiFetch } from "./http";

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:8080";

function buildQuery(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
            value.forEach((v) => search.append(key, v));
        } else {
            search.append(key, value);
        }
    });
    const qs = search.toString();
    return qs ? `?${qs}` : "";
}

function getAccessToken() {
    try {
        const v = localStorage.getItem("access_token") || "";
        if (v) return v;
    } catch { }
    try {
        const parts = document.cookie.split("; ");
        for (const p of parts) {
            const [k, v] = p.split("=");
            if (k === "access_token") return decodeURIComponent(v || "");
        }
    } catch { }
    return "";
}

async function get(path, { params, responseType } = {}) {
    // Handle blob download separately to avoid apiFetch JSON parsing
    if (responseType === "blob") {
        const url = `${path.startsWith("http") ? path : `${API_BASE}${path}`}${buildQuery(params)}`;
        const headers = {};
        const token = getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const resp = await fetch(url, { method: "GET", headers, credentials: "include" });
        if (!resp.ok) {
            const err = new Error("API_ERROR");
            err.status = resp.status;
            throw err;
        }
        const data = await resp.blob();
        return { data };
    }

    const qs = buildQuery(params);
    // Let apiFetch throw - caller should handle errors
    const data = await apiFetch(`${path}${qs}`);
    return { data };
}

async function post(path, data, config = {}) {
    const body = config?.body ?? data;
    const res = await apiFetch(path, { method: "POST", body });
    return { data: res };
}

const axiosInstance = { get, post };

export default axiosInstance;
