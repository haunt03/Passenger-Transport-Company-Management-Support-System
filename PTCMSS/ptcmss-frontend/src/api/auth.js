import { apiFetch, setTokens, clearTokens } from "./http";

function setCookie(name, value, days = 7) {
    try {
        const d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${encodeURIComponent(value || "")};expires=${d.toUTCString()};path=/`;
    } catch {}
}

function deleteCookie(name) {
    try {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch {}
}

export async function login({ username, password }) {
    const data = await apiFetch("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { username, password },
    });
    // TokenResponse has capitalized keys
    const accessToken = data?.AccessToken || data?.accessToken;
    const refreshToken = data?.RefreshToken || data?.refreshToken;
    setTokens({ accessToken, refreshToken });
    // also persist to cookies for header UI
    setCookie("username", data?.username || username);
    setCookie("roleName", data?.roleName || "");
    if (data?.userId != null) {
        try { localStorage.setItem("userId", String(data.userId)); } catch {}
        setCookie("userId", String(data.userId));
    }
    if (accessToken) setCookie("access_token", accessToken);
    return data;
}

export async function refresh() {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("Thiếu refresh token. Vui lòng đăng nhập lại.");
    const data = await apiFetch(`/api/auth/refresh-token?refreshToken=${encodeURIComponent(refreshToken)}`, {
        method: "POST",
        auth: false,
    });
    const accessToken = data?.AccessToken || data?.accessToken;
    const newRefresh = data?.RefreshToken || data?.refreshToken || refreshToken;
    setTokens({ accessToken, refreshToken: newRefresh });
    return data;
}

export async function logout() {
    try {
        await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
        clearTokens();
        deleteCookie("username");
        deleteCookie("roleName");
        deleteCookie("userId");
        deleteCookie("access_token");
    }
}

/**
 * Forgot password - send reset link to email
 * POST /api/auth/forgot-password
 * @param {string} email - User email
 */
export async function forgotPassword(email) {
    return apiFetch("/api/auth/forgot-password", {
        method: "POST",
        auth: false,
        body: { email },
    });
}

export async function setPassword({ token, password, confirmPassword }) {
    return apiFetch("/api/auth/set-password", {
        method: "POST",
        auth: false,
        body: {
            token,
            password,
            confirmPassword,
        },
    });
}