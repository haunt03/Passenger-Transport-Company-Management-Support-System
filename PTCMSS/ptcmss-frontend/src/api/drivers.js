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

export function getDriverSchedule(driverId, { startDate, endDate } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";
  return apiFetch(`/api/drivers/${driverId}/schedule${suffix}`);
}

export function requestDayOff(driverId, payload) {
  return apiFetch(`/api/drivers/${driverId}/dayoff`, {
    method: "POST",
    body: payload,
  });
}

export function getDriverRequests(driverId) {
  return apiFetch(`/api/drivers/${driverId}/requests`);
}

export function getDayOffHistory(driverId) {
  return apiFetch(`/api/drivers/${driverId}/dayoff`);
}

export function cancelDayOffRequest(driverId, dayOffId) {
  return apiFetch(`/api/drivers/${driverId}/dayoff/${dayOffId}`, {
    method: "DELETE",
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
  if (branchId == null || branchId === "") throw new Error("Vui lòng chọn chi nhánh trước khi tải danh sách tài xế.");
  return apiFetch(`/api/drivers/branch/${branchId}`);
}

/**
 * Upload avatar cho driver (thông qua userId)
 * @param {number} userId - ID của user (driver)
 * @param {File} file - File ảnh
 * @returns {Promise<string>} URL của avatar đã upload
 */
export async function uploadDriverAvatar(userId, file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch(`/api/users/${userId}/avatar`, {
    method: "POST",
    body: formData,
  });
}
