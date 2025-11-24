package org.example.ptcmssbackend.dto.response.Debt;

import lombok.Data;

import java.time.Instant;

@Data
public class DebtReminderHistoryResponse {
    private Integer reminderId;
    private Integer invoiceId;
    private Instant reminderDate;
    private String reminderType; // EMAIL, SMS, PHONE
    private String recipient;
    private String message;
    private String sentByName;
    private Instant createdAt;
}
