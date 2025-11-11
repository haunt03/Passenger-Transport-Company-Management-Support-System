package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Driver.CreateDriverRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverDayOffRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest;
import org.example.ptcmssbackend.dto.response.DriverDashboardResponse;
import org.example.ptcmssbackend.dto.response.DriverProfileResponse;
import org.example.ptcmssbackend.dto.response.DriverScheduleResponse;
import org.example.ptcmssbackend.entity.DriverDayOff;
import org.example.ptcmssbackend.entity.Drivers;
import org.example.ptcmssbackend.entity.TripIncidents;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.DriverRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.TripDriverRepository;
import org.example.ptcmssbackend.service.DriverService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "DRIVER_SERVICE")
@Transactional
public class DriverServiceImpl implements DriverService {

    private final DriverRepository driverRepository;
    private final TripDriverRepository tripDriverRepository;
    private final BranchesRepository branchRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public DriverDashboardResponse getDashboard(Integer driverId) {
        log.info("[DriverDashboard] Fetching dashboard for driver {}", driverId);
        var driverTrips = tripDriverRepository.findAllByDriverId(driverId);
        return driverTrips.stream()
                .filter(td -> td.getTrip().getStatus() == TripStatus.SCHEDULED
                        || td.getTrip().getStatus() == TripStatus.ONGOING)
                .findFirst()
                .map(td -> new DriverDashboardResponse(
                        td.getTrip().getId(),
                        td.getTrip().getStartLocation(),
                        td.getTrip().getEndLocation(),
                        td.getTrip().getStartTime(),
                        td.getTrip().getEndTime(),
                        td.getTrip().getStatus()))
                .orElse(null);
    }

    @Override
    public List<DriverScheduleResponse> getSchedule(Integer driverId) {
        log.info("[DriverSchedule] Loading schedule for driver {}", driverId);
        return tripDriverRepository.findAllByDriverId(driverId).stream()
                .map(td -> new DriverScheduleResponse(
                        td.getTrip().getId(),
                        td.getTrip().getStartLocation(),
                        td.getTrip().getEndLocation(),
                        td.getTrip().getStartTime(),
                        td.getTrip().getStatus()))
                .toList();
    }

    @Override
    public DriverProfileResponse getProfile(Integer driverId) {
        log.info("[DriverProfile] Loading profile for driver {}", driverId);
        var driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        return new DriverProfileResponse(driver);
    }

    @Override
    public DriverProfileResponse getProfileByUserId(Integer userId) {
        log.info("[DriverProfile] Loading profile by userId {}", userId);
        var employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Employee not found for user"));
        var driver = driverRepository.findByEmployee_Id(employee.getId())
                .orElseThrow(() -> new RuntimeException("Driver not found for employee"));
        return new DriverProfileResponse(driver);
    }

    @Override
    public DriverProfileResponse updateProfile(Integer driverId, DriverProfileUpdateRequest request) {
        log.info("[DriverProfile] Updating profile for driver {}", driverId);
        var driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        var user = driver.getEmployee().getUser();

        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getAddress() != null) user.setAddress(request.getAddress());
        if (request.getNote() != null) driver.setNote(request.getNote());
        if (request.getHealthCheckDate() != null) driver.setHealthCheckDate(request.getHealthCheckDate());

        driverRepository.save(driver);
        return new DriverProfileResponse(driver);
    }


}
