import { apiFetch } from './http';

/**
 * Get list of branches
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 0)
 * @param {number} params.size - Page size (default: 20)
 * @returns {Promise<Object>} Paginated branch list
 */
export const listBranches = async (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) queryParams.append('page', params.page);
    if (params.size !== undefined) queryParams.append('size', params.size);
    if (params.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const url = `/api/branches${queryString ? `?${queryString}` : ''}`;

    return apiFetch(url);
};

/**
 * Get branch by ID
 * @param {number} branchId - Branch ID
 * @returns {Promise<Object>} Branch details
 */
export const getBranchById = async (branchId) => {
    return apiFetch(`/api/branches/${branchId}`);
};

// Alias for backward compatibility
export const getBranch = getBranchById;

/**
 * Get branch by user ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Branch details for the user
 */
export const getBranchByUserId = async (userId) => {
    return apiFetch(`/api/branches/by-user/${userId}`);
};

/**
 * Create a new branch
 * @param {Object} branchData - Branch data
 * @returns {Promise<Object>} Created branch
 */
export const createBranch = async (branchData) => {
    return apiFetch('/api/branches', {
        method: 'POST',
        body: JSON.stringify(branchData),
    });
};

/**
 * Update a branch
 * @param {number} branchId - Branch ID
 * @param {Object} branchData - Updated branch data
 * @returns {Promise<Object>} Updated branch
 */
export const updateBranch = async (branchId, branchData) => {
    return apiFetch(`/api/branches/${branchId}`, {
        method: 'PUT',
        body: JSON.stringify(branchData),
    });
};

/**
 * Delete a branch
 * @param {number} branchId - Branch ID
 * @returns {Promise<void>}
 */
export const deleteBranch = async (branchId) => {
    return apiFetch(`/api/branches/${branchId}`, {
        method: 'DELETE',
    });
};

/**
 * Get all branches for selection (dropdown/select)
 * Returns all ACTIVE branches without pagination
 * @returns {Promise<Array>} List of active branches
 */
export const getAllBranchesForSelection = async () => {
    return apiFetch('/api/branches/all');
};