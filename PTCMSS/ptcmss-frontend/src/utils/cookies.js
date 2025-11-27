export function getCookie(name) {
  if (typeof document === "undefined") return "";
  try {
    const parts = document.cookie.split("; ");
    for (const p of parts) {
      const [k, v] = p.split("=");
      if (k === name) return decodeURIComponent(v || "");
    }
  } catch {}
  return "";
}

export function getNumberCookie(name) {
  const s = getCookie(name);
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

