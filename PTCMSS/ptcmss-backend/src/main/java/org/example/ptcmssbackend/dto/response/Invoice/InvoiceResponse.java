package org.example.ptcmssbackend.dto.response.Invoice;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
public class InvoiceResponse {
    private Integer invoiceId;
    private String invoiceNumber;
    private Integer branchId;
    private String branchName;
    private Integer bookingId;
    private Integer customerId;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String type; // INCOME, EXPENSE
    private String costType;
    private Boolean isDeposit;
    private BigDecimal amount;
    private BigDecimal subtotal;
    private BigDecimal vatAmount;
    private String paymentMethod;
    private String paymentStatus; // UNPAID, PAID, REFUNDED, OVERDUE
    private String status; // ACTIVE, CANCELLED
    private String paymentTerms;
    private LocalDate dueDate;
    private Instant invoiceDate;
    private Instant createdAt;

    // Payment info
    private String bankName;
    private String bankAccount;
    private String referenceNumber;
    private String cashierName;
    private String receiptNumber;

    // Balance
    private BigDecimal paidAmount;
    private BigDecimal balance;
    private Integer daysOverdue;

    // Pending payment requests (for accountant to confirm)
    private Integer pendingPaymentCount;

    // Debt management
    private LocalDate promiseToPayDate;
    private String debtLabel;
    private String contactNote;

    // Cancellation
    private Instant cancelledAt;
    private String cancellationReason;

    // Sending
    private Instant sentAt;
    private String sentToEmail;

    private String note;
    private String img;
}

