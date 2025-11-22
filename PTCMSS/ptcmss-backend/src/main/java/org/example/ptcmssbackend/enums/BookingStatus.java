package org.example.ptcmssbackend.enums;

public enum BookingStatus {
    PENDING,           // Chờ báo giá (Lưu nháp)
    QUOTATION_SENT,    // Đã gửi báo giá (chờ khách xác nhận)
    CONFIRMED,         // Khách đã đồng ý (chờ điều phối)
    INPROGRESS,       // Đang thực hiện
    COMPLETED,         // Hoàn thành
    CANCELLED          // Hủy bỏ
}