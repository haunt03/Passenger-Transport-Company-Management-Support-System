import { apiFetch } from "./http";

// Query list with optional filters
export function listVehicles({ licensePlate, categoryId, branchId, status } = {}) {
  const params = new URLSearchParams();
  if (licensePlate) params.append("licensePlate", licensePlate);
  if (categoryId != null && categoryId !== "") params.append("categoryId", String(categoryId));
  if (branchId != null && branchId !== "") params.append("branchId", String(branchId));
  if (status) params.append("status", status);
  const qs = params.toString();
  return apiFetch(`/api/vehicles${qs ? `?${qs}` : ""}`);
}

export function getVehicle(id) {
  return apiFetch(`/api/vehicles/${id}`);
}

// Map snake_case form to backend DTO
function toVehicleRequest(form) {
  return {
    categoryId: form.category_id ?? form.categoryId,
    branchId: form.branch_id ?? form.branchId,
    licensePlate: form.license_plate ?? form.licensePlate,
    model: form.model ?? "",
    brand: form.brand ?? "",
    capacity: form.capacity ?? null,
    productionYear: form.year ?? form.productionYear ?? null,
    registrationDate: form.registrationDate ?? null,
    inspectionExpiry: form.reg_due_date ?? form.inspectionExpiry ?? null,
    insuranceExpiry: form.ins_due_date ?? form.insuranceExpiry ?? null,
    odometer: form.odometer != null ? Number(form.odometer) : null,
    status: form.status ?? "AVAILABLE",
  };
}

export function createVehicle(form) {
  return apiFetch("/api/vehicles", { method: "POST", body: toVehicleRequest(form) });
}

export function updateVehicle(id, form) {
  return apiFetch(`/api/vehicles/${id}`, { method: "PUT", body: toVehicleRequest(form) });
}

export function deleteVehicle(id) {
  return apiFetch(`/api/vehicles/${id}`, { method: "DELETE" });
}

// ==================== Vehicle Category APIs ====================

export function listVehicleCategories() {
  return apiFetch("/api/vehicle-categories");
}

export function getVehicleCategory(id) {
  return apiFetch(`/api/vehicle-categories/${id}`);
}

export function createVehicleCategory(body) {
  return apiFetch("/api/vehicle-categories", {
    method: "POST",
    body,
  });
}

export function updateVehicleCategory(id, body) {
  return apiFetch(`/api/vehicle-categories/${id}`, {
    method: "PUT",
    body,
  });
}

export function deleteVehicleCategory(id) {
  return apiFetch(`/api/vehicle-categories/${id}`, {
    method: "DELETE",
  });
}

export function listVehiclesByBranch(branchId, driverId = null) {
  if (branchId == null || branchId === "") throw new Error("Vui lòng chọn chi nhánh trước khi tải danh sách xe.");
  const params = driverId != null ? `?driverId=${driverId}` : "";
  return apiFetch(`/api/vehicles/branch/${branchId}${params}`);
}

// ==================== Vehicle History APIs ====================

/**
 * Get vehicle trips history
 * GET /api/vehicles/{id}/trips
 */
export function getVehicleTrips(id) {
  return apiFetch(`/api/vehicles/${id}/trips`);
}

/**
 * Get vehicle expenses history
 * GET /api/vehicles/{id}/expenses
 */
export function getVehicleExpenses(id) {
  return apiFetch(`/api/vehicles/${id}/expenses`);
}

/**
 * Get vehicle maintenance history
 * GET /api/vehicles/{id}/maintenance
 */
export function getVehicleMaintenance(id) {
  return apiFetch(`/api/vehicles/${id}/maintenance`);
}

/**
 * Add maintenance record for vehicle
 * POST /api/vehicles/{id}/maintenance
 * @param {number} id - Vehicle ID
 * @param {Object} body - { maintenanceDate, maintenanceType, description, cost, odometer, nextMaintenanceDate }
 */
export function addVehicleMaintenance(id, body) {
  return apiFetch(`/api/vehicles/${id}/maintenance`, {
    method: "POST",
    body,
  });
}

/**
 * Add expense record for vehicle
 * POST /api/vehicles/{id}/expenses
 * @param {number} id - Vehicle ID
 * @param {Object} body - { costType, amount, description, expenseDate, odometer }
 */
export function addVehicleExpense(id, body) {
  return apiFetch(`/api/vehicles/${id}/expenses`, {
    method: "POST",
    body,
  });
}
