package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class QRCodeResponse {
    private Integer bookingId;
    private BigDecimal amount;
    private String currency; // "VND"
    private String description; // Nội dung chuyển khoản
    private String qrImageBase64; // Base64 encoded PNG image
    private BankAccountInfo bankAccount;
    private Instant expiresAt; // QR code hết hạn sau 24h

    @Data
    @Builder
    public static class BankAccountInfo {
        private String bankCode; // Mã ngân hàng (ví dụ: "970418" cho VCB)
        private String accountNumber; // Số tài khoản
        private String accountName; // Tên chủ tài khoản
    }
}
