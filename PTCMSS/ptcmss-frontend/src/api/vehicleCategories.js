import { apiFetch } from "./http";

export function listVehicleCategories() {
    return apiFetch("/api/vehicle-categories");
}

export function getVehicleCategory(id) {
    return apiFetch(`/api/vehicle-categories/${id}`);
}

// Map UI fields to backend request
// Backend uses 'baseFare' not 'baseFee'
function toReq(b) {
    return {
        categoryName: b.categoryName ?? b.name,
        seats: b.seats ?? null,
        description: b.description ?? "",
        baseFare: b.baseFee ?? b.baseFare ?? null,
        sameDayFixedPrice: b.sameDayFixedPrice ?? null,
        pricePerKm: b.pricePerKm ?? null,
        highwayFee: b.highwayFee ?? null,
        fixedCosts: b.fixedCosts ?? null,
        effectiveDate: b.effectiveDate ?? null,
        status: b.status ?? "ACTIVE",
    };
}

export function createVehicleCategory(body) {
    return apiFetch("/api/vehicle-categories", { method: "POST", body: toReq(body) });
}

export function updateVehicleCategory(id, body) {
    return apiFetch(`/api/vehicle-categories/${id}`, { method: "PUT", body: toReq(body) });
}

export function deleteVehicleCategory(id) {
    return apiFetch(`/api/vehicle-categories/${id}`, { method: "DELETE" });
}
