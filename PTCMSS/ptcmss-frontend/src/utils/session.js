const normalizeDiacritics = (text) => {
  if (!text) return "";
  return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();
};

export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CONSULTANT: "CONSULTANT",
  COORDINATOR: "COORDINATOR",
  DRIVER: "DRIVER",
  ACCOUNTANT: "ACCOUNTANT",
};

const ROLE_ALIAS = {
  ADMIN: ROLES.ADMIN,
  "QUAN TRI VIEN": ROLES.ADMIN,
  "QUAN TRI VIEN HE THONG": ROLES.ADMIN,
  MANAGER: ROLES.MANAGER,
  "QUAN LY": ROLES.MANAGER,
  "QUAN LY CHI NHANH": ROLES.MANAGER,
  CONSULTANT: ROLES.CONSULTANT,
  "DIEU HANH": ROLES.CONSULTANT,
  "TU VAN": ROLES.CONSULTANT,
  COORDINATOR: ROLES.COORDINATOR,
  "DIEU PHOI": ROLES.COORDINATOR,
  "DIEU PHOI VIEN": ROLES.COORDINATOR,
  DRIVER: ROLES.DRIVER,
  "TAI XE": ROLES.DRIVER,
  ACCOUNTANT: ROLES.ACCOUNTANT,
  "KE TOAN": ROLES.ACCOUNTANT,
};

const ROLE_HOME_PATH = {
  [ROLES.ADMIN]: "/analytics/admin",
  [ROLES.MANAGER]: "/analytics/manager",
  [ROLES.CONSULTANT]: "/orders/dashboard", // Bảng điều khiển đầu tiên
  [ROLES.COORDINATOR]: "/dispatch",
  [ROLES.DRIVER]: "/driver/dashboard",
  [ROLES.ACCOUNTANT]: "/accounting",
};

export const ALL_ROLES = Object.values(ROLES);

export function getCookieValue(name) {
  if (typeof document === "undefined") return "";
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop().split(";").shift() || "");
    }
  } catch {
    // ignore cookie errors
  }
  return "";
}

function safeLocalStorageGet(key) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function getStoredUserId() {
  return safeLocalStorageGet("userId") || getCookieValue("userId") || "";
}

export function getStoredUsername() {
  return safeLocalStorageGet("username") || getCookieValue("username") || "";
}

export function getStoredRoleLabel() {
  return safeLocalStorageGet("roleName") || getCookieValue("roleName") || "";
}

export function normalizeRole(rawRole) {
  return normalizeDiacritics(rawRole);
}

export function resolveRole(rawRole) {
  const normalized = normalizeDiacritics(rawRole);
  if (!normalized) return "";
  return ROLE_ALIAS[normalized] || normalized;
}

export function getCurrentRole() {
  const stored = getStoredRoleLabel();
  const resolved = resolveRole(stored);
  return resolved || ROLES.ADMIN;
}

export function getHomePathForRole(role) {
  return ROLE_HOME_PATH[role] || ROLE_HOME_PATH[ROLES.ADMIN];
}

function hasStoredToken(tokenKey) {
  return Boolean(safeLocalStorageGet(tokenKey) || getCookieValue(tokenKey));
}

export function hasActiveSession() {
  const hasAccess = hasStoredToken("access_token");
  const hasRefresh = hasStoredToken("refresh_token");
  const hasUser = Boolean(getStoredUserId());
  const hasRole = Boolean(getStoredRoleLabel());
  return hasAccess || hasRefresh || (hasUser && hasRole);
}