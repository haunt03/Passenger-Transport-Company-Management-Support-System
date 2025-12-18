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
import org.example.ptcmssbackend.entity.Bookings;
import org.example.ptcmssbackend.entity.DriverDayOff;
import org.example.ptcmssbackend.entity.Drivers;
import org.example.ptcmssbackend.entity.TripDrivers;
import org.example.ptcmssbackend.entity.TripIncidents;
import org.example.ptcmssbackend.entity.Trips;
import org.example.ptcmssbackend.entity.TripVehicles;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.DriverStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.ApprovalService;
import org.example.ptcmssbackend.service.DriverService;
import org.example.ptcmssbackend.service.WebSocketNotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "DRIVER_SERVICE")
@Transactional
public class DriverServiceImpl implements DriverService {

    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final TripDriverRepository tripDriverRepository;
    private final TripVehicleRepository tripVehicleRepository;
    private final DriverDayOffRepository driverDayOffRepository;
    private final TripIncidentRepository tripIncidentRepository;
    private final BranchesRepository branchRepository;
    private final EmployeeRepository employeeRepository;
    private final BookingRepository bookingRepository;
    private final ApprovalService approvalService;
    private final DriverRatingsRepository driverRatingsRepository;
    private final org.example.ptcmssbackend.service.GraphHopperService graphHopperService;
    private final org.example.ptcmssbackend.repository.InvoiceRepository invoiceRepository;
    private final WebSocketNotificationService webSocketNotificationService;

