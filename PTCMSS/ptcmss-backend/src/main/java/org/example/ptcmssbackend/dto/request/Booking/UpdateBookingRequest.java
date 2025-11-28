package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class UpdateBookingRequest {
    // Thông tin khách hàng (có thể cập nhật)
    @Valid
    private CustomerRequest customer;

    // Thông tin booking
    private Integer branchId;
    private Integer hireTypeId;
    private Boolean useHighway;

    private Boolean isHoliday; // Có phải ngày lễ không

    private Boolean isWeekend; // Có phải cuối tuần không

    private Integer additionalPickupPoints; // Số điểm đón thêm

    private Integer additionalDropoffPoints; // Số điểm trả thêm

    // Thông tin chuyến đi
    @Valid
    private List<TripRequest> trips;

    // Chi tiết loại xe
    @Valid
    private List<VehicleDetailRequest> vehicles;

    // Báo giá
    private BigDecimal estimatedCost;
    private BigDecimal discountAmount;
    private BigDecimal totalCost;
    private BigDecimal depositAmount;

    // Trạng thái
    private String status;

    @Size(max = 255, message = "Ghi chú không được quá 255 ký tự")
    private String note;

    // Distance (km)
    private Double distance;
}
