package org.example.ptcmssbackend.enums;

public enum TripStatus {
    SCHEDULED,  // Đã lên lịch (chưa phân xe/tài xế)
    ASSIGNED,   // Đã phân xe/tài xế
    ONGOING,    // Đang thực hiện
    COMPLETED,  // Hoàn thành
    CANCELLED   // Hủy bỏ
}
