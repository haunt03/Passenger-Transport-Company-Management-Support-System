package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePaymentRequest {
    @NotNull
    @Min(0)
    private BigDecimal amount;

    private String paymentMethod; // CASH | BANK_TRANSFER | QR | CREDIT_CARD

    private String confirmationStatus; // PENDING | CONFIRMED | REJECTED (mặc định PENDING, kế toán sẽ xác nhận)

    private Boolean deposit; // true if this is a deposit

    private String note;
}

