package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.QrSettingsUpdateRequest;
import org.example.ptcmssbackend.dto.response.QrSettingsResponse;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.entity.AppSetting;
import org.example.ptcmssbackend.service.AppSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Settings", description = "Admin-only API for managing application settings")
public class AdminSettingsController {

    private final AppSettingService appSettingService;

    @GetMapping("/qr")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get QR payment settings", description = "Get current QR payment configuration (Admin only)")
    public ResponseEntity<ApiResponse<QrSettingsResponse>> getQrSettings() {
        try {
            Map<String, String> settings = appSettingService.getQrSettings();
            
            // Get metadata from DB if exists
            AppSetting bankCodeSetting = appSettingService.getAllSettings().stream()
                    .filter(s -> s.getKey().equals(AppSettingService.QR_BANK_CODE))
                    .findFirst()
                    .orElse(null);
            
            // Get username from Employee if exists
            String updatedByUsername = null;
            if (bankCodeSetting != null && bankCodeSetting.getUpdatedBy() != null) {
                updatedByUsername = bankCodeSetting.getUpdatedBy().getUser() != null 
                        ? bankCodeSetting.getUpdatedBy().getUser().getUsername() 
                        : null;
            }
            
            QrSettingsResponse response = QrSettingsResponse.builder()
                    .bankCode(settings.get(AppSettingService.QR_BANK_CODE))
                    .accountNumber(settings.get(AppSettingService.QR_ACCOUNT_NUMBER))
                    .accountName(settings.get(AppSettingService.QR_ACCOUNT_NAME))
                    .descriptionPrefix(settings.get(AppSettingService.QR_DESCRIPTION_PREFIX))
                    .updatedAt(bankCodeSetting != null ? bankCodeSetting.getUpdatedAt() : null)
                    .updatedBy(updatedByUsername)
                    .source(bankCodeSetting != null ? "database" : "config")
                    .build();
            
            ApiResponse<QrSettingsResponse> apiResponse = ApiResponse.<QrSettingsResponse>builder()
                    .success(true)
                    .message("Lấy cấu hình QR thành công")
                    .data(response)
                    .build();
            
            return ResponseEntity.ok(apiResponse);
        } catch (Exception e) {
            log.error("Error getting QR settings", e);
            ApiResponse<QrSettingsResponse> apiResponse = ApiResponse.<QrSettingsResponse>builder()
                    .success(false)
                    .message("Không thể tải cấu hình QR: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.internalServerError().body(apiResponse);
        }
    }

    @PutMapping("/qr")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update QR payment settings", description = "Update QR payment configuration (Admin only)")
    public ResponseEntity<ApiResponse<QrSettingsResponse>> updateQrSettings(
            @Valid @RequestBody QrSettingsUpdateRequest request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            
            // Validate and update settings
            Map<String, String> settingsMap = new HashMap<>();
            settingsMap.put(AppSettingService.QR_BANK_CODE, request.getBankCode());
            settingsMap.put(AppSettingService.QR_ACCOUNT_NUMBER, request.getAccountNumber());
            settingsMap.put(AppSettingService.QR_ACCOUNT_NAME, request.getAccountName());
            settingsMap.put(AppSettingService.QR_DESCRIPTION_PREFIX, 
                    request.getDescriptionPrefix() != null ? request.getDescriptionPrefix() : "PTCMSS");
            
            appSettingService.updateSettings(settingsMap, username);
            
            // Return updated settings
            QrSettingsResponse response = QrSettingsResponse.builder()
                    .bankCode(request.getBankCode())
                    .accountNumber(request.getAccountNumber())
                    .accountName(request.getAccountName())
                    .descriptionPrefix(request.getDescriptionPrefix())
                    .updatedAt(Instant.now())
                    .updatedBy(username)
                    .source("database")
                    .build();
            
            log.info("Admin {} updated QR settings", username);
            
            ApiResponse<QrSettingsResponse> apiResponse = ApiResponse.<QrSettingsResponse>builder()
                    .success(true)
                    .message("Cập nhật cấu hình QR thành công")
                    .data(response)
                    .build();
            
            return ResponseEntity.ok(apiResponse);
        } catch (Exception e) {
            log.error("Error updating QR settings", e);
            ApiResponse<QrSettingsResponse> apiResponse = ApiResponse.<QrSettingsResponse>builder()
                    .success(false)
                    .message("Không thể cập nhật cấu hình QR: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.badRequest().body(apiResponse);
        }
    }
}
