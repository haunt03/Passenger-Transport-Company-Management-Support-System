package org.example.ptcmssbackend.enums;

/**
 * Driver status enum.
 * Coordinator chỉ được phép chuyển tài xế sang ACTIVE hoặc INACTIVE.
 * Các trạng thái khác (ON_TRIP, OFF_DUTY) được cập nhật tự động bởi hệ thống.
 */
public enum DriverStatus {
    ACTIVE,      // Hoạt động - Coordinator có thể chuyển
    AVAILABLE,   // Sẵn sàng (legacy)
    ON_TRIP,     // Đang chạy - Chỉ hệ thống cập nhật
    OFF_DUTY,    // Nghỉ - Chỉ hệ thống cập nhật
    INACTIVE,    // Không hoạt động - Coordinator có thể chuyển

    // Legacy uppercase variants
    ONTRIP
}
