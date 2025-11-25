package org.example.ptcmssbackend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Admin Dashboard Response DTO
 * Module 7: Reporting & Analytics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    // KPIs
    private BigDecimal totalRevenue;
    private BigDecimal totalExpense;
    private BigDecimal netProfit;
    private Integer totalTrips;
    private Integer completedTrips;
    private Integer ongoingTrips;
    private Integer scheduledTrips;
    private Double fleetUtilization; // Percentage (0-100)

    // Vehicle stats
    private Integer totalVehicles;
    private Integer vehiclesInUse;
    private Integer vehiclesAvailable;
    private Integer vehiclesMaintenance;

    // Driver stats
    private Integer totalDrivers;
    private Integer driversOnTrip;
    private Integer driversAvailable;

    // Trend indicators (% change from previous period)
    private Double revenueChangePct;
    private Double expenseChangePct;
    private Double tripChangePct;

    // Period info
    private String period;
    private String periodStart;
    private String periodEnd;
}