package org.example.ptcmssbackend.dto.request.Invoice;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VoidInvoiceRequest {
    @NotBlank
    private String cancellationReason;

    private Integer cancelledBy;
}
