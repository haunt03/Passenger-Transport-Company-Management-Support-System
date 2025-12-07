package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.SystemSetting.SystemSettingRequest;
import org.example.ptcmssbackend.dto.response.SystemSetting.SystemSettingResponse;
import org.example.ptcmssbackend.entity.SystemSetting;
import org.example.ptcmssbackend.enums.SettingStatus;
import org.example.ptcmssbackend.enums.ValueType;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.SystemSettingRepository;
import org.example.ptcmssbackend.service.impl.SystemSettingServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SystemSettingServiceImplTest {

    @Mock
    private SystemSettingRepository systemSettingRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private SystemSettingServiceImpl systemSettingService;

    // ==================== getAll() Tests ====================

    @Test
    void getAll_whenSettingsExist_shouldReturnAllSettings() {
        // Given
        SystemSetting setting1 = createTestSetting(1, "KEY1", "Value1", SettingStatus.ACTIVE);
        SystemSetting setting2 = createTestSetting(2, "KEY2", "Value2", SettingStatus.ACTIVE);

        when(systemSettingRepository.findAll()).thenReturn(List.of(setting1, setting2));

        // When
        List<SystemSettingResponse> result = systemSettingService.getAll();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSettingKey()).isEqualTo("KEY1");
        assertThat(result.get(1).getSettingKey()).isEqualTo("KEY2");
        verify(systemSettingRepository).findAll();
    }

    @Test
    void getAll_whenNoSettings_shouldReturnEmptyList() {
        // Given
        when(systemSettingRepository.findAll()).thenReturn(List.of());

        // When
        List<SystemSettingResponse> result = systemSettingService.getAll();

        // Then
        assertThat(result).isEmpty();
        verify(systemSettingRepository).findAll();
    }

    // ==================== getById() Tests ====================

    @Test
    void getById_whenSettingExists_shouldReturnSetting() {
        // Given
        Integer id = 1;
        SystemSetting setting = createTestSetting(id, "KEY1", "Value1", SettingStatus.ACTIVE);

        when(systemSettingRepository.findById(id)).thenReturn(Optional.of(setting));

        // When
        SystemSettingResponse result = systemSettingService.getById(id);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(id);
        assertThat(result.getSettingKey()).isEqualTo("KEY1");
        assertThat(result.getSettingValue()).isEqualTo("Value1");
        verify(systemSettingRepository).findById(id);
    }

    @Test
    void getById_whenSettingNotFound_shouldThrowException() {
        // Given
        Integer id = 999;

        when(systemSettingRepository.findById(id)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> systemSettingService.getById(id))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy cài đặt hệ thống");
    }

    // ==================== getByKey() Tests ====================

    @Test
    void getByKey_whenActiveSettingExists_shouldReturnSetting() {
        // Given
        String key = "APP_NAME";
        SystemSetting setting = createTestSetting(1, key, "My App", SettingStatus.ACTIVE);

        when(systemSettingRepository.findBySettingKeyAndStatus(key, SettingStatus.ACTIVE))
                .thenReturn(Optional.of(setting));

        // When
        SystemSettingResponse result = systemSettingService.getByKey(key);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getSettingKey()).isEqualTo(key);
        assertThat(result.getSettingValue()).isEqualTo("My App");
        verify(systemSettingRepository).findBySettingKeyAndStatus(key, SettingStatus.ACTIVE);
    }

    @Test
    void getByKey_whenSettingNotFound_shouldReturnNull() {
        // Given
        String key = "NONEXISTENT";

        when(systemSettingRepository.findBySettingKeyAndStatus(key, SettingStatus.ACTIVE))
                .thenReturn(Optional.empty());

        // When
        SystemSettingResponse result = systemSettingService.getByKey(key);

        // Then
        assertThat(result).isNull();
    }

    // ==================== create() Tests ====================

    @Test
    void create_whenValidRequest_shouldCreateSetting() {
        // Given
        SystemSettingRequest request = new SystemSettingRequest();
        request.setSettingKey("NEW_KEY");
        request.setSettingValue("New Value");
        request.setDescription("New setting");
        request.setValueType(ValueType.STRING);
        request.setCategory("GENERAL");
        request.setStatus(SettingStatus.ACTIVE);

        SystemSetting savedSetting = createTestSetting(1, "NEW_KEY", "New Value", SettingStatus.ACTIVE);
        savedSetting.setDescription("New setting");
        savedSetting.setValueType(ValueType.STRING);
        savedSetting.setCategory("GENERAL");

        when(systemSettingRepository.existsBySettingKey("NEW_KEY")).thenReturn(false);
        when(systemSettingRepository.save(any(SystemSetting.class))).thenReturn(savedSetting);

        // When
        SystemSettingResponse result = systemSettingService.create(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getSettingKey()).isEqualTo("NEW_KEY");
        assertThat(result.getSettingValue()).isEqualTo("New Value");
        verify(systemSettingRepository).existsBySettingKey("NEW_KEY");
        verify(systemSettingRepository).save(any(SystemSetting.class));
    }

    @Test
    void create_whenKeyExists_shouldThrowException() {
        // Given
        SystemSettingRequest request = new SystemSettingRequest();
        request.setSettingKey("EXISTING_KEY");

        when(systemSettingRepository.existsBySettingKey("EXISTING_KEY")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> systemSettingService.create(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Khóa cài đặt đã tồn tại");
        verify(systemSettingRepository, never()).save(any(SystemSetting.class));
    }

    @Test
    void create_whenNoStatusProvided_shouldSetDefaultActive() {
        // Given
        SystemSettingRequest request = new SystemSettingRequest();
        request.setSettingKey("NEW_KEY");
        request.setSettingValue("Value");
        request.setStatus(null); // Không set status

        SystemSetting savedSetting = createTestSetting(1, "NEW_KEY", "Value", SettingStatus.ACTIVE);

        when(systemSettingRepository.existsBySettingKey("NEW_KEY")).thenReturn(false);
        when(systemSettingRepository.save(any(SystemSetting.class))).thenReturn(savedSetting);

        // When
        SystemSettingResponse result = systemSettingService.create(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(SettingStatus.ACTIVE);
        verify(systemSettingRepository).save(any(SystemSetting.class));
    }

    // ==================== update() Tests ====================

    @Test
    void update_whenValidRequest_shouldUpdateSetting() {
        // Given
        Integer id = 1;
        SystemSettingRequest request = new SystemSettingRequest();
        request.setSettingKey("UPDATED_KEY");
        request.setSettingValue("Updated Value");
        request.setDescription("Updated description");
        request.setStatus(SettingStatus.INACTIVE);

        SystemSetting existingSetting = createTestSetting(id, "OLD_KEY", "Old Value", SettingStatus.ACTIVE);

        when(systemSettingRepository.findById(id)).thenReturn(Optional.of(existingSetting));
        when(systemSettingRepository.save(any(SystemSetting.class))).thenReturn(existingSetting);

        // When
        SystemSettingResponse result = systemSettingService.update(id, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(existingSetting.getSettingKey()).isEqualTo("UPDATED_KEY");
        assertThat(existingSetting.getSettingValue()).isEqualTo("Updated Value");
        assertThat(existingSetting.getStatus()).isEqualTo(SettingStatus.INACTIVE);
        verify(systemSettingRepository).findById(id);
        verify(systemSettingRepository).save(existingSetting);
    }

    @Test
    void update_whenSettingNotFound_shouldThrowException() {
        // Given
        Integer id = 999;
        SystemSettingRequest request = new SystemSettingRequest();

        when(systemSettingRepository.findById(id)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> systemSettingService.update(id, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy cài đặt hệ thống");
        verify(systemSettingRepository, never()).save(any(SystemSetting.class));
    }

    // ==================== delete() Tests ====================

    @Test
    void delete_whenSettingExists_shouldDeleteSetting() {
        // Given
        Integer id = 1;

        when(systemSettingRepository.existsById(id)).thenReturn(true);
        doNothing().when(systemSettingRepository).deleteById(id);

        // When
        systemSettingService.delete(id);

        // Then
        verify(systemSettingRepository).existsById(id);
        verify(systemSettingRepository).deleteById(id);
    }

    @Test
    void delete_whenSettingNotFound_shouldThrowException() {
        // Given
        Integer id = 999;

        when(systemSettingRepository.existsById(id)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> systemSettingService.delete(id))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy cài đặt hệ thống");
        verify(systemSettingRepository, never()).deleteById(anyInt());
    }

    // ==================== Helper Methods ====================

    private SystemSetting createTestSetting(Integer id, String key, String value, SettingStatus status) {
        SystemSetting setting = SystemSetting.builder()
                .id(id)
                .settingKey(key)
                .settingValue(value)
                .status(status)
                .effectiveStartDate(LocalDate.now())
                .build();
        return setting;
    }
}

