import { apiFetch } from "./http";

export function listBranches({ keyword, page = 0, size = 20, sortBy } = {}) {
    const params = new URLSearchParams();
    if (keyword) params.append("keyword", keyword);
    if (page != null) params.append("page", String(page));
    if (size != null) params.append("size", String(size));
    if (sortBy) params.append("sortBy", sortBy);
    const qs = params.toString();
    return apiFetch(`/api/branches${qs ? `?${qs}` : ""}`);
}

export function getBranch(id) {
    return apiFetch(`/api/branches/${id}`);
}

export function createBranch(req) {
    // CreateBranchRequest: { branchName, location, phone, managerId }
    return apiFetch("/api/branches", { method: "POST", body: req });
}

export function updateBranch(id, req) {
    return apiFetch(`/api/branches/${id}`, { method: "PUT", body: req });
}

export function deleteBranch(id) {
    return apiFetch(`/api/branches/${id}`, { method: "DELETE" });
}

export function getBranchByUserId(userId) {
    if (userId == null) throw new Error("USER_ID_REQUIRED");
    return apiFetch(`/api/branches/by-user/${userId}`);
}

export function getManagerDashboardStats(branchId, period) {
    if (branchId == null) throw new Error("BRANCH_ID_REQUIRED");
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    const qs = params.toString();
    return apiFetch(`/api/branches/${branchId}/dashboard-stats${qs ? `?${qs}` : ""}`);
}
