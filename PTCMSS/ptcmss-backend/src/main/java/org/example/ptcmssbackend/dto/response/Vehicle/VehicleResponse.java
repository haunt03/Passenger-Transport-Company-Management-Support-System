package org.example.ptcmssbackend.dto.response.Vehicle;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class VehicleResponse {
    private Integer id;
    private String licensePlate;
    private String model;
    private String brand;
    private Integer capacity;
    private Integer productionYear;
    private String categoryName;
    private Integer categoryId;
    private String branchName;
    private Integer branchId;
    private LocalDate registrationDate;
    private LocalDate inspectionExpiry;
    private LocalDate insuranceExpiry;
    private Long odometer;
    private String status;
}

