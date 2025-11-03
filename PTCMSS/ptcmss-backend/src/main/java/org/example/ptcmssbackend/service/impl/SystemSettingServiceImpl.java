package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.SystemSettingRequest;
import org.example.ptcmssbackend.dto.SystemSettingResponse;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.SystemSetting;
import org.example.ptcmssbackend.enums.SettingStatus;
import org.example.ptcmssbackend.repository.SystemSettingRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.service.SystemSettingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class SystemSettingServiceImpl implements SystemSettingService {

    private final SystemSettingRepository systemSettingRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public List<SystemSettingResponse> getAll() {
        return systemSettingRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public SystemSettingResponse getById(Integer id) {
        SystemSetting setting = systemSettingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SystemSetting not found"));
        return mapToResponse(setting);
    }

    @Override
    public SystemSettingResponse create(SystemSettingRequest request) {
        if (systemSettingRepository.existsBySettingKey(request.getSettingKey())) {
            throw new RuntimeException("Setting key already exists");
        }

        Employees updater = null;
        if (request.getUpdatedById() != null) {
            updater = employeeRepository.findById(request.getUpdatedById())
                    .orElse(null);
        }

        SystemSetting setting = SystemSetting.builder()
                .settingKey(request.getSettingKey())
                .settingValue(request.getSettingValue())
                .valueType(request.getValueType())
                .category(request.getCategory())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : SettingStatus.ACTIVE)
                .updatedBy(updater)
                .build();

        SystemSetting saved = systemSettingRepository.save(setting);
        return mapToResponse(saved);
    }

    @Override
    public SystemSettingResponse update(Integer id, SystemSettingRequest request) {
        SystemSetting setting = systemSettingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SystemSetting not found"));

        Employees updater = null;
        if (request.getUpdatedById() != null) {
            updater = employeeRepository.findById(request.getUpdatedById())
                    .orElse(null);
        }

        setting.setSettingKey(request.getSettingKey());
        setting.setSettingValue(request.getSettingValue());
        setting.setValueType(request.getValueType());
        setting.setCategory(request.getCategory());
        setting.setDescription(request.getDescription());
        setting.setStatus(request.getStatus());
        setting.setUpdatedBy(updater);

        SystemSetting updated = systemSettingRepository.save(setting);
        return mapToResponse(updated);
    }

    @Override
    public void delete(Integer id) {
        if (!systemSettingRepository.existsById(id)) {
            throw new RuntimeException("SystemSetting not found");
        }
        systemSettingRepository.deleteById(id);
    }

    private SystemSettingResponse mapToResponse(SystemSetting entity) {
        return SystemSettingResponse.builder()
                .id(entity.getId())
                .settingKey(entity.getSettingKey())
                .settingValue(entity.getSettingValue())
                .valueType(entity.getValueType())
                .category(entity.getCategory())
                .description(entity.getDescription())
                .status(entity.getStatus())
                .updatedByName(entity.getUpdatedBy() != null && entity.getUpdatedBy().getUser() != null
                        ? entity.getUpdatedBy().getUser().getFullName()
                        : null)
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
