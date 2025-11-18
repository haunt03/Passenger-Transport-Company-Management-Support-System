import { apiFetch } from "./http";

// GET /api/employees/role/{roleName}
export function listEmployeesByRole(roleName) {
    const rn = String(roleName || "").trim();
    return apiFetch(`/api/employees/role/${encodeURIComponent(rn)}`);
}
