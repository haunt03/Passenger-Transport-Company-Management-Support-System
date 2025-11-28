package org.example.ptcmssbackend.dto.request.Invoice;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RecordPaymentRequest {
    @NotNull
    @Min(0)
    private BigDecimal amount;

    @NotNull
    private String paymentMethod; // CASH, BANK_TRANSFER, QR, CREDIT_CARD

    private String confirmationStatus; // PENDING | CONFIRMED | REJECTED (mặc định PENDING, kế toán sẽ xác nhận)

    // Bank transfer info (required if paymentMethod = BANK_TRANSFER)
    private String bankName;
    private String bankAccount;
    private String referenceNumber;

    // Cash info (required if paymentMethod = CASH)
    private String cashierName;
    private String receiptNumber;

    private String note;

    private Integer createdBy;
}
