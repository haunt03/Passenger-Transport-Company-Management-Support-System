package org.example.ptcmssbackend.dto.request.Vehicle;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class VehicleCategoryRequest {
    private String categoryName;
    private String description;
    private BigDecimal baseFare;
    private BigDecimal pricePerKm;
    private BigDecimal highwayFee;
    private BigDecimal fixedCosts;
    private LocalDate effectiveDate;
    private String status; // ACTIVE / INACTIVE
}

