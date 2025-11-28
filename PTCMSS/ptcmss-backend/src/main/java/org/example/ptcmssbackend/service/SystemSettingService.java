package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.SystemSetting.SystemSettingRequest;
import org.example.ptcmssbackend.dto.response.SystemSetting.SystemSettingResponse;

import java.util.List;

public interface SystemSettingService {
    List<SystemSettingResponse> getAll();
    SystemSettingResponse getById(Integer id);
    SystemSettingResponse getByKey(String settingKey);
    SystemSettingResponse create(SystemSettingRequest request);
    SystemSettingResponse update(Integer id, SystemSettingRequest request);
    void delete(Integer id);
}