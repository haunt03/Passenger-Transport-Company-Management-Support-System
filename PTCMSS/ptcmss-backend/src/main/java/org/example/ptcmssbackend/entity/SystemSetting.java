package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.example.ptcmssbackend.enums.SettingStatus;
import org.example.ptcmssbackend.enums.ValueType;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "SystemSettings")  // Match với tên bảng trong DB (camelCase)
public class SystemSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "settingId", nullable = false)
    private Integer id;

    @Size(max = 100)
    @NotNull
    @Column(name = "settingKey", nullable = false, length = 100)
    private String settingKey;

    @Size(max = 255)
    @NotNull
    @Column(name = "settingValue", nullable = false)
    private String settingValue;

    @NotNull
    @Column(name = "effectiveStartDate", nullable = false)
    private LocalDate effectiveStartDate;

    @Column(name = "effectiveEndDate")
    private LocalDate effectiveEndDate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "valueType", nullable = false)
    @Builder.Default
    private ValueType valueType = ValueType.STRING;

    @Size(max = 100)
    @Column(name = "category", length = 100)
    private String category;

    @Size(max = 255)
    @Column(name = "description")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updatedBy")
    private Employees updatedBy;

    @UpdateTimestamp
    @Column(name = "updatedAt")
    private Instant updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private SettingStatus status = SettingStatus.ACTIVE;

}