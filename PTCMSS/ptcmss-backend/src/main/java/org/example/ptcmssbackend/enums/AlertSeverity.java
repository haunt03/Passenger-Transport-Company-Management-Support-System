package org.example.ptcmssbackend.enums;

public enum AlertSeverity {
    LOW,        // Thông tin, không cần xử lý gấp
    MEDIUM,     // Cần chú ý, xử lý trong vài ngày
    HIGH,       // Quan trọng, cần xử lý sớm
    CRITICAL    // Khẩn cấp, cần xử lý ngay
}
