package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder(toBuilder = true)
public class PaymentResponse {
    private Integer invoiceId;
    private Integer bookingId;
    private BigDecimal amount;
    private boolean deposit;
    private String paymentMethod;
    private String paymentStatus;
    private String note;
    private Instant createdAt;

    // QR-specific
    private String qrText;
    private String qrImageUrl;
    private Instant expiresAt;
}
