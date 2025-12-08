import { apiFetch } from "./http";

/**
 * Lấy danh sách nhân viên theo role
 * @param {string} roleName - Tên role (ví dụ: "Manager", "Driver", "Admin")
 * @returns {Promise} Danh sách nhân viên
 */
const fetchEmployeesByRole = (roleName) => {
  const rn = String(roleName || "").trim();
  return apiFetch(`/api/employees/role/${encodeURIComponent(rn)}`);
};

/**
 * Lấy tất cả nhân viên
 * @returns {Promise} Danh sách tất cả nhân viên
 */
export const getAllEmployees = async () => {
  return apiFetch(`/api/employees`);
};

/**
 * Lấy thông tin nhân viên theo ID
 * @param {number} id - ID nhân viên
 * @returns {Promise} Thông tin nhân viên
 */
export const getEmployeeById = async (id) => {
  return apiFetch(`/api/employees/${id}`);
};

// Alias cho compatibility với code cũ
export const getEmployeesByRole = fetchEmployeesByRole;
export const listEmployeesByRole = fetchEmployeesByRole;
// GET /api/employees
export function listEmployees() {
  return apiFetch("/api/employees");
}

// GET /api/employees/{id}
export function getEmployee(id) {
  return apiFetch(`/api/employees/${id}`);
}

// POST /api/employees - Tạo nhân viên mới
export function createEmployee(req) {
  // req: { userId, branchId, roleId, status }
  return apiFetch("/api/employees", { method: "POST", body: req });
}

// PUT /api/employees/{id} - Cập nhật nhân viên + thông tin user liên quan
export function updateEmployee(id, req) {
  // req: { branchId, roleId, status, fullName?, email?, phone?, address? }
  return apiFetch(`/api/employees/${id}`, { method: "PUT", body: req });
}

// DELETE /api/employees/{id}
export function deleteEmployee(id) {
  return apiFetch(`/api/employees/${id}`, { method: "DELETE" });
}

// GET /api/employees/branch/{branchId}
export function listEmployeesByBranch(branchId) {
  return apiFetch(`/api/employees/branch/${branchId}`);
}

// POST /api/employees/create-with-user - Tạo nhân viên kèm user
export function createEmployeeWithUser(req) {
  // req: { username, password, fullName, email, phone, address, branchId, roleId, status }
  return apiFetch("/api/employees/create-with-user", { method: "POST", body: req });
}

// GET /api/employees/user/{userId} - Lấy employee theo userId
export function getEmployeeByUserId(userId) {
  return apiFetch(`/api/employees/user/${userId}`);
}

// GET /api/employees/available-managers - Lấy danh sách managers chưa được gán cho chi nhánh
export function getAvailableManagers(excludeBranchId = null) {
  const params = excludeBranchId ? `?excludeBranchId=${excludeBranchId}` : '';
  return apiFetch(`/api/employees/available-managers${params}`);
}
