// Lightweight fetch wrapper with base URL and auth header

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:8080";

function getCookie(name) {
    try {
        const parts = document.cookie.split("; ");
        for (const p of parts) {
            const [k, v] = p.split("=");
            if (k === name) return decodeURIComponent(v || "");
        }
    } catch {}
    return "";
}

function getAccessToken() {
    try {
        const v = localStorage.getItem("access_token") || "";
        if (v) return v;
    } catch {}
    const cookieToken = getCookie("access_token");
    return cookieToken || "";
}

export async function apiFetch(path, { method = "GET", headers = {}, body, auth = true } = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const finalHeaders = { "Content-Type": "application/json", ...headers };
    if (auth) {
        const token = getAccessToken();
        if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
    }
    // If sending FormData, let the browser set multipart boundary
    const isFormData = (typeof FormData !== "undefined") && body instanceof FormData;
    if (isFormData) {
        delete finalHeaders["Content-Type"];
    }
    const resp = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? (isFormData ? body : (typeof body === "string" ? body : JSON.stringify(body))) : undefined,
        credentials: "include",
    });

    // Try to parse JSON; some endpoints may return plain text
    let data;
    const text = await resp.text();
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!resp.ok) {
        const err = new Error("API_ERROR");
        err.status = resp.status;
        err.data = data;
        throw err;
    }

    // Support standard backend wrappers and variants
    // - Variant A: { code, message, data }
    // - Variant B: { status, message, data }
    // - Variant C: { success, message, data }
    if (data && typeof data === "object" && "data" in data && ("code" in data || "status" in data || "success" in data)) {
        return data.data;
    }
    return data;
}

export function setTokens({ accessToken, refreshToken }) {
    try {
        if (accessToken) localStorage.setItem("access_token", accessToken);
        if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
    } catch {}
}

export function clearTokens() {
    try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
    } catch {}
}