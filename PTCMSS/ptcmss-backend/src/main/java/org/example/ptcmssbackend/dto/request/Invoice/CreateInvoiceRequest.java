package org.example.ptcmssbackend.dto.request.Invoice;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateInvoiceRequest {
    @NotNull
    private Integer branchId;

    private Integer bookingId;

    private Integer customerId;

    @NotNull
    private String type; // INCOME, EXPENSE

    private String costType; // For expense: fuel, toll, maintenance, etc.

    private Boolean isDeposit = false;

    @NotNull
    @Min(0)
    private BigDecimal amount;

    private BigDecimal subtotal;

    private BigDecimal vatAmount;

    private String paymentMethod; // CASH, BANK_TRANSFER, QR, CREDIT_CARD

    private String paymentTerms = "NET_7"; // NET_7, NET_14, NET_30, NET_60

    private LocalDate dueDate;

    // Bank transfer info
    private String bankName;
    private String bankAccount;
    private String referenceNumber;

    // Cash info
    private String cashierName;
    private String receiptNumber;

    private String note;

    private Integer createdBy;
}
