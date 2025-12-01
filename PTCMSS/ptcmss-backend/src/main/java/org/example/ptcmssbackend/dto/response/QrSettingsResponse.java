package org.example.ptcmssbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrSettingsResponse {

    private String bankCode;
    private String accountNumber;
    private String accountName;
    private String descriptionPrefix;
    private Instant updatedAt;
    private String updatedBy;
    private String source; // "database" or "config"
}
