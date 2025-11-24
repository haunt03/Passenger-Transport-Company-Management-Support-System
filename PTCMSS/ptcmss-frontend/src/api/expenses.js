import { apiFetch } from "./http";

export function createExpenseRequest(formData) {
    if (!(formData instanceof FormData)) {
        throw new Error("FORM_DATA_REQUIRED");
    }
    return apiFetch("/api/expense-requests", {
        method: "POST",
        body: formData,
    });
}