package org.example.ptcmssbackend.dto.response.Driver;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.enums.TripStatus;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DriverDashboardResponse {
    private Integer tripId;
    private String startLocation;
    private String endLocation;
    private Instant startTime;
    private Instant endTime;
    private TripStatus status;
    private String customerName;
    private String customerPhone;
    private BigDecimal distance; // km
    private String driverName; // Tên tài xế
    private String driverPhone; // SĐT tài xế
    private String vehiclePlate; // Biển số xe
    private String vehicleModel; // Model xe
    private BigDecimal totalCost; // Tổng giá trị đơn hàng
    private BigDecimal paidAmount; // Đã thanh toán
    private BigDecimal remainingAmount; // Còn lại

}

