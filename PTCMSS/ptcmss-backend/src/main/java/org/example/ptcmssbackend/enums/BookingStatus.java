package org.example.ptcmssbackend.enums;

public enum BookingStatus {
    DRAFT,             // Lưu nháp (chưa hoàn thiện, chưa gửi khách)
    PENDING,           // Chờ báo giá / Chờ xử lý
    QUOTATION_SENT,    // Đã gửi báo giá (chờ khách xác nhận)
    CONFIRMED,         // Khách đã đồng ý (chờ điều phối)
    ASSIGNED,          // Đã phân xe (đã gán tài xế/xe)
    INPROGRESS,       // Đang thực hiện
    COMPLETED,         // Hoàn thành
    CANCELLED          // Hủy bỏ
}
