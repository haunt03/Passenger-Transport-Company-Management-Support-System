package org.example.ptcmssbackend.service;


import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.response.DriverDashboardResponse;
import org.example.ptcmssbackend.dto.response.DriverProfileResponse;
import org.example.ptcmssbackend.dto.response.DriverScheduleResponse;

import java.util.List;

public interface DriverService {
    DriverDashboardResponse getDashboard(Integer driverId);
    List<DriverScheduleResponse> getSchedule(Integer driverId);
    DriverProfileResponse getProfile(Integer driverId);
    DriverProfileResponse getProfileByUserId(Integer userId);
    DriverProfileResponse updateProfile(Integer driverId, DriverProfileUpdateRequest request);

}
