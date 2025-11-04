package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.SystemSettingRequest;
import org.example.ptcmssbackend.dto.response.SystemSettingResponse;

import java.util.List;

public interface SystemSettingService {
    List<SystemSettingResponse> getAll();
    SystemSettingResponse getById(Integer id);
    SystemSettingResponse create(SystemSettingRequest request);
    SystemSettingResponse update(Integer id, SystemSettingRequest request);
    void delete(Integer id);
}
