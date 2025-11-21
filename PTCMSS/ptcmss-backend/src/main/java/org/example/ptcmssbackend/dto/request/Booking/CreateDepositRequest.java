package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateDepositRequest {
    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    private String paymentMethod; // "BANK_TRANSFER", "CASH", "CARD", etc.

    private String note; // Ghi chú (ví dụ: "Chuyển khoản từ VCB", "Mã giao dịch: 123456")

    private String referenceCode; // Mã tham chiếu giao dịch (nếu có)
}
