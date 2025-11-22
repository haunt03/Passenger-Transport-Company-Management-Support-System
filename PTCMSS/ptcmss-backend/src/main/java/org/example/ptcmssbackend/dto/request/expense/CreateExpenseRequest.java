package org.example.ptcmssbackend.dto.request.expense;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateExpenseRequest {
    @NotBlank(message = "Loai chi phi khong duoc de trong")
    private String type;

    private Integer vehicleId;

    @NotNull(message = "So tien khong duoc de trong")
    @Positive(message = "So tien phai lon hon 0")
    private BigDecimal amount;

    private String note;

    @NotNull(message = "Chi nhanh khong duoc de trong")
    private Integer branchId;

    private Integer requesterUserId;
}
