import { apiFetch } from "./http";

export function getDispatchDashboard({ branchId, date }) {
  if (!branchId) throw new Error("Vui lòng chọn chi nhánh trước.");
  const params = new URLSearchParams();
  params.append("branchId", String(branchId));
  if (date) params.append("date", date);
  const qs = params.toString();
  return apiFetch(`/api/dispatch/dashboard${qs ? `?${qs}` : ""}`);
}

export function assignTrips({ bookingId, tripIds, driverId, vehicleId, autoAssign, note }) {
  if (!bookingId) throw new Error("Thiếu thông tin đơn hàng cần gán.");
  const payload = {
    bookingId: Number(bookingId),
    tripIds: Array.isArray(tripIds) && tripIds.length
        ? tripIds.map((id) => Number(id))
        : undefined,
    driverId: driverId != null && driverId !== "" ? Number(driverId) : undefined,
    vehicleId: vehicleId != null && vehicleId !== "" ? Number(vehicleId) : undefined,
    autoAssign: autoAssign === true ? true : undefined,
    note: note || undefined,
  };
  return apiFetch("/api/dispatch/assign", { method: "POST", body: payload });
}

export function getAssignmentSuggestions(tripId) {
  if (!tripId) throw new Error("Thiếu mã chuyến để gợi ý gán.");
  return apiFetch(`/api/dispatch/trips/${tripId}/suggestions`);
}

export function getTripDetail(tripId) {
  return apiFetch(`/api/dispatch/detail/${tripId}`);
}

export function searchTrips(body) {
  return apiFetch("/api/dispatch/search", { method: "POST", body });
}

/**
 * Get pending trips for a branch
 * GET /api/dispatch/pending/{branchId}
 */
export function getPendingTrips(branchId) {
  if (!branchId) throw new Error("Vui lòng chọn chi nhánh trước.");
  return apiFetch(`/api/dispatch/pending/${branchId}`);
}

/**
 * Get all pending trips (Admin only)
 * GET /api/dispatch/pending
 */
export function getAllPendingTrips() {
  return apiFetch("/api/dispatch/pending");
}

/**
 * Reassign trips (unassign and assign again)
 * POST /api/dispatch/reassign
 * @param {Object} body - { tripId, driverId, vehicleId, note }
 */
export function reassignTrips(body) {
  return apiFetch("/api/dispatch/reassign", {
    method: "POST",
    body,
  });
}

/**
 * Unassign trip (remove driver/vehicle assignment)
 * POST /api/dispatch/trips/{tripId}/unassign
 * @param {number} tripId - Trip ID
 * @param {string} note - Reason for unassign (required)
 */
export function unassignTrip(tripId, note) {
  if (!tripId) throw new Error("Thiếu mã chuyến để hủy gán.");
  if (!note || !note.trim()) throw new Error("Vui lòng nhập lý do hủy gán.");
  return apiFetch(`/api/dispatch/trips/${tripId}/unassign`, {
    method: "POST",
    body: { note: note.trim() },
  });
}