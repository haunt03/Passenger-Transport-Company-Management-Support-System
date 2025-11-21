package org.example.ptcmssbackend.dto.response.Driver;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.entity.Drivers;
import org.example.ptcmssbackend.enums.DriverStatus;

import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DriverProfileResponse {
    private Integer driverId;
    private String fullName;
    private String branchName;
    private String licenseNumber;
    private String licenseClass;
    private LocalDate licenseExpiry;
    private DriverStatus status;

    // Thống kê
    private Long totalTrips; // Tổng số chuyến đã hoàn thành
    private Double totalKm; // Tổng km (tùy chọn, có thể null nếu không có dữ liệu)

    public DriverProfileResponse(Drivers driver) {
        this.driverId = driver.getId();
        this.fullName = driver.getEmployee().getUser().getFullName();
        this.branchName = driver.getBranch().getBranchName();
        this.licenseNumber = driver.getLicenseNumber();
        this.licenseClass = driver.getLicenseClass();
        this.licenseExpiry = driver.getLicenseExpiry();
        this.status = driver.getStatus();
        // Thống kê sẽ được set từ service
        this.totalTrips = 0L;
        this.totalKm = null; // Chưa có dữ liệu km trong database
    }
}

