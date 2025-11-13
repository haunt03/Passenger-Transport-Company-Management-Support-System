package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Driver.CreateDriverRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverDayOffRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest;
import org.example.ptcmssbackend.dto.response.Driver.*;
import org.example.ptcmssbackend.entity.DriverDayOff;
import org.example.ptcmssbackend.entity.Drivers;
import org.example.ptcmssbackend.entity.TripIncidents;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
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
    private final TripRepository tripRepository;
    private final TripDriverRepository tripDriverRepository;
    private final DriverDayOffRepository driverDayOffRepository;
    private final TripIncidentRepository tripIncidentRepository;
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
        var driver = driverRepository.findByEmployee_Id(employee.getEmployeeId())
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

    @Override
    public DriverDayOffResponse requestDayOff(Integer driverId, DriverDayOffRequest request) {
        log.info("[DriverDayOff] Request day off for driver {}", driverId);
        var driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        var dayOff = new DriverDayOff();
        dayOff.setDriver(driver);
        dayOff.setStartDate(request.getStartDate());
        dayOff.setEndDate(request.getEndDate());
        dayOff.setReason(request.getReason());
        dayOff.setStatus(DriverDayOffStatus.Pending);

        var saved = driverDayOffRepository.save(dayOff);
        return new DriverDayOffResponse(saved);
    }

    @Override
    public Integer startTrip(Integer tripId, Integer driverId) {
        log.info("[Trip] Driver {} started trip {}", driverId, tripId);
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        trip.setStatus(TripStatus.ONGOING);
        trip.setStartTime(Instant.now());
        tripRepository.save(trip);

        return tripId;
    }

    @Override
    public Integer completeTrip(Integer tripId, Integer driverId) {
        log.info("[Trip] Driver {} completed trip {}", driverId, tripId);
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        trip.setStatus(TripStatus.COMPLETED);
        trip.setEndTime(Instant.now());
        tripRepository.save(trip);

        return tripId;
    }

    @Override
    public TripIncidentResponse reportIncident(ReportIncidentRequest request) {
        log.info("[TripIncident] Driver reports issue for trip {}: {}", request.getTripId(), request.getDescription());

        var trip = tripRepository.findById(request.getTripId())
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        var driver = driverRepository.findById(request.getDriverId())
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        var incident = new TripIncidents();
        incident.setTrip(trip);
        incident.setDriver(driver);
        incident.setDescription(request.getDescription());
        incident.setSeverity(request.getSeverity());
        incident.setResolved(false);

        var saved = tripIncidentRepository.save(incident);

        return new TripIncidentResponse(saved);
    }

    @Override
    public List<DriverDayOffResponse> getDayOffHistory(Integer driverId) {
        log.info("[DriverDayOff] Loading day off history for driver {}", driverId);
        return driverDayOffRepository.findByDriver_Id(driverId).stream()
                .map(DriverDayOffResponse::new)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt())) // Mới nhất trước
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Transactional
    public DriverResponse createDriver(CreateDriverRequest request) {

        log.info("[DriverService] Creating new driver for employeeId={}, branchId={}",
                request.getEmployeeId(), request.getBranchId());

        var branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        var employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (driverRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new RuntimeException("Driver with this license number already exists");
        }

        var driver = new Drivers();
        driver.setEmployee(employee);
        driver.setBranch(branch);
        driver.setLicenseNumber(request.getLicenseNumber());
        driver.setLicenseClass(request.getLicenseClass());
        driver.setLicenseExpiry(request.getLicenseExpiry());
        driver.setHealthCheckDate(request.getHealthCheckDate());
        driver.setPriorityLevel(request.getPriorityLevel());
        driver.setNote(request.getNote());

        var saved = driverRepository.save(driver);
        return new DriverResponse(saved);
    }
}