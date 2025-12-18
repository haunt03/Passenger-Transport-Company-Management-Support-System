import { apiFetch } from "./http";

export function getSystemSettingByKey(settingKey) {
    if (!settingKey) throw new Error("settingKey is required");
    return apiFetch(`/api/system-settings/key/${encodeURIComponent(settingKey)}`);
}

/**
 * System Settings API
 * Module 1 - System Administration
 */

/**
 * Get all system settings
 * GET /api/system-settings
 */
export function listSystemSettings() {
    return apiFetch("/api/system-settings");
}

/**
 * Get system setting by ID
 * GET /api/system-settings/{id}
 */
export function getSystemSetting(id) {
    return apiFetch(`/api/system-settings/${id}`);
}

/**
 * Create new system setting
 * POST /api/system-settings
 * @param {Object} body - { key, value, label, description, category }
 */
export function createSystemSetting(body) {
    return apiFetch("/api/system-settings", {
        method: "POST",
        body,
    });
}

/**
 * Update system setting
 * PUT /api/system-settings/{id}
 * @param {number} id - Setting ID
 * @param {Object} body - { key, value, label, description, category }
 */
export function updateSystemSetting(id, body) {
    return apiFetch(`/api/system-settings/${id}`, {
        method: "PUT",
        body,
    });
}

/**
 * Delete system setting
 * DELETE /api/system-settings/{id}
 * @param {number} id - Setting ID
 */
export function deleteSystemSetting(id) {
    return apiFetch(`/api/system-settings/${id}`, {
        method: "DELETE",
    });
}
