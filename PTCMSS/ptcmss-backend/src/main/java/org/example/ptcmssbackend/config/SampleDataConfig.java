package org.example.ptcmssbackend.config;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.entity.SystemSetting;
import org.example.ptcmssbackend.enums.SettingStatus;
import org.example.ptcmssbackend.enums.ValueType; // Import Enum
import org.example.ptcmssbackend.repository.SystemSettingRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List; // Import List

@Configuration
@RequiredArgsConstructor
public class SampleDataConfig {

//    private final SystemSettingRepository repo;
//
//    @Bean
//    CommandLineRunner seed() {
//        return args -> {
//            // Chỉ seed khi database chưa có setting nào
//            if (repo.count() == 0) {
//
//                // 1. Tạo các đối tượng setting
//                SystemSetting siteName = SystemSetting.builder()
//                        .settingKey("site_name")
//                        .settingValue("PTCMSS - PassengerTransportCompanyManagementSupportedSystem")
//                        .valueType(ValueType.STRING)
//                        .category("General")
//                        .description("Tên của hệ thống")
//                        .status(SettingStatus.ACTIVE)
//                        .build();
//
//                SystemSetting maintenanceMode = SystemSetting.builder()
//                        .settingKey("maintenance_mode")
//                        .settingValue("false")
//                        .valueType(ValueType.BOOLEAN)
//                        .category("General")
//                        .description("Bật/tắt chế độ bảo trì website")
//                        .status(SettingStatus.ACTIVE)
//                        .build();
//
//                SystemSetting hotline = SystemSetting.builder()
//                        .settingKey("hotline")
//                        .settingValue("1900 1234")
//                        .valueType(ValueType.STRING)
//                        .category("Contact")
//                        .description("Số điện thoại hỗ trợ")
//                        .status(SettingStatus.ACTIVE)
//                        .build();
//
//                // 2. Lưu tất cả vào database
//                repo.saveAll(List.of(siteName, maintenanceMode, hotline));
//
//                System.out.println("Đã seed 3 system settings vào database.");
//            }
//        };
//    }
}