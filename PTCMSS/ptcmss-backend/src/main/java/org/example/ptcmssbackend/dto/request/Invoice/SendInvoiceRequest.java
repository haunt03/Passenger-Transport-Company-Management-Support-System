package org.example.ptcmssbackend.dto.request.Invoice;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendInvoiceRequest {
    @NotBlank
    @Email
    private String email;

    private String message;
}
