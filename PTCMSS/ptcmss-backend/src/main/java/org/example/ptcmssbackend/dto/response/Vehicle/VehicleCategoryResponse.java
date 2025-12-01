package org.example.ptcmssbackend.dto.response.Vehicle;

import lombok.Builder;
import lombok.Data;
import org.example.ptcmssbackend.enums.VehicleCategoryStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class VehicleCategoryResponse {
    private Integer id;
    private String categoryName;
    private Integer seats;
    private Integer vehiclesCount;
    private String description;
    private BigDecimal baseFare;
    private BigDecimal pricePerKm;
    private BigDecimal highwayFee;
    private BigDecimal fixedCosts;
    private BigDecimal sameDayFixedPrice;
    private Boolean isPremium;
    private BigDecimal premiumSurcharge;
    private LocalDate effectiveDate;
    private VehicleCategoryStatus status;
}

