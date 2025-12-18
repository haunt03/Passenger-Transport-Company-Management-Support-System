package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Driver.CreateDriverRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverDayOffRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest;
import org.example.ptcmssbackend.dto.response.Driver.*;

import java.util.List;

public interface DriverService {
    DriverDashboardResponse getDashboard(Integer driverId);
    List<DriverScheduleResponse> getSchedule(Integer driverId, java.time.Instant startDate, java.time.Instant endDate);
    DriverProfileResponse getProfile(Integer driverId);
    DriverProfileResponse getProfileByUserId(Integer userId);
    DriverProfileResponse updateProfile(Integer driverId, DriverProfileUpdateRequest request);
    DriverDayOffResponse requestDayOff(Integer driverId, DriverDayOffRequest request);
    List<DriverDayOffResponse> getDayOffHistory(Integer driverId);
    void cancelDayOffRequest(Integer dayOffId, Integer driverId);
    Integer startTrip(Integer tripId, Integer driverId);
    Integer completeTrip(Integer tripId, Integer driverId);
    TripIncidentResponse reportIncident(ReportIncidentRequest request);
    DriverResponse createDriver(CreateDriverRequest request);
    List<DriverResponse> getDriversByBranchId(Integer branchId);

}
