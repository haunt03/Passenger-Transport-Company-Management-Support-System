package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class BookingListResponse {
    private Integer id;
    private String customerName;
    private String customerPhone;
    private String routeSummary; // Tóm tắt lịch trình (ví dụ: "HN → HL")
    private Instant startDate; // Ngày đi đầu tiên
    private BigDecimal totalCost;
    private BigDecimal depositAmount; // Tiền cọc cần thu
    private BigDecimal paidAmount;    // Tiền đã thanh toán thực tế
    private Integer vehicleCount;     // Tổng số xe trong booking
    private String status;
    private Boolean isAssigned;       // Tất cả trips đã gán driver + vehicle chưa
    private Instant createdAt;
    private Integer consultantId;
    private String consultantName;
    private Integer branchId;         // ID chi nhánh của booking
    private String branchName;        // Tên chi nhánh của booking
}

