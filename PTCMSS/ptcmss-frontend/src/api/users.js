import { apiFetch } from "./http";

export function listUsers({ keyword, roleId, status } = {}) {
    const params = new URLSearchParams();
    if (keyword) params.append("keyword", keyword);
    if (roleId != null) params.append("roleId", String(roleId));
    if (status) params.append("status", status);
    const qs = params.toString();
    return apiFetch(`/api/users${qs ? `?${qs}` : ""}`);
}

export function listUsersByBranch(branchId) {
    const id = Number(branchId);
    if (!Number.isFinite(id)) throw new Error("INVALID_BRANCH_ID");
    return apiFetch(`/api/users/branch/${id}`);
}

export function getUser(id) {
    return apiFetch(`/api/users/${id}`);
}

// export function createUser(req) {
//   // req: { fullName, username, email, phone, address, roleId }
//   return apiFetch("/api/users/register", { method: "POST", body: req });
// }
export async function createUser(body) {
    return await apiFetch("/api/users/register", {
        method: "POST",
        body,
    });
}
export function updateUser(id, req) {
    // req: UpdateUserRequest fields
    return apiFetch(`/api/users/${id}`, { method: "PUT", body: req });
}

export function toggleUserStatus(id) {
    return apiFetch(`/api/users/${id}/toggle-status`, { method: "PATCH" });
}

export function listRoles() {
    // Admin only
    return apiFetch("/api/roles");
}
