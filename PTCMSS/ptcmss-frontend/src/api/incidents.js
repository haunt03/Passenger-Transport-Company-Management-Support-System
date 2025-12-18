import { apiFetch } from "./http";

export function listIncidentsByBranch(branchId, resolved) {
    const query = [];
    if (branchId) query.push(`branchId=${branchId}`);
    if (resolved !== undefined && resolved !== null) {
        query.push(`resolved=${resolved}`);
    }
    const qs = query.length ? `?${query.join("&")}` : "";
    return apiFetch(`/api/incidents/branch/${branchId}${qs}`);
}

export function resolveIncident(incidentId, resolutionAction, resolutionNote) {
    return apiFetch(`/api/incidents/${incidentId}/resolve`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            resolutionAction,
            resolutionNote,
        }),
    });
}

export function listIncidentsByDriver(driverId, resolved) {
    const query = [];
    if (resolved !== undefined && resolved !== null) {
        query.push(`resolved=${resolved}`);
    }
    const qs = query.length ? `?${query.join("&")}` : "";
    return apiFetch(`/api/incidents/driver/${driverId}${qs}`);
}
