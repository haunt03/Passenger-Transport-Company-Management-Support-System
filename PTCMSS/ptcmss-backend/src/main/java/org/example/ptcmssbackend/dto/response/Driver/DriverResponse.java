package org.example.ptcmssbackend.dto.response.Driver;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.entity.Drivers;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverResponse {
    private Integer id;
    private String fullName;
    private String branchName;
    private String licenseNumber;
    private String licenseClass;
    private LocalDate licenseExpiry;
    private LocalDate healthCheckDate;
    private Integer priorityLevel;
    private String note;
    private String status;

    public DriverResponse(Drivers driver) {
        this.id = driver.getId();
        this.fullName = driver.getEmployee().getUser().getFullName();
        this.branchName = driver.getBranch().getBranchName();
        this.licenseNumber = driver.getLicenseNumber();
        this.licenseClass = driver.getLicenseClass();
        this.licenseExpiry = driver.getLicenseExpiry();
        this.healthCheckDate = driver.getHealthCheckDate();
        this.priorityLevel = driver.getPriorityLevel();
        this.note = driver.getNote();
        this.status = driver.getStatus().name();
    }
}