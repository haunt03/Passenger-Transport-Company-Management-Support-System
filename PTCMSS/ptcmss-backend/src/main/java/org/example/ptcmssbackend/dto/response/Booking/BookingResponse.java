package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class BookingResponse {
    private Integer id;
    private CustomerResponse customer;
    private Integer branchId;
    private String branchName;
    private Integer consultantId;
    private String consultantName;
    private Integer hireTypeId;
    private String hireTypeName;
    private Boolean useHighway;
    private Instant bookingDate;
    private BigDecimal estimatedCost;
    private BigDecimal discountAmount;
    private BigDecimal totalCost;
    private BigDecimal depositAmount;
    private String status;
    private String note;
    private Instant createdAt;
    private Instant updatedAt;

    // Chi tiết
    private List<TripResponse> trips;
    private List<VehicleDetailResponse> vehicles;

    // Thông tin thanh toán
    private BigDecimal paidAmount; // Tổng đã thanh toán
    private BigDecimal remainingAmount; // Còn lại
}
