package org.example.ptcmssbackend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Branch Performance Comparison DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchComparisonDTO {

    private Integer branchId;
    private String branchName;
    private String location;

    // Financial metrics
    private BigDecimal revenue;
    private BigDecimal expense;
    private BigDecimal netProfit;

    // Operational metrics
    private Integer totalBookings;
    private Integer totalTrips;
    private Integer completedTrips;

    // Resource metrics
    private Integer totalVehicles;
    private Integer vehiclesInUse;
    private Double vehicleUtilizationRate;

    private Integer totalDrivers;
    private Integer driversOnTrip;
    private Double driverUtilizationRate;
}