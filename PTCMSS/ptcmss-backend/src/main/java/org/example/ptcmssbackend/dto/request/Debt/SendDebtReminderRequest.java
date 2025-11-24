package org.example.ptcmssbackend.dto.request.Debt;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendDebtReminderRequest {
    @NotBlank
    private String reminderType; // EMAIL, SMS, PHONE

    private String recipient; // Email or phone number

    private String message;

    private Integer sentBy;
}
