package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateBookingRequest {
    // Thông tin khách hàng
    @Valid
    @NotNull(message = "Thông tin khách hàng không được để trống")
    private CustomerRequest customer;

    // Thông tin booking
    @NotNull(message = "ID chi nhánh không được để trống")
    private Integer branchId;

    private Integer hireTypeId; // Optional

    private Boolean useHighway; // Optional, mặc định false

    // Thông tin chuyến đi
    @Valid
    private List<TripRequest> trips; // Có thể có nhiều chuyến (ví dụ: đi và về)

    // Chi tiết loại xe
    @Valid
    @NotNull(message = "Danh sách loại xe không được để trống")
    private List<VehicleDetailRequest> vehicles;

    // Báo giá
    private BigDecimal estimatedCost; // Giá hệ thống tính (tự động)
    private BigDecimal discountAmount; // Giảm giá (nếu có)
    private BigDecimal totalCost; // Giá cuối cùng (estimatedCost - discountAmount)
    private BigDecimal depositAmount; // Tiền cọc

    // Trạng thái
    private String status; // PENDING, CONFIRMED, etc.

    @Size(max = 255, message = "Ghi chú không được quá 255 ký tự")
    private String note;

    // Distance (km) - để tính giá tự động
    private Double distance; // Khoảng cách (km) - dùng để tính pricePerKm * distance
}