    @Override
    @Transactional(readOnly = true)
    public DriverDashboardResponse getDashboard(Integer driverId) {
        log.info("[DriverDashboard] Fetching dashboard for driver {}", driverId);
        var driverTrips = tripDriverRepository.findAllByDriverId(driverId);
        
        // Lấy ngày hôm nay để ưu tiên chuyến hôm nay
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        
        return driverTrips.stream()
                .filter(td -> {
                    TripStatus status = td.getTrip().getStatus();
                    // Bao gồm SCHEDULED, ASSIGNED (đã phân xe), và ONGOING
                    return status == TripStatus.SCHEDULED 
                            || status == TripStatus.ASSIGNED 
                            || status == TripStatus.ONGOING;
                })
                .sorted((td1, td2) -> {
                    // Ưu tiên: 1) Chuyến hôm nay, 2) Chuyến sớm nhất
                    var trip1 = td1.getTrip();
                    var trip2 = td2.getTrip();
                    
                    Instant start1 = trip1.getStartTime();
                    Instant start2 = trip2.getStartTime();
                    
                    if (start1 == null && start2 == null) return 0;
                    if (start1 == null) return 1;
                    if (start2 == null) return -1;
                    
                    LocalDate date1 = start1.atZone(ZoneId.systemDefault()).toLocalDate();
                    LocalDate date2 = start2.atZone(ZoneId.systemDefault()).toLocalDate();
                    
                    boolean isToday1 = date1.equals(today);
                    boolean isToday2 = date2.equals(today);
                    
                    // Ưu tiên chuyến hôm nay
                    if (isToday1 && !isToday2) return -1;
                    if (!isToday1 && isToday2) return 1;
                    
                    // Nếu cùng ngày hoặc cả hai không phải hôm nay, sắp xếp theo thời gian
                    return start1.compareTo(start2);
                })
                .findFirst()
                .map(td -> {
                    var trip = td.getTrip();
                    log.info("[DriverDashboard] Trip ID: {}, Status: {}, StartTime: {}", 
                            trip.getId(), trip.getStatus(), trip.getStartTime());
                    
                    var booking = trip.getBooking();
                    log.info("[DriverDashboard] Booking: {}", booking != null ? booking.getId() : "null");
                    
                    var customer = booking != null ? booking.getCustomer() : null;
                    var customerName = customer != null ? customer.getFullName() : null;
                    var customerPhone = customer != null ? customer.getPhone() : null;
                    log.info("[DriverDashboard] Customer: {} - {}", customerName, customerPhone);
                    
                    // Lấy thông tin driver và vehicle
                    String driverName = null;
                    String driverPhone = null;
                    String vehiclePlate = null;
                    String vehicleModel = null;
                    
                    List<TripDrivers> tripDrivers = tripDriverRepository.findByTripId(trip.getId());
                    if (!tripDrivers.isEmpty()) {
                        Drivers driver = tripDrivers.get(0).getDriver();
                        if (driver != null && driver.getEmployee() != null && driver.getEmployee().getUser() != null) {
                            driverName = driver.getEmployee().getUser().getFullName();
                            driverPhone = driver.getEmployee().getUser().getPhone();
                        }
                    }
                    
                    List<TripVehicles> tripVehicles = tripVehicleRepository.findByTripId(trip.getId());
                    if (!tripVehicles.isEmpty()) {
                        Vehicles vehicle = tripVehicles.get(0).getVehicle();
                        if (vehicle != null) {
                            vehiclePlate = vehicle.getLicensePlate();
                            vehicleModel = vehicle.getModel();
                        }
                    }
                    
                    // Lấy thông tin giá tiền từ booking (giống như BookingService)
                    java.math.BigDecimal totalCost = booking != null && booking.getTotalCost() != null 
                            ? booking.getTotalCost() 
                            : java.math.BigDecimal.ZERO;
                    java.math.BigDecimal paidAmount = java.math.BigDecimal.ZERO;
                    java.math.BigDecimal remainingAmount = totalCost;
                    
                    if (booking != null) {
                        // Tính paidAmount từ payment_history đã CONFIRMED (giống BookingService)
                        paidAmount = invoiceRepository.calculateConfirmedPaidAmountByBookingId(booking.getId());
                        if (paidAmount == null) paidAmount = java.math.BigDecimal.ZERO;
                        remainingAmount = totalCost.subtract(paidAmount);
                        if (remainingAmount.compareTo(java.math.BigDecimal.ZERO) < 0) {
                            remainingAmount = java.math.BigDecimal.ZERO;
                        }
                    }
                    
                    // Lấy distance từ trip, nếu null thì tìm từ trips khác trong cùng booking
                    java.math.BigDecimal distance = trip.getDistance();
                    if (distance == null && booking != null) {
                        // Tìm trip khác trong cùng booking có distance
                        List<Trips> allTrips = tripRepository.findByBooking_Id(booking.getId());
                        for (Trips otherTrip : allTrips) {
                            if (otherTrip.getDistance() != null && otherTrip.getDistance().compareTo(java.math.BigDecimal.ZERO) > 0) {
                                distance = otherTrip.getDistance();
                                log.info("[DriverDashboard] Using distance from trip {} for trip {}: {} km", 
                                        otherTrip.getId(), trip.getId(), distance);
                                break;
                            }
                        }
                        
                        // Nếu vẫn không có, tính từ startLocation và endLocation
                        if (distance == null && trip.getStartLocation() != null && trip.getEndLocation() != null) {
                            try {
                                var distanceResult = graphHopperService.calculateDistance(
                                        trip.getStartLocation(), 
                                        trip.getEndLocation()
                                );
                                if (distanceResult != null && distanceResult.getDistanceKm() != null) {
                                    distance = java.math.BigDecimal.valueOf(distanceResult.getDistanceKm());
                                    log.info("[DriverDashboard] Calculated distance for trip {}: {} km", trip.getId(), distance);
                                    
                                    // Lưu distance vào trip để dùng lần sau
                                    trip.setDistance(distance);
                                    tripRepository.save(trip);
                                    log.info("[DriverDashboard] Saved calculated distance to trip {}", trip.getId());
                                }
                            } catch (Exception e) {
                                log.warn("[DriverDashboard] Failed to calculate distance for trip {}: {}", trip.getId(), e.getMessage());
                            }
                        }
                        
                        if (distance == null) {
                            log.debug("[DriverDashboard] Trip {} has no distance and cannot calculate from locations", trip.getId());
                        }
                    }
                    log.info("[DriverDashboard] Trip {} distance: {}", trip.getId(), distance);
                    log.info("[DriverDashboard] Driver: {}, Vehicle: {}, TotalCost: {}, Paid: {}, Remaining: {}", 
                            driverName, vehiclePlate, totalCost, paidAmount, remainingAmount);
                    
                    return new DriverDashboardResponse(
                            trip.getId(),
                            trip.getStartLocation(),
                            trip.getEndLocation(),
                            trip.getStartTime(),
                            trip.getEndTime(),
                            trip.getStatus(),
                            customerName,
                            customerPhone,
                            distance,
                            driverName,
                            driverPhone,
                            vehiclePlate,
                            vehicleModel,
                            totalCost,
                            paidAmount,
                            remainingAmount
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
                    
                    // Lấy hireType từ booking
                    var booking = trip.getBooking();
                    String hireType = null;
                    String hireTypeName = null;
                    if (booking != null && booking.getHireType() != null) {
                        hireType = booking.getHireType().getCode();
                        hireTypeName = calculateHireTypeNameWithSuffix(
                                booking.getHireType().getName(),
                                booking.getHireType().getCode(),
                                trip.getStartTime(),
                                trip.getEndTime()
                        );
                    }
                    
                    return DriverScheduleResponse.builder()
                            .tripId(trip.getId())
                            .startLocation(trip.getStartLocation())
                            .endLocation(trip.getEndLocation())
                            .startTime(trip.getStartTime())
                            .endTime(trip.getEndTime())
                            .status(trip.getStatus())
                            .rating(rating)
                            .ratingComment(ratingComment)
                            .hireType(hireType)
                            .hireTypeName(hireTypeName)
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
        if (request.getLicenseNumber() != null) driver.setLicenseNumber(request.getLicenseNumber());
        if (request.getLicenseClass() != null) driver.setLicenseClass(request.getLicenseClass());
        if (request.getLicenseExpiry() != null) driver.setLicenseExpiry(request.getLicenseExpiry());
        // Chỉ validate và cập nhật status nếu có giá trị hợp lệ (không null và không rỗng)
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            try {
                org.example.ptcmssbackend.enums.DriverStatus newStatus = 
                    org.example.ptcmssbackend.enums.DriverStatus.valueOf(request.getStatus().trim());
                
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
    @Transactional
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

        // Tạo approval request để điều phối viên duyệt (rollback nếu thiếu thông tin bắt buộc)
        var employee = driver.getEmployee();
        var user = employee != null ? employee.getUser() : null;
        var branch = driver.getBranch();
        if (user == null || branch == null) {
            log.error("[DriverDayOff] Missing user or branch for driver {}, cannot create approval", driverId);
            throw new RuntimeException("Không thể tạo yêu cầu phê duyệt vì thiếu thông tin tài xế/chi nhánh");
        }

        approvalService.createApprovalRequest(
                ApprovalType.DRIVER_DAY_OFF,
                saved.getId(),
                user,
                request.getReason(),
                branch
        );
        log.info("[DriverDayOff] Created approval request for day off {}", saved.getId());
        
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

        // Cho phép start từ trạng thái SCHEDULED hoặc ASSIGNED
        // (ASSIGNED = đã phân xe/tài xế, SCHEDULED = đã lên lịch nhưng chưa phân)
        if (trip.getStatus() != TripStatus.SCHEDULED && trip.getStatus() != TripStatus.ASSIGNED) {
            throw new RuntimeException("Chuyến đi không ở trạng thái ĐÃ LÊN LỊCH hoặc ĐÃ PHÂN XE");
        }

        trip.setStatus(TripStatus.ONGOING);
        if (trip.getStartTime() == null) {
            trip.setStartTime(Instant.now());
        }
        tripRepository.save(trip);
        
        // Cập nhật booking status thành INPROGRESS khi tài xế bắt đầu chuyến
        if (trip.getBooking() != null) {
            Bookings booking = trip.getBooking();
            if (booking.getStatus() != BookingStatus.INPROGRESS
                    && booking.getStatus() != BookingStatus.COMPLETED
                    && booking.getStatus() != BookingStatus.CANCELLED) {
                booking.setStatus(BookingStatus.INPROGRESS);
                bookingRepository.save(booking);
                log.info("[DriverService] Updated booking {} status to INPROGRESS after driver {} started trip {}", 
                        booking.getId(), driverId, tripId);
            }
        }
        
        return tripId;
    }

    @Override
    public Integer completeTrip(Integer tripId, Integer driverId) {
        log.info("[Trip] Driver {} completed trip {}", driverId, tripId);
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi"));

        log.info("[Trip] Trip {} current status: {}", tripId, trip.getStatus());

        if (!tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)) {
            log.error("[Trip] Driver {} is not assigned to trip {}", driverId, tripId);
            throw new RuntimeException("Tài xế không được phân công cho chuyến đi này");
        }

        // Cho phép complete từ ONGOING hoặc ASSIGNED (nếu chưa start nhưng muốn complete)
        if (trip.getStatus() != TripStatus.ONGOING && trip.getStatus() != TripStatus.ASSIGNED) {
            log.error("[Trip] Trip {} status is {}, expected ONGOING or ASSIGNED", tripId, trip.getStatus());
            throw new RuntimeException("Chuyến đi không ở trạng thái ĐANG THỰC HIỆN hoặc ĐÃ PHÂN XE. Trạng thái hiện tại: " + trip.getStatus());
        }

        try {
            trip.setStatus(TripStatus.COMPLETED);
            if (trip.getEndTime() == null) {
                trip.setEndTime(Instant.now());
            }
            tripRepository.save(trip);
            log.info("[Trip] Trip {} completed successfully", tripId);
            return tripId;
        } catch (Exception e) {
            log.error("[Trip] Failed to save completed trip {}: {}", tripId, e.getMessage(), e);
            throw new RuntimeException("Không thể lưu trạng thái hoàn thành chuyến đi: " + e.getMessage());
        }
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

        // Notify coordinators cùng chi nhánh qua websocket
        try {
            Integer branchId = trip.getBooking() != null && trip.getBooking().getBranch() != null
                    ? trip.getBooking().getBranch().getId()
                    : null;

            String title = "Báo cáo sự cố chuyến " + request.getTripId();
            String msg = "Tài xế " + driver.getId() + " báo: " + request.getDescription();

            if (branchId != null) {
                var coordinators = employeeRepository.findByRoleNameAndBranchId("Coordinator", branchId);
                var managers = employeeRepository.findByRoleNameAndBranchId("Manager", branchId);

                java.util.Set<Integer> notifiedUserIds = new java.util.HashSet<>();

                if (coordinators != null) {
                    coordinators.stream()
                            .filter(e -> e.getUser() != null)
                            .forEach(e -> {
                                Integer uid = e.getUser().getId();
                                if (notifiedUserIds.add(uid)) {
                                    webSocketNotificationService.sendUserNotification(uid, title, msg, "WARN");
                                }
                            });
                }

                if (managers != null) {
                    managers.stream()
                            .filter(e -> e.getUser() != null)
                            .forEach(e -> {
                                Integer uid = e.getUser().getId();
                                if (notifiedUserIds.add(uid)) {
                                    webSocketNotificationService.sendUserNotification(uid, title, msg, "WARN");
                                }
                            });
                }

                if (notifiedUserIds.isEmpty()) {
                    // fallback: gửi global nếu không tìm thấy điều phối/manager
                    webSocketNotificationService.sendGlobalNotification(title, msg, "WARN");
                }
            } else {
                webSocketNotificationService.sendGlobalNotification(title, msg, "WARN");
            }
        } catch (Exception e) {
            log.warn("[TripIncident] Failed to send websocket notification for trip {}: {}", request.getTripId(), e.getMessage());
        }

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

        if (!branchRepository.existsById(branchId)) {
            throw new RuntimeException("Không tìm thấy chi nhánh");
        }
        return driverRepository.findAllByBranchId(branchId);
    }
    
    /**
     * Helper method: Tính toán hireTypeName với suffix "(trong ngày)" hoặc "(khác ngày)" cho ROUND_TRIP
     */
    private String calculateHireTypeNameWithSuffix(String baseName, String hireTypeCode, Instant startTime, Instant endTime) {
        if (baseName == null || hireTypeCode == null) {
            return baseName;
        }
        
        // Chỉ thêm suffix cho ROUND_TRIP (Hai chiều)
        if (!"ROUND_TRIP".equals(hireTypeCode)) {
            return baseName;
        }
        
        if (startTime == null || endTime == null) {
            return baseName;
        }
        
        // Kiểm tra xem có phải trong ngày không (chỉ kiểm tra cùng ngày, không kiểm tra giờ)
        try {
            java.time.ZonedDateTime startZoned = startTime.atZone(java.time.ZoneId.systemDefault());
            java.time.ZonedDateTime endZoned = endTime.atZone(java.time.ZoneId.systemDefault());
            
            // Check cùng ngày
            if (startZoned.toLocalDate().equals(endZoned.toLocalDate())) {
                return baseName + " (trong ngày)";
            } else {
                return baseName + " (khác ngày)";
            }
        } catch (Exception e) {
            log.warn("Error checking same day trip: {}", e.getMessage());
            return baseName;
        }
    }
}
