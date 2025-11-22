package org.example.ptcmssbackend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "payment.qr")
public class QrPaymentProperties {

    /**
     * Base URL to render VietQR image. Default uses img.vietqr.io service.
     */
    private String providerUrl = "https://img.vietqr.io/image";

    /**
     * Bank code according to VietQR (e.g. "mb", "vcb").
     */
    private String bankCode;

    /**
     * Bank account number receiving the payment.
     */
    private String accountNumber;

    /**
     * Account holder name (used for display on QR).
     */
    private String accountName;

    /**
     * Template variant (compact | default | etc.).
     */
    private String template = "compact";

    /**
     * Description prefix used when generating transfer content.
     */
    private String descriptionPrefix = "PTCMSS";

    /**
     * Minutes before the QR request should be considered expired.
     */
    private long expiresInMinutes = 120;
}