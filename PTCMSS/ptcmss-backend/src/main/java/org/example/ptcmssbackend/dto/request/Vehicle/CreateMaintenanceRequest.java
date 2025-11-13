package org.example.ptcmssbackend.dto.request.Vehicle;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateMaintenanceRequest {
    @NotNull(message = "Số tiền không được để trống")
    @Positive(message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;
    
    private String paymentMethod;
    private String note;
}

