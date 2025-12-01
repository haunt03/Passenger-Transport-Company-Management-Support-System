package org.example.ptcmssbackend.dto.response.Invoice;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
public class PaymentHistoryResponse {
    private Integer paymentId;
    private Integer invoiceId;
    private Instant paymentDate;
    private BigDecimal amount;
    private String paymentMethod;
    private String confirmationStatus; // PENDING | CONFIRMED | REJECTED

    // Bank transfer info
    private String bankName;
    private String bankAccount;
    private String referenceNumber;

    // Cash info
    private String cashierName;
    private String receiptNumber;

    private String note;
    private String createdByName;
    private Instant createdAt;

    // Invoice context (for pending payments list)
    private String invoiceNumber;
    private String customerName;
    private Integer bookingId;
    private String bookingCode;
}

