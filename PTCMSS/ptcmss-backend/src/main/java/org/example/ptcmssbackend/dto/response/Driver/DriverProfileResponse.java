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
    private String email;
    private String phone;
    private String address;
    private String branchName;
    private String licenseNumber;
    private String licenseClass;
    private LocalDate licenseExpiry;
    private DriverStatus status;
    private String note;
    private LocalDate healthCheckDate;

    // Thống kê
    private Long totalTrips; // Tổng số chuyến đã hoàn thành
    private Double totalKm; // Tổng km (tùy chọn, có thể null nếu không có dữ liệu)

    public DriverProfileResponse(Drivers driver) {
        this.driverId = driver.getId();
        this.fullName = driver.getEmployee().getUser().getFullName();
        this.email = driver.getEmployee().getUser().getEmail();
        this.phone = driver.getEmployee().getUser().getPhone();
        this.address = driver.getEmployee().getUser().getAddress();
        this.branchName = driver.getBranch().getBranchName();
        this.licenseNumber = driver.getLicenseNumber();
        this.licenseClass = driver.getLicenseClass();
        this.licenseExpiry = driver.getLicenseExpiry();
        this.status = driver.getStatus();
        this.note = driver.getNote();
        this.healthCheckDate = driver.getHealthCheckDate();
        // Thống kê sẽ được set từ service
        this.totalTrips = 0L;
        this.totalKm = null; // Chưa có dữ liệu km trong database
    }
}

