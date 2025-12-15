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
    const err = new Error("Lỗi máy chủ");
    err.status = resp.status;
    err.data = data;
    err.message = data?.message || data?.error || `Lỗi máy chủ (HTTP ${resp.status}: ${resp.statusText})`;
    
    // Silently ignore 404/500 errors for branch/user endpoint (user may not have branch)
    if (path.includes('/branches/user/') && (resp.status === 404 || resp.status === 500)) {
      // Don't log, just throw
    }
    
    throw err;
  }

  // Support standard backend wrappers and variants
  // - Variant A: { code, message, data }
  // - Variant B: { status, message, data }
  // - Variant C: { success, message, data }
  // Note: Only treat as wrapper if status/code is a number (HTTP status code)
  // Business entities may have "status" field (string) which should not be treated as HTTP status
  // Check if data is an object before using 'in' operator
  if (!data || typeof data !== "object") {
    return data; // Return string or primitive as-is
  }
  
  const hasDataField = "data" in data;
  const hasSuccessField = "success" in data && typeof data.success === "boolean";
  const hasCodeField = "code" in data && typeof data.code === "number";
  const hasStatusField = "status" in data && typeof data.status === "number";
  const hasMessageField = "message" in data && typeof data.message === "string";
  
  // Only treat as wrapper if it has explicit wrapper indicators:
  // - Has "data" field (ResponseData wrapper)
  // - Has "success" boolean field
  // - Has numeric "code" or "status" field (HTTP status code, not business status)
  // - Has both "message" and numeric "status"/"code" (ErrorResponse pattern)
  const isWrapper = hasDataField || 
                    hasSuccessField || 
                    hasCodeField || 
                    (hasStatusField && (hasMessageField || hasDataField));
  
  if (data && typeof data === "object" && isWrapper) {
    const code = data.code ?? data.status;
    const successFlag = typeof data.success === "boolean" ? data.success : undefined;
    const isOk =
      successFlag !== undefined
        ? successFlag
        : code === undefined || (typeof code === "number" && code >= 200 && code < 300);

    if (isOk) return "data" in data ? data.data : data;

    const err = new Error(data.message || "Lỗi máy chủ");
    err.status = code;
    err.data = data;
    throw err;
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
