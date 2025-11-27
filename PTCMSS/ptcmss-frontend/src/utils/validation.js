/**
 * Validation utilities for form inputs
 * Sử dụng cho toàn bộ project
 */

// ============= EMAIL VALIDATION =============
export const validateEmail = (email) => {
    if (!email || !email.trim()) {
        return ""; // Empty is valid (unless required)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return "Email không đúng định dạng";
    }

    return "";
};

// ============= PHONE VALIDATION =============
export const validatePhone = (phone) => {
    if (!phone || !phone.trim()) {
        return ""; // Empty is valid (unless required)
    }

    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Vietnamese phone: 10 digits, starts with 0
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
        return "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0";
    }

    return "";
};

// ============= REQUIRED FIELD VALIDATION =============
export const validateRequired = (value, fieldName = "Trường này") => {
    if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} là bắt buộc`;
    }
    return "";
};

// ============= USERNAME VALIDATION =============
export const validateUsername = (username) => {
    if (!username || !username.trim()) {
        return "";
    }

    // Username: 3-50 characters, alphanumeric and underscore only
    if (username.length < 3) {
        return "Username phải có ít nhất 3 ký tự";
    }

    if (username.length > 50) {
        return "Username không được quá 50 ký tự";
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        return "Username chỉ được chứa chữ cái, số và dấu gạch dưới";
    }

    return "";
};

// ============= PASSWORD VALIDATION =============
export const validatePassword = (password) => {
    if (!password) {
        return "";
    }

    if (password.length < 6) {
        return "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (password.length > 100) {
        return "Mật khẩu không được quá 100 ký tự";
    }

    // Optional: Check for strong password
    // const hasUpperCase = /[A-Z]/.test(password);
    // const hasLowerCase = /[a-z]/.test(password);
    // const hasNumber = /\d/.test(password);
    // if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    //   return "Mật khẩu phải chứa chữ hoa, chữ thường và số";
    // }

    return "";
};

// ============= NUMBER VALIDATION =============
export const validateNumber = (value, min = null, max = null, fieldName = "Giá trị") => {
    if (!value && value !== 0) {
        return "";
    }

    const num = Number(value);
    if (isNaN(num)) {
        return `${fieldName} phải là số`;
    }

    if (min !== null && num < min) {
        return `${fieldName} phải lớn hơn hoặc bằng ${min}`;
    }

    if (max !== null && num > max) {
        return `${fieldName} phải nhỏ hơn hoặc bằng ${max}`;
    }

    return "";
};

// ============= LICENSE PLATE VALIDATION =============
export const validateLicensePlate = (plate) => {
    if (!plate || !plate.trim()) {
        return "";
    }

    const cleanPlate = plate.trim().toUpperCase();

    // Định dạng biển số xe Việt Nam:
    // 1. Xe ô tô: 29A-12345, 29A-123.45, 29AB-12345 (2 số tỉnh + 1-2 chữ + 4-5 số)
    // 2. Xe ngoại giao: NG-001, NN-123 (NG/NN + số)
    // 3. Xe quân đội: QĐ-12345 (QĐ + số)

    // Xe ô tô thông thường: 29A-12345 hoặc 29A-123.45
    const carPlateRegex = /^\d{2}[A-Z]{1,2}[-\s]?\d{3,5}(\.\d{2})?$/;

    // Xe ngoại giao: NG-001, NN-123
    const diplomaticPlateRegex = /^(NG|NN)[-\s]?\d{3,4}$/;

    // Xe quân đội: QĐ-12345
    const militaryPlateRegex = /^Q[ĐD][-\s]?\d{4,5}$/;

    if (!carPlateRegex.test(cleanPlate) &&
        !diplomaticPlateRegex.test(cleanPlate) &&
        !militaryPlateRegex.test(cleanPlate)) {
        return "Biển số xe không đúng định dạng VN (VD: 29A-12345, 51H-123.45)";
    }

    return "";
};

// ============= DATE VALIDATION =============
export const validateDate = (date, fieldName = "Ngày") => {
    if (!date) {
        return "";
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
        return `${fieldName} không hợp lệ`;
    }

    return "";
};

export const validateDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) {
        return "";
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
        return "Ngày bắt đầu phải trước ngày kết thúc";
    }

    return "";
};

// ============= DISTANCE VALIDATION =============
export const validateDistance = (distance) => {
    return validateNumber(distance, 0, 10000, "Khoảng cách");
};

// ============= PRICE VALIDATION =============
export const validatePrice = (price) => {
    return validateNumber(price, 0, 1000000000, "Giá tiền");
};

// ============= COMPOSITE VALIDATION =============
/**
 * Validate multiple fields at once
 * @param {Object} values - Object with field values
 * @param {Object} rules - Object with validation rules
 * @returns {Object} - Object with error messages
 *
 * Example:
 * const errors = validateForm(
 *   { email: 'test@example.com', phone: '0123456789' },
 *   {
 *     email: [validateRequired, validateEmail],
 *     phone: [validateRequired, validatePhone]
 *   }
 * );
 */
export const validateForm = (values, rules) => {
    const errors = {};

    Object.keys(rules).forEach(field => {
        const validators = Array.isArray(rules[field]) ? rules[field] : [rules[field]];

        for (const validator of validators) {
            const error = validator(values[field], field);
            if (error) {
                errors[field] = error;
                break; // Stop at first error
            }
        }
    });

    return errors;
};

// ============= HELPER: Check if form has errors =============
export const hasErrors = (errors) => {
    return Object.values(errors).some(error => error && error.trim() !== '');
};

// ============= HELPER: Get first error message =============
export const getFirstError = (errors) => {
    const errorValues = Object.values(errors).filter(error => error && error.trim() !== '');
    return errorValues.length > 0 ? errorValues[0] : '';
};
