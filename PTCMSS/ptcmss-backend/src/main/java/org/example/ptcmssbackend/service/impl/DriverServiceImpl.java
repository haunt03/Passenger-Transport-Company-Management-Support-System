package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Driver.CreateDriverRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverDayOffRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest;
import org.example.ptcmssbackend.dto.response.Driver.DriverDashboardResponse;
import org.example.ptcmssbackend.dto.response.Driver.DriverDayOffResponse;
import org.example.ptcmssbackend.dto.response.Driver.DriverProfileResponse;
import org.example.ptcmssbackend.dto.response.Driver.DriverResponse;
import org.example.ptcmssbackend.dto.response.Driver.DriverScheduleResponse;
import org.example.ptcmssbackend.dto.response.Driver.TripIncidentResponse;
import org.example.ptcmssbackend.entity.DriverDayOff;
import org.example.ptcmssbackend.entity.Drivers;
import org.example.ptcmssbackend.entity.TripDrivers;
import org.example.ptcmssbackend.entity.TripIncidents;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.DriverService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

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
    @Transactional(readOnly = true)
    public DriverDashboardResponse getDashboard(Integer driverId) {
        log.info("[DriverDashboard] Fetching dashboard for driver {}", driverId);
        var driverTrips = tripDriverRepository.findAllByDriverId(driverId);
        return driverTrips.stream()
                .filter(td -> td.getTrip().getStatus() == TripStatus.SCHEDULED
                        || td.getTrip().getStatus() == TripStatus.ONGOING)
                .findFirst()
                .map(td -> {
                    var trip = td.getTrip();
                    log.info("[DriverDashboard] Trip ID: {}, Distance: {}", trip.getId(), trip.getDistance());

                    var booking = trip.getBooking();
                    log.info("[DriverDashboard] Booking: {}", booking != null ? booking.getId() : "null");

                    var customer = booking != null ? booking.getCustomer() : null;
                    var customerName = customer != null ? customer.getFullName() : null;
                    var customerPhone = customer != null ? customer.getPhone() : null;
                    log.info("[DriverDashboard] Customer: {} - {}", customerName, customerPhone);

                    return new DriverDashboardResponse(
                            trip.getId(),
                            trip.getStartLocation(),
                            trip.getEndLocation(),
                            trip.getStartTime(),
                            trip.getEndTime(),
                            trip.getStatus(),
                            customerName,
                            customerPhone,
                            trip.getDistance()
                    );
                })
                .orElse(null);
    }

    @Override
    public List<DriverScheduleResponse> getSchedule(Integer driverId, java.time.Instant startDate, java.time.Instant endDate) {
        log.info("[DriverSchedule] Loading schedule for driver {} from {} to {}", driverId, startDate, endDate);
        List<TripDrivers> trips;
        if (startDate != null || endDate != null) {
            trips = tripDriverRepository.findAllByDriverIdAndDateRange(driverId, startDate, endDate);
        } else {
            trips = tripDriverRepository.findAllByDriverId(driverId);
        }
        return trips.stream()
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

        DriverProfileResponse response = new DriverProfileResponse(driver);

        // Tính thống kê: Tổng số chuyến đã hoàn thành
        long totalTrips = tripDriverRepository.findAllByDriverId(driverId).stream()
                .filter(td -> td.getTrip().getStatus() != null &&
                        td.getTrip().getStatus().name().equals("COMPLETED"))
                .count();
        response.setTotalTrips(totalTrips);

        // TODO: Tính tổng km nếu có dữ liệu khoảng cách trong database
        // Hiện tại database không có trường distance/km trong Trips
        response.setTotalKm(null);

        return response;
    }

    @Override
    public DriverProfileResponse getProfileByUserId(Integer userId) {
        log.info("[DriverProfile] Loading profile by userId {}", userId);
        var employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Employee not found for user"));
        var driver = driverRepository.findByEmployee_EmployeeId(employee.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Driver not found for employee"));

        // Sử dụng getProfile để có thống kê
        return getProfile(driver.getId());
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
        dayOff.setStatus(DriverDayOffStatus.PENDING);

        var saved = driverDayOffRepository.save(dayOff);
        return new DriverDayOffResponse(saved);
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
    public Integer startTrip(Integer tripId, Integer driverId) {
        log.info("[Trip] Driver {} started trip {}", driverId, tripId);
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        // check driver có được gán không
        if (!tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)) {
            throw new RuntimeException("Driver is not assigned to this trip");
        }

        // chỉ cho start từ trạng thái SCHEDULED
        if (trip.getStatus() != TripStatus.SCHEDULED) {
            throw new RuntimeException("Trip is not in SCHEDULED status");
        }

        trip.setStatus(TripStatus.ONGOING);
        if (trip.getStartTime() == null) {
            trip.setStartTime(Instant.now());
        }
        tripRepository.save(trip);
        return tripId;
    }

    @Override
    public Integer completeTrip(Integer tripId, Integer driverId) {
        log.info("[Trip] Driver {} completed trip {}", driverId, tripId);
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        if (!tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)) {
            throw new RuntimeException("Driver is not assigned to this trip");
        }

        if (trip.getStatus() != TripStatus.ONGOING) {
            throw new RuntimeException("Trip is not in ONGOING status");
        }

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

    @Override
    public List<DriverResponse> getDriversByBranchId(Integer branchId) {
        log.info("[Driver] Get drivers by branch {}", branchId);

        var branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        return driverRepository.findAllByBranchId(branchId);
    }
}
