package org.example.ptcmssbackend.dto.response.Vehicle;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class VehicleExpenseResponse {
    private Integer invoiceId;
    private String costType; // fuel, toll, maintenance, etc.
    private BigDecimal amount;
    private String paymentStatus;
    private String note;
    private Instant invoiceDate;
    private String createdByName;
    private String approvedByName;
    private Instant approvedAt;
}


