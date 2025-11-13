package org.example.ptcmssbackend.dto.request.Vehicle;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateExpenseRequest {
    @NotNull(message = "Loại chi phí không được để trống")
    private String costType; // fuel, toll, repair, etc.
    
    @NotNull(message = "Số tiền không được để trống")
    @Positive(message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;
    
    private String paymentMethod;
    private String note;
    
    private Integer bookingId; // Optional: link với booking nếu có
}

