package org.example.ptcmssbackend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Revenue Trend DTO for charts
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueTrendDTO {

    private String month; // Format: "2025-01"
    private BigDecimal revenue;
    private BigDecimal expense;
    private BigDecimal netProfit;
    private Integer tripCount;
}