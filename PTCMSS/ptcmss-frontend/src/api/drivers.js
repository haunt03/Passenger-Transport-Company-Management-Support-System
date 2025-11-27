import { apiFetch } from "./http";

export function getDriverProfileByUser(userId) {
    return apiFetch(`/api/drivers/by-user/${userId}/profile`);
}

export function getDriverProfile(driverId) {
    return apiFetch(`/api/drivers/${driverId}/profile`);
}

export function updateDriverProfile(driverId, payload) {
    return apiFetch(`/api/drivers/${driverId}/profile`, {
        method: "PUT",
        body: payload,
    });
}

export function getDriverDashboard(driverId) {
    return apiFetch(`/api/drivers/${driverId}/dashboard`);
}

export function getDriverSchedule(driverId) {
    return apiFetch(`/api/drivers/${driverId}/schedule`);
}

export function requestDayOff(driverId, payload) {
    return apiFetch(`/api/drivers/${driverId}/dayoff`, {
        method: "POST",
        body: payload,
    });
}

export function startTrip(driverId, tripId) {
    return apiFetch(`/api/drivers/${driverId}/trips/${tripId}/start`, { method: "POST" });
}

export function completeTrip(driverId, tripId) {
    return apiFetch(`/api/drivers/${driverId}/trips/${tripId}/complete`, { method: "POST" });
}

export function reportIncident({ driverId, tripId, severity, description }) {
    return apiFetch(`/api/drivers/report-incident`, {
        method: "POST",
        body: { driverId, tripId, severity, description },
    });
}

export function listDriversByBranch(branchId) {
    if (branchId == null || branchId === "") throw new Error("BRANCH_ID_REQUIRED");
    return apiFetch(`/api/drivers/branch/${branchId}`);
}

