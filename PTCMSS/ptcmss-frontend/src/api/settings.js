import { apiFetch } from './http';

/**
 * Get current QR payment settings
 * @returns {Promise<Object>} QR settings response
 */
export async function getQrSettings() {
    return apiFetch('/api/admin/settings/qr', { method: 'GET' });
}

/**
 * Update QR payment settings (Admin only)
 * @param {Object} settings - QR settings to update
 * @param {string} settings.bankCode - Bank code (e.g., "970403")
 * @param {string} settings.accountNumber - Bank account number
 * @param {string} settings.accountName - Account holder name
 * @param {string} settings.descriptionPrefix - Payment description prefix
 * @returns {Promise<Object>} Updated QR settings
 */
export async function updateQrSettings(settings) {
    return apiFetch('/api/admin/settings/qr', {
        method: 'PUT',
        body: settings,
    });
}