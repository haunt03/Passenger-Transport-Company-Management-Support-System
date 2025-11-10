package org.example.ptcmssbackend.service;


import org.example.ptcmssbackend.dto.response.DriverDashboardResponse;
import org.example.ptcmssbackend.dto.response.DriverScheduleResponse;

import java.util.List;

public interface DriverService {
    DriverDashboardResponse getDashboard(Integer driverId);
    List<DriverScheduleResponse> getSchedule(Integer driverId);

}
