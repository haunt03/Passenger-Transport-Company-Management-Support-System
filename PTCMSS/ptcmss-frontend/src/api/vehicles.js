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

export function listVehicleCategories() {
    return apiFetch("/api/vehicle-categories");
}
