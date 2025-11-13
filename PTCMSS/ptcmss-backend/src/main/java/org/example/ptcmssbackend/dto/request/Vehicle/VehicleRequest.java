package org.example.ptcmssbackend.dto.request.Vehicle;


import lombok.Data;

import java.time.LocalDate;

@Data
public class VehicleRequest {
    private Integer categoryId;        // ID loại xe
    private Integer branchId;          // ID chi nhánh
    private String licensePlate;       // Biển số
    private String model;              // Hãng xe / Mẫu
    private String brand;              // Hãng sản xuất
    private Integer capacity;          // Dung tích
    private Integer productionYear;    // Năm sản xuất
    private LocalDate registrationDate; // Ngày đăng ký
    private LocalDate inspectionExpiry; // Ngày hết hạn đăng kiểm
    private LocalDate insuranceExpiry;  // Ngày bảo hiểm TNDS hết hạn
    private Long odometer;              // Quãng đường đã chạy (km)
    private String status;             // Trạng thái (AVAILABLE, IN_USE, MAINTENANCE)
}
