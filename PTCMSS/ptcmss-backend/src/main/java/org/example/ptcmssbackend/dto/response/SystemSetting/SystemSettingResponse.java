package org.example.ptcmssbackend.dto.response.SystemSetting;

import lombok.*;
import org.example.ptcmssbackend.enums.SettingStatus;
import org.example.ptcmssbackend.enums.ValueType;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSettingResponse {
    private Integer id;
    private String settingKey;
    private String settingValue;
    private ValueType valueType;
    private String category;
    private String description;
    private SettingStatus status;
    private String updatedByName;
    private Instant updatedAt;
}
