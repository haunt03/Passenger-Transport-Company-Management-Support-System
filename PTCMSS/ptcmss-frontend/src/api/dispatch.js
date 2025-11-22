import { apiFetch } from "./http";

export function getDispatchDashboard({ branchId, date }) {
  if (!branchId) throw new Error("BRANCH_ID_REQUIRED");
  const params = new URLSearchParams();
  params.append("branchId", String(branchId));
  if (date) params.append("date", date);
  const qs = params.toString();
  return apiFetch(`/api/dispatch/dashboard${qs ? `?${qs}` : ""}`);
}

export function assignTrips({ bookingId, tripIds, driverId, vehicleId, autoAssign, note }) {
  if (!bookingId) throw new Error("BOOKING_ID_REQUIRED");
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

export function getTripDetail(tripId) {
  return apiFetch(`/api/dispatch/detail/${tripId}`);
}

export function searchTrips(body) {
  return apiFetch("/api/dispatch/search", { method: "POST", body });
}
