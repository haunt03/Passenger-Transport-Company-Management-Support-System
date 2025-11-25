package org.example.ptcmssbackend.dto.request.Accounting;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ExpenseReportRequest {
    private Integer branchId;
    private Integer vehicleId;
    private Integer driverId;
    private String expenseType; // fuel, toll, maintenance, salary, etc.
    private LocalDate startDate;
    private LocalDate endDate;
}

