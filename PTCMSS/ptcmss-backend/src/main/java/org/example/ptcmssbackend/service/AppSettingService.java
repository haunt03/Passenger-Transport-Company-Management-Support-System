package org.example.ptcmssbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.config.QrPaymentProperties;
import org.example.ptcmssbackend.entity.AppSetting;
import org.example.ptcmssbackend.repository.AppSettingRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppSettingService {

    private final AppSettingRepository appSettingRepository;
    private final QrPaymentProperties qrPaymentProperties;

    // QR Setting keys
    public static final String QR_BANK_CODE = "qr.bank_code";
    public static final String QR_ACCOUNT_NUMBER = "qr.account_number";
    public static final String QR_ACCOUNT_NAME = "qr.account_name";
    public static final String QR_DESCRIPTION_PREFIX = "qr.description_prefix";

    /**
     * Get setting value by key. Uses cache with 60 second TTL.
     * Falls back to QrPaymentProperties if not found in DB.
     */
    @Cacheable(value = "appSettings", key = "#key", unless = "#result == null")
    public String getValue(String key) {
        return appSettingRepository.findByKey(key)
                .map(AppSetting::getValue)
                .filter(StringUtils::hasText)
                .orElseGet(() -> getFallbackValue(key));
    }

    /**
     * Get all QR-related settings as a map.
     */
    public Map<String, String> getQrSettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put(QR_BANK_CODE, getValue(QR_BANK_CODE));
        settings.put(QR_ACCOUNT_NUMBER, getValue(QR_ACCOUNT_NUMBER));
        settings.put(QR_ACCOUNT_NAME, getValue(QR_ACCOUNT_NAME));
        settings.put(QR_DESCRIPTION_PREFIX, getValue(QR_DESCRIPTION_PREFIX));
        return settings;
    }

    /**
     * Update a setting value. Clears cache.
     */
    @Transactional
    @CacheEvict(value = "appSettings", key = "#key")
    public void setValue(String key, String value, String updatedBy) {
        AppSetting setting = appSettingRepository.findByKey(key)
                .orElse(new AppSetting());

        setting.setKey(key);
        setting.setValue(value);
        setting.setUpdatedBy(updatedBy);

        // Set description for new settings
        if (setting.getId() == null) {
            setting.setDescription(getDescriptionForKey(key));
        }

        appSettingRepository.save(setting);
        log.info("Updated setting: {} = {} by {}", key, value, updatedBy);
    }

    /**
     * Bulk update settings. Clears entire cache.
     */
    @Transactional
    @CacheEvict(value = "appSettings", allEntries = true)
    public void updateSettings(Map<String, String> settings, String updatedBy) {
        settings.forEach((key, value) -> {
            AppSetting setting = appSettingRepository.findByKey(key)
                    .orElse(new AppSetting());

            setting.setKey(key);
            setting.setValue(value);
            setting.setUpdatedBy(updatedBy);

            if (setting.getId() == null) {
                setting.setDescription(getDescriptionForKey(key));
            }

            appSettingRepository.save(setting);
        });
        log.info("Bulk updated {} settings by {}", settings.size(), updatedBy);
    }

    /**
     * Get all settings (for admin view).
     */
    public List<AppSetting> getAllSettings() {
        return appSettingRepository.findAll();
    }

    /**
     * Fallback to application.yml properties when DB value not found.
     */
    private String getFallbackValue(String key) {
        return switch (key) {
            case QR_BANK_CODE -> qrPaymentProperties.getBankCode();
            case QR_ACCOUNT_NUMBER -> qrPaymentProperties.getAccountNumber();
            case QR_ACCOUNT_NAME -> qrPaymentProperties.getAccountName();
            case QR_DESCRIPTION_PREFIX -> qrPaymentProperties.getDescriptionPrefix();
            default -> null;
        };
    }

    /**
     * Get description for setting key.
     */
    private String getDescriptionForKey(String key) {
        return switch (key) {
            case QR_BANK_CODE -> "Mã ngân hàng theo chuẩn VietQR (vd: 970403 cho Sacombank)";
            case QR_ACCOUNT_NUMBER -> "Số tài khoản ngân hàng nhận thanh toán";
            case QR_ACCOUNT_NAME -> "Tên chủ tài khoản (hiển thị trên QR)";
            case QR_DESCRIPTION_PREFIX -> "Tiền tố nội dung chuyển khoản (vd: PTCMSS)";
            default -> "";
        };
    }
}
