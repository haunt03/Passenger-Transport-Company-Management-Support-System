package org.example.ptcmssbackend.enums;

/**
 * Trạng thái xác nhận thanh toán bởi kế toán
 */
public enum PaymentConfirmationStatus {
    PENDING,    // Chờ xác nhận
    CONFIRMED,  // Đã xác nhận (chỉ tính vào tổng thanh toán khi status = CONFIRMED)
    REJECTED    // Từ chối
}

