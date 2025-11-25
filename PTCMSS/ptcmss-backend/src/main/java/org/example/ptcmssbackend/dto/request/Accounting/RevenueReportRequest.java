package org.example.ptcmssbackend.dto.request.Accounting;

import lombok.Data;

import java.time.LocalDate;

@Data
public class RevenueReportRequest {
    private Integer branchId;
    private Integer customerId;
    private LocalDate startDate;
    private LocalDate endDate;
    private String period; // TODAY, 7D, 30D, MONTH, QUARTER, YTD
}

