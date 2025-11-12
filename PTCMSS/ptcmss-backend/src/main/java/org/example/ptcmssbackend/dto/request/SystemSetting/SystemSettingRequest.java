package org.example.ptcmssbackend.dto.request.SystemSetting;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.example.ptcmssbackend.enums.SettingStatus;
import org.example.ptcmssbackend.enums.ValueType;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSettingRequest {

    private Integer id; // dùng cho update

    @NotNull
    @Size(max = 100)
    private String settingKey;

    @NotNull
    @Size(max = 255)
    private String settingValue;

    @NotNull
    private LocalDate effectiveStartDate;

    private LocalDate effectiveEndDate;

    @NotNull
    private ValueType valueType;

    private String category;
    private String description;
    private SettingStatus status;
    private Integer updatedById; // ID của Employee cập nhật
}
