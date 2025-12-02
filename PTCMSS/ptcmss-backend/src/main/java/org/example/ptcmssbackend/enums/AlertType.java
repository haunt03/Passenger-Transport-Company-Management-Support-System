package org.example.ptcmssbackend.enums;

public enum AlertType {
    VEHICLE_INSPECTION_EXPIRING,    // Xe sắp hết đăng kiểm
    VEHICLE_INSURANCE_EXPIRING,     // Bảo hiểm xe sắp hết hạn
    DRIVER_LICENSE_EXPIRING,        // Bằng lái sắp hết hạn
    DRIVER_HEALTH_CHECK_DUE,        // Sắp đến hạn khám sức khỏe
    SCHEDULE_CONFLICT,              // Xung đột lịch
    DRIVING_HOURS_EXCEEDED,         // Vượt giới hạn giờ lái
    VEHICLE_MAINTENANCE_DUE,        // Sắp đến hạn bảo dưỡng
    DRIVER_REST_REQUIRED,           // Tài xế cần nghỉ ngơi
    REASSIGNMENT_NEEDED             // Cần sắp xếp lại tài xế
}
