package org.example.ptcmssbackend.dto.response.Debt;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AgingBucketResponse {
    private BigDecimal bucket0_30;    // 0-30 days
    private BigDecimal bucket31_60;  // 31-60 days
    private BigDecimal bucket61_90;  // 61-90 days
    private BigDecimal bucketOver90; // >90 days
    private BigDecimal total;
}
