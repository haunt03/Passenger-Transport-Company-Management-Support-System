package org.example.ptcmssbackend.dto.response.expense;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ExpenseRequestResponse {
    private Integer id;
    private String type;
    private BigDecimal amount;
    private String note;
    private String status;
    private Integer branchId;
    private String branchName;
    private Integer vehicleId;
    private String vehiclePlate;
    private Integer requesterUserId;
    private String requesterName;
    private Instant createdAt;
    private List<String> receiptImages; // List of image URLs
}
