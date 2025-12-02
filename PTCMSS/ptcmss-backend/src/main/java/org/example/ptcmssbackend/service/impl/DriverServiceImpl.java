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
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.DriverStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.ApprovalService;
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
    private final ApprovalService approvalService;
    private final DriverRatingsRepository driverRatingsRepository;

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
                .map(td -> {
                    var trip = td.getTrip();
                    // Lấy rating nếu có
                    var ratingOpt = driverRatingsRepository.findByTrip_Id(trip.getId());
                    var rating = ratingOpt.map(r -> r.getOverallRating()).orElse(null);
                    var ratingComment = ratingOpt.map(r -> r.getComment()).orElse(null);

                    return DriverScheduleResponse.builder()
                            .tripId(trip.getId())
                            .startLocation(trip.getStartLocation())
                            .endLocation(trip.getEndLocation())
                            .startTime(trip.getStartTime())
                            .endTime(trip.getEndTime())
                            .status(trip.getStatus())
                            .rating(rating)
                            .ratingComment(ratingComment)
                            .build();
                })
                .toList();
    }

    @Override
    public DriverProfileResponse getProfile(Integer driverId) {
        log.info("[DriverProfile] Loading profile for driver {}", driverId);
        var driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài xế"));

        DriverProfileResponse response = new DriverProfileResponse(driver);

        // Tính thống kê: Tổng số chuyến đã hoàn thành
        long totalTrips = tripDriverRepository.findAllByDriverId(driverId).stream()
                .filter(td -> td.getTrip().getStatus() != null &&
                        td.getTrip()
                                .getStatus()
                                .name()
                                .equals("COMPLETED"))
                .count();
        response.setTotalTrips(totalTrips);
        response.setTotalKm(null);
        return response;
    }

    @Override
    public DriverProfileResponse getProfileByUserId(Integer userId) {
        log.info("[DriverProfile] Loading profile by userId {}", userId);
        var employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên cho người dùng này"));
        var driver = driverRepository.findByEmployee_EmployeeId(employee.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài xế cho nhân viên này"));

        // Sử dụng getProfile để có thống kê
        return getProfile(driver.getId());
    }

    @Override
    public DriverProfileResponse updateProfile(Integer driverId, DriverProfileUpdateRequest request) {
        log.info("[DriverProfile] Updating profile for driver {}", driverId);
        var driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài xế"));
        var user = driver.getEmployee().getUser();

        // Cập nhật thông tin user
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getAddress() != null) user.setAddress(request.getAddress());

        // Cập nhật thông tin driver
        if (request.getNote() != null) driver.setNote(request.getNote());
        if (request.getHealthCheckDate() != null) driver.setHealthCheckDate(request.getHealthCheckDate());
        if (request.getLicenseClass() != null) driver.setLicenseClass(request.getLicenseClass());
        if (request.getLicenseExpiry() != null) driver.setLicenseExpiry(request.getLicenseExpiry());
        if (request.getStatus() != null) {
            try {
                org.example.ptcmssbackend.enums.DriverStatus newStatus =
                        org.example.ptcmssbackend.enums.DriverStatus.valueOf(request.getStatus());

                // VALIDATION: Kiểm tra quyền của user hiện tại
                org.springframework.security.core.Authentication auth =
                        org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                boolean isCoordinator = auth != null && auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_COORDINATOR"));

                // Coordinator chỉ được chuyển tài xế sang ACTIVE hoặc INACTIVE
                if (isCoordinator) {
                    if (newStatus != org.example.ptcmssbackend.enums.DriverStatus.ACTIVE &&
                            newStatus != org.example.ptcmssbackend.enums.DriverStatus.INACTIVE) {
                        throw new RuntimeException("Điều phối viên chỉ được phép chuyển tài xế sang trạng thái 'Hoạt động' (ACTIVE) hoặc 'Không hoạt động' (INACTIVE).");
                    }
                    // Coordinator không được thay đổi trạng thái nếu tài xế đang ON_TRIP
                    if (driver.getStatus() == org.example.ptcmssbackend.enums.DriverStatus.ON_TRIP) {
                        throw new RuntimeException("Không thể thay đổi trạng thái khi tài xế đang trong chuyến đi.");
                    }
                }

                log.info("[DriverProfile] Updating driver {} status from {} to {}", driverId, driver.getStatus(), newStatus);
                driver.setStatus(newStatus);
            } catch (IllegalArgumentException e) {
                log.warn("[DriverProfile] Invalid status value: {}", request.getStatus());
                throw new RuntimeException("Trạng thái không hợp lệ: " + request.getStatus());
            }
        }

        driverRepository.save(driver);
        return new DriverProfileResponse(driver);
    }

    @Override
    public DriverDayOffResponse requestDayOff(Integer driverId, DriverDayOffRequest request) {
        log.info("[DriverDayOff] Request day off for driver {}", driverId);
        var driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài xế"));

        var dayOff = new DriverDayOff();
        dayOff.setDriver(driver);
        dayOff.setStartDate(request.getStartDate());
        dayOff.setEndDate(request.getEndDate());
        dayOff.setReason(request.getReason());
        dayOff.setStatus(DriverDayOffStatus.PENDING);

        var saved = driverDayOffRepository.save(dayOff);

        // Tạo approval request để điều phối viên duyệt
        try {
            var user = driver.getEmployee().getUser();
            var branch = driver.getBranch();
            approvalService.createApprovalRequest(
                    ApprovalType.DRIVER_DAY_OFF,
                    saved.getId(),
                    user,
                    request.getReason(),
                    branch
            );
            log.info("[DriverDayOff] Created approval request for day off {}", saved.getId());
        } catch (Exception e) {
            log.error("[DriverDayOff] Failed to create approval request: {}", e.getMessage());
        }

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
    @Transactional
    public void cancelDayOffRequest(Integer dayOffId, Integer driverId) {
        log.info("[DriverDayOff] Driver {} cancelling day off request {}", driverId, dayOffId);

        DriverDayOff dayOff = driverDayOffRepository.findById(dayOffId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu nghỉ phép"));

        // Kiểm tra quyền: chỉ tài xế tạo yêu cầu mới được hủy
        if (!dayOff.getDriver().getId().equals(driverId)) {
            throw new RuntimeException("Bạn không có quyền hủy yêu cầu này");
        }

        // Chỉ cho phép hủy yêu cầu đang PENDING hoặc APPROVED
        if (dayOff.getStatus() == DriverDayOffStatus.REJECTED) {
            throw new RuntimeException("Không thể hủy yêu cầu đã bị từ chối");
        }

        if (dayOff.getStatus() == DriverDayOffStatus.CANCELLED) {
            throw new RuntimeException("Yêu cầu đã được hủy trước đó");
        }

        // Cập nhật trạng thái
        dayOff.setStatus(DriverDayOffStatus.CANCELLED);
        driverDayOffRepository.save(dayOff);

        // Cập nhật trạng thái tài xế về ACTIVE nếu đang OFF_DUTY
        Drivers driver = dayOff.getDriver();
        if (driver.getStatus() == DriverStatus.OFF_DUTY) {
            driver.setStatus(DriverStatus.ACTIVE);
            driverRepository.save(driver);
            log.info("[DriverDayOff] Driver {} status changed from OFF_DUTY to ACTIVE", driverId);
        }

        log.info("[DriverDayOff] Day off request {} cancelled successfully", dayOffId);
    }

    @Override
    public Integer startTrip(Integer tripId, Integer driverId) {
        log.info("[Trip] Driver {} started trip {}", driverId, tripId);
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi"));

        // check driver có được gán không
        if (!tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)) {
            throw new RuntimeException("Tài xế không được phân công cho chuyến đi này");
        }

        // chỉ cho start từ trạng thái SCHEDULED
        if (trip.getStatus() != TripStatus.SCHEDULED) {
            throw new RuntimeException("Chuyến đi không ở trạng thái ĐÃ LÊN LỊCH");
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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi"));

        if (!tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)) {
            throw new RuntimeException("Tài xế không được phân công cho chuyến đi này");
        }

        if (trip.getStatus() != TripStatus.ONGOING) {
            throw new RuntimeException("Chuyến đi không ở trạng thái ĐANG THỰC HIỆN");
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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi"));
        var driver = driverRepository.findById(request.getDriverId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài xế"));

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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh"));

        var employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên"));

        if (driverRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new RuntimeException("Tài xế với số giấy phép này đã tồn tại");
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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh"));
        return driverRepository.findAllByBranchId(branchId);
    }
}
