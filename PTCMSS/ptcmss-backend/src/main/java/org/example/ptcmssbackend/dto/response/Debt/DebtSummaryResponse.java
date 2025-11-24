package org.example.ptcmssbackend.dto.response.Debt;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
public class DebtSummaryResponse {
    private Integer invoiceId;
    private String invoiceNumber;
    private Integer customerId;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private Integer bookingId;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal balance;
    private LocalDate dueDate;
    private Integer daysOverdue;
    private String paymentStatus;
    private LocalDate promiseToPayDate;
    private String debtLabel;
    private String contactNote;
    private Instant lastReminderDate;
}
