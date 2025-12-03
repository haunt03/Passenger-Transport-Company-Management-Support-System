package org.example.ptcmssbackend.dto.response.Invoice;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
public class InvoiceListResponse {
    private Integer invoiceId;
    private String invoiceNumber;
    private Integer branchId;
    private String branchName;
    private Integer customerId;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private Integer bookingId;
    private String type;
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private BigDecimal balance;
    private LocalDate dueDate;
    private String paymentStatus;
    private String status;
    private Instant invoiceDate;
    private Integer daysOverdue;
    private Integer pendingPaymentCount; // Số lượng payment requests đang chờ xác nhận
}

