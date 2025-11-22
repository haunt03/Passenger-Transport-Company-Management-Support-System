package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Trip.TripSearchRequest;
import org.example.ptcmssbackend.dto.request.dispatch.AssignRequest;
import org.example.ptcmssbackend.dto.response.Trip.TripDetailResponse;
import org.example.ptcmssbackend.dto.response.Trip.TripListItemResponse;
import org.example.ptcmssbackend.dto.response.dispatch.AssignRespone;
import org.example.ptcmssbackend.dto.response.dispatch.DispatchDashboardResponse;
import org.example.ptcmssbackend.dto.response.dispatch.PendingTripResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.BookingService;
import org.example.ptcmssbackend.service.DispatchService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DispatchServiceImpl implements DispatchService {

    private static final ZoneId DEFAULT_ZONE = ZoneId.systemDefault();
    private static final int DEFAULT_SHIFT_START = 6;
    private static final int DEFAULT_SHIFT_END = 22;
    private static final EnumSet<BookingStatus> DISPATCHABLE_BOOKING_STATUSES =
            EnumSet.of(
                    BookingStatus.PENDING,
                    BookingStatus.QUOTATION_SENT,
                    BookingStatus.CONFIRMED,
                    BookingStatus.IN_PROGRESS,
                    BookingStatus.COMPLETED
            );

    private final TripRepository tripRepository;
    private final BookingRepository bookingRepository;
    private final TripDriverRepository tripDriverRepository;
    private final TripVehicleRepository tripVehicleRepository;
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverDayOffRepository driverDayOffRepository;
    private final BookingService bookingService; // để tái dùng hàm assign của BookingService
    private final TripAssignmentHistoryRepository tripAssignmentHistoryRepository;

    // =========================================================
    // 1) PENDING TRIPS (QUEUE)
    // =========================================================
    @Override
    public List<PendingTripResponse> getPendingTrips(Integer branchId) {
        // Mặc định: hôm nay (00:00 - 23:59:59) theo system default zone
        LocalDate today = LocalDate.now();
        Instant from = today.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        return getPendingTrips(branchId, from, to);
    }

    @Override
    public List<PendingTripResponse> getPendingTrips(Integer branchId, Instant from, Instant to) {
        log.info("[Dispatch] Loading pending trips for branch {} from {} to {}", branchId, from, to);

        List<Trips> trips = tripRepository.findByBooking_Branch_IdAndStatusAndStartTimeBetween(branchId, TripStatus.SCHEDULED, from, to);

        List<PendingTripResponse> result = new ArrayList<>();

        for (Trips t : trips) {
            // Chỉ lấy các trip CHƯA gán driver và CHƯA gán vehicle
            List<TripDrivers> tripDrivers = tripDriverRepository.findByTripId(t.getId());
            List<TripVehicles> tripVehicles = tripVehicleRepository.findByTripId(t.getId());
            if (!tripDrivers.isEmpty() || !tripVehicles.isEmpty()) {
                continue; // đã gán rồi -> không nằm trong pending queue
            }

            Bookings b = t.getBooking();
            // Skip bookings that are not eligible for dispatch (e.g. cancelled)
            if (!DISPATCHABLE_BOOKING_STATUSES.contains(b.getStatus())) {
                continue;
            }

            result.add(PendingTripResponse.builder()
                    .tripId(t.getId())
                    .bookingId(b.getId())
                    .branchId(b.getBranch().getId())
                    .branchName(b.getBranch().getBranchName())
                    .customerName(b.getCustomer().getFullName())
                    .customerPhone(b.getCustomer().getPhone())
                    .startTime(t.getStartTime())
                    .endTime(t.getEndTime())
                    .startLocation(t.getStartLocation())
                    .endLocation(t.getEndLocation())
                    .bookingStatus(b.getStatus())
                    .build()
            );
        }

        // Có thể sort theo startTime tăng dần
        result.sort(Comparator.comparing(PendingTripResponse::getStartTime));
        return result;
    }

    @Override
    public DispatchDashboardResponse getDashboard(Integer branchId, LocalDate date) {
        if (branchId == null) {
            throw new IllegalArgumentException("branchId is required");
        }
        LocalDate targetDate = date != null ? date : LocalDate.now();
        Instant from = targetDate.atStartOfDay(DEFAULT_ZONE).toInstant();
        Instant to = targetDate.plusDays(1).atStartOfDay(DEFAULT_ZONE).toInstant();

        List<PendingTripResponse> pending = getPendingTrips(branchId, from, to);
        List<Drivers> drivers = driverRepository.findByBranchId(branchId);
        List<Vehicles> vehicles = vehicleRepository.filterVehicles(null, branchId, null);
        if (vehicles == null) {
            vehicles = new ArrayList<>();
        }
        List<Trips> tripsInDay = tripRepository.findByBooking_Branch_IdAndStartTimeBetween(branchId, from, to);

        Map<Integer, List<TripDrivers>> tripDriverMap = new HashMap<>();
        Map<Integer, List<TripVehicles>> tripVehicleMap = new HashMap<>();

        List<DispatchDashboardResponse.DriverScheduleItem> driverSchedules = drivers.stream()
                .map(driver -> buildDriverSchedule(driver, tripsInDay, tripDriverMap, targetDate))
                .collect(Collectors.toList());

        List<DispatchDashboardResponse.VehicleScheduleItem> vehicleSchedules = vehicles.stream()
                .map(vehicle -> buildVehicleSchedule(vehicle, tripsInDay, tripVehicleMap, targetDate))
                .collect(Collectors.toList());

        return DispatchDashboardResponse.builder()
                .pendingTrips(pending)
                .driverSchedules(driverSchedules)
                .vehicleSchedules(vehicleSchedules)
                .build();
    }

    // =========================================================
    // 2) ASSIGN (Manual + Auto)
    // =========================================================
    @Override
    public AssignRespone assign(AssignRequest request) {
        log.info("[Dispatch] Assign called: {}", request);

        if (request.getBookingId() == null) {
            throw new RuntimeException("bookingId is required");
        }

        Bookings booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found: " + request.getBookingId()));

        List<Trips> trips = tripRepository.findByBooking_Id(booking.getId());
        if (trips.isEmpty()) {
            throw new RuntimeException("No trips found for booking " + booking.getId());
        }

        // Nếu không truyền tripIds -> gán tất cả chuyến
        List<Integer> targetTripIds = (request.getTripIds() != null && !request.getTripIds().isEmpty())
                ? request.getTripIds()
                : trips.stream().map(Trips::getId).collect(Collectors.toList());

        Integer driverId = request.getDriverId();
        Integer vehicleId = request.getVehicleId();

        // ===========================
        // AUTO ASSIGN nếu autoAssign = true
        // ===========================
        if (Boolean.TRUE.equals(request.getAutoAssign())) {
            log.info("[Dispatch] Auto-assign for booking {}", booking.getId());
            Trips representativeTrip = trips.stream()
                    .filter(t -> targetTripIds.contains(t.getId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("No target trip for auto assign"));

            if (driverId == null) {
                driverId = pickBestDriverForTrip(booking, representativeTrip);
            }
            if (vehicleId == null) {
                vehicleId = pickBestVehicleForTrip(booking, representativeTrip);
            }
        }

        // Tới đây, nếu vẫn không có driverId hoặc vehicleId thì coi như lỗi (có thể mềm dẻo hơn)
        if (driverId == null && vehicleId == null) {
            throw new RuntimeException("No driverId or vehicleId specified/available for assignment");
        }

        // Sử dụng BookingService.assign để tái dùng logic gán driver/vehicle cho tất cả trips được chọn
        org.example.ptcmssbackend.dto.request.Booking.AssignRequest bookingAssignReq =
                new org.example.ptcmssbackend.dto.request.Booking.AssignRequest();
        bookingAssignReq.setTripIds(targetTripIds);
        bookingAssignReq.setDriverId(driverId);
        bookingAssignReq.setVehicleId(vehicleId);
        bookingAssignReq.setNote(request.getNote());

        var bookingResponse = bookingService.assign(booking.getId(), bookingAssignReq);

        // Build response cho FE
        List<Trips> updatedTrips = tripRepository.findByBooking_Id(booking.getId());

        List<AssignRespone.AssignedTripInfo> tripInfos = new ArrayList<>();
        for (Trips t : updatedTrips) {
            if (!targetTripIds.contains(t.getId())) continue;

            // tìm trong TripDrivers + TripVehicles
            List<TripDrivers> tds = tripDriverRepository.findByTripId(t.getId());
            List<TripVehicles> tvs = tripVehicleRepository.findByTripId(t.getId());

            Integer dId = null;
            String dName = null;
            if (!tds.isEmpty()) {
                Drivers d = tds.get(0).getDriver();
                dId = d.getId();
                if (d.getEmployee() != null && d.getEmployee().getUser() != null) {
                    dName = d.getEmployee().getUser().getFullName();
                }
            }

            Integer vId = null;
            String plate = null;
            if (!tvs.isEmpty()) {
                Vehicles v = tvs.get(0).getVehicle();
                vId = v.getId();
                plate = v.getLicensePlate();
            }

            tripInfos.add(AssignRespone.AssignedTripInfo.builder()
                    .tripId(t.getId())
                    .tripStatus(t.getStatus() != null ? t.getStatus().name() : null)
                    .driverId(dId)
                    .driverName(dName)
                    .vehicleId(vId)
                    .vehicleLicensePlate(plate)
                    .build());
        }

        return AssignRespone.builder()
                .bookingId(booking.getId())
                .bookingStatus(bookingResponse.getStatus())
                .trips(tripInfos)
                .build();
    }

    // =========================================================
    // 3) UNASSIGN
    // =========================================================
    @Override
    public void unassign(Integer tripId) {
        log.info("[Dispatch] Unassign trip {}", tripId);
        Trips trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found: " + tripId));

        // Xoá driver mapping
        List<TripDrivers> tds = tripDriverRepository.findByTripId(tripId);
        if (!tds.isEmpty()) {
            tripDriverRepository.deleteAll(tds);
        }

        // Xoá vehicle mapping
        List<TripVehicles> tvs = tripVehicleRepository.findByTripId(tripId);
        if (!tvs.isEmpty()) {
            tripVehicleRepository.deleteAll(tvs);
        }

        // Trạng thái trip vẫn là SCHEDULED, nằm lại trong Pending Queue
    }

    @Override
    public AssignRespone reassign(AssignRequest request) {
        // Thực chất là unassign rồi assign lại
        if (request.getTripIds() != null && !request.getTripIds().isEmpty()) {
            for (Integer tid : request.getTripIds()) {
                unassign(tid);
            }
        } else if (request.getBookingId() != null) {
            List<Trips> trips = tripRepository.findByBooking_Id(request.getBookingId());
            for (Trips t : trips) {
                unassign(t.getId());
            }
        }
        return assign(request);
    }

    @Override
    public void driverAcceptTrip(Integer tripId) {

    }

    @Override
    @Transactional(readOnly = true)
    public TripDetailResponse getTripDetail(Integer tripId) {
        Trips trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found: " + tripId));

        Bookings booking = trip.getBooking();
        Customers customer = booking.getCustomer();

        // Driver & Vehicle hiện tại
        List<TripDrivers> tds = tripDriverRepository.findByTripId(trip.getId());
        List<TripVehicles> tvs = tripVehicleRepository.findByTripId(trip.getId());

        String driverName = null;
        String driverPhone = null;
        String vehiclePlate = null;
        String vehicleModel = null;

        if (!tds.isEmpty()) {
            Drivers d = tds.get(0).getDriver();
            if (d.getEmployee() != null && d.getEmployee().getUser() != null) {
                driverName = d.getEmployee().getUser().getFullName();
                driverPhone = d.getEmployee().getUser().getPhone();
            }
        }

        if (!tvs.isEmpty()) {
            Vehicles v = tvs.get(0).getVehicle();
            vehiclePlate = v.getLicensePlate();
            vehicleModel = v.getModel();
        }

        // Lịch sử điều phối
        List<TripAssignmentHistory> histories =
                tripAssignmentHistoryRepository.findByTrip_IdOrderByCreatedAtDesc(tripId);

        List<TripDetailResponse.AssignmentHistoryItem> historyItems =
                histories.stream().map(h -> {
                    String hDriverName = null;
                    String hVehiclePlate = null;
                    if (h.getDriver() != null && h.getDriver().getEmployee() != null
                            && h.getDriver().getEmployee().getUser() != null) {
                        hDriverName = h.getDriver().getEmployee().getUser().getFullName();
                    }
                    if (h.getVehicle() != null) {
                        hVehiclePlate = h.getVehicle().getLicensePlate();
                    }
                    return TripDetailResponse.AssignmentHistoryItem.builder()
                            .time(h.getCreatedAt())
                            .action(h.getAction())
                            .driverName(hDriverName)
                            .vehiclePlate(hVehiclePlate)
                            .note(h.getNote())
                            .build();
                }).collect(Collectors.toList());

        return TripDetailResponse.builder()
                .tripId(trip.getId())
                .bookingId(booking.getId())
                .customerName(customer.getFullName())
                .customerPhone(customer.getPhone())
                .startLocation(trip.getStartLocation())
                .endLocation(trip.getEndLocation())
                .startTime(trip.getStartTime())
                .endTime(trip.getEndTime())
                .useHighway(trip.getUseHighway())
                .driverName(driverName)
                .driverPhone(driverPhone)
                .vehiclePlate(vehiclePlate)
                .vehicleModel(vehicleModel)
                .status(trip.getStatus())
                .history(historyItems)
                .build();
    }

    @Override
    public List<TripListItemResponse> searchTrips(TripSearchRequest request) {
        List<Trips> trips = tripRepository.findAll();
        return trips.stream()
                .filter(trip -> request == null || request.match(trip))
                .map(this::buildTripListItem)
                .collect(Collectors.toList());
    }

    // =========================================================
    // 4) HELPER: CHỌN DRIVER / VEHICLE
    // =========================================================

    private TripListItemResponse buildTripListItem(Trips trip) {
        Bookings booking = trip.getBooking();
        TripListItemResponse.TripListItemResponseBuilder builder = TripListItemResponse.builder()
                .tripId(trip.getId())
                .bookingId(booking != null ? booking.getId() : null)
                .customerName(booking != null ? booking.getCustomer().getFullName() : null)
                .customerPhone(booking != null ? booking.getCustomer().getPhone() : null)
                .branchName(booking != null ? booking.getBranch().getBranchName() : null)
                .routeSummary(routeLabel(trip))
                .startTime(trip.getStartTime())
                .endTime(trip.getEndTime())
                .hireTypeName(booking != null && booking.getHireType() != null
                        ? booking.getHireType().getName()
                        : null)
                .status(trip.getStatus() != null ? trip.getStatus().name() : null);

        List<TripDrivers> tripDrivers = tripDriverRepository.findByTripId(trip.getId());
        if (!tripDrivers.isEmpty()) {
            Drivers driver = tripDrivers.get(0).getDriver();
            builder.driverId(driver.getId());
            builder.driverName(extractDriverName(driver));
        }

        List<TripVehicles> tripVehicles = tripVehicleRepository.findByTripId(trip.getId());
        if (!tripVehicles.isEmpty()) {
            Vehicles vehicle = tripVehicles.get(0).getVehicle();
            builder.vehicleId(vehicle.getId());
            builder.vehicleLicensePlate(vehicle.getLicensePlate());
        }

        return builder.build();
    }

    private DispatchDashboardResponse.DriverScheduleItem buildDriverSchedule(
            Drivers driver,
            List<Trips> tripsInDay,
            Map<Integer, List<TripDrivers>> tripDriverMap,
            LocalDate date
    ) {
        DispatchDashboardResponse.ScheduleWindow shift = buildShiftWindow(date);
        List<DispatchDashboardResponse.ScheduleBlock> blocks = new ArrayList<>();
        for (Trips trip : tripsInDay) {
            if (trip.getStartTime() == null || trip.getEndTime() == null) {
                continue;
            }
            List<TripDrivers> assigned = tripDriverMap.computeIfAbsent(
                    trip.getId(),
                    tripDriverRepository::findByTripId
            );
            boolean belongs = assigned.stream()
                    .anyMatch(td -> td.getDriver().getId().equals(driver.getId()));
            if (belongs) {
                blocks.add(DispatchDashboardResponse.ScheduleBlock.builder()
                        .start(trip.getStartTime())
                        .end(trip.getEndTime())
                        .type("BUSY")
                        .ref("TRIP-" + trip.getId())
                        .note(routeLabel(trip))
                        .build());
            }
        }

        return DispatchDashboardResponse.DriverScheduleItem.builder()
                .driverId(driver.getId())
                .driverName(extractDriverName(driver))
                .driverPhone(driver.getEmployee() != null && driver.getEmployee().getUser() != null
                        ? driver.getEmployee().getUser().getPhone()
                        : null)
                .shift(shift)
                .items(blocks)
                .build();
    }

    private DispatchDashboardResponse.VehicleScheduleItem buildVehicleSchedule(
            Vehicles vehicle,
            List<Trips> tripsInDay,
            Map<Integer, List<TripVehicles>> tripVehicleMap,
            LocalDate date
    ) {
        DispatchDashboardResponse.ScheduleWindow shift = buildShiftWindow(date);
        List<DispatchDashboardResponse.ScheduleBlock> blocks = new ArrayList<>();
        for (Trips trip : tripsInDay) {
            if (trip.getStartTime() == null || trip.getEndTime() == null) {
                continue;
            }
            List<TripVehicles> assigned = tripVehicleMap.computeIfAbsent(
                    trip.getId(),
                    tripVehicleRepository::findByTripId
            );
            boolean belongs = assigned.stream()
                    .anyMatch(tv -> tv.getVehicle().getId().equals(vehicle.getId()));
            if (belongs) {
                blocks.add(DispatchDashboardResponse.ScheduleBlock.builder()
                        .start(trip.getStartTime())
                        .end(trip.getEndTime())
                        .type("BUSY")
                        .ref("TRIP-" + trip.getId())
                        .note(routeLabel(trip))
                        .build());
            }
        }

        return DispatchDashboardResponse.VehicleScheduleItem.builder()
                .vehicleId(vehicle.getId())
                .licensePlate(vehicle.getLicensePlate())
                .model(vehicle.getModel())
                .shift(shift)
                .items(blocks)
                .build();
    }

    private DispatchDashboardResponse.ScheduleWindow buildShiftWindow(LocalDate date) {
        Instant start = date.atTime(DEFAULT_SHIFT_START, 0).atZone(DEFAULT_ZONE).toInstant();
        Instant end = date.atTime(DEFAULT_SHIFT_END, 0).atZone(DEFAULT_ZONE).toInstant();
        return DispatchDashboardResponse.ScheduleWindow.builder()
                .start(start)
                .end(end)
                .build();
    }

    private String routeLabel(Trips trip) {
        String start = trip.getStartLocation();
        String end = trip.getEndLocation();
        if (start == null && end == null) {
            return "";
        }
        if (start == null) {
            return end;
        }
        if (end == null) {
            return start;
        }
        return start + " -> " + end;
    }

    private String extractDriverName(Drivers driver) {
        if (driver.getEmployee() != null && driver.getEmployee().getUser() != null) {
            return driver.getEmployee().getUser().getFullName();
        }
        return driver.getId() != null ? "Driver #" + driver.getId() : null;
    }    private Integer pickBestDriverForTrip(Bookings booking, Trips trip) {
        Integer branchId = booking.getBranch().getId();
        log.info("[Dispatch] Picking best driver for branch {}, trip {}", branchId, trip.getId());

        List<Drivers> candidates = driverRepository.findByBranchId(branchId);
        if (candidates.isEmpty()) {
            log.warn("[Dispatch] No drivers found in branch {}", branchId);
            return null;
        }

        LocalDate tripDate = trip.getStartTime()
                .atZone(ZoneId.systemDefault())
                .toLocalDate();

        List<CandidateScore<Drivers>> scored = new ArrayList<>();

        for (Drivers d : candidates) {
            // 1) Check nghỉ phép (APPROVED)
            boolean dayOff = !driverDayOffRepository
                    .findApprovedDayOffOnDate(d.getId(), DriverDayOffStatus.APPROVED, tripDate)
                    .isEmpty();
            if (dayOff) {
                log.debug("Driver {} is on day-off, skip", d.getId());
                continue;
            }

            // 2) Check còn hạn bằng lái (nếu có)
            if (d.getLicenseExpiry() != null && d.getLicenseExpiry().isBefore(tripDate)) {
                log.debug("Driver {} license expired, skip", d.getId());
                continue;
            }

            // 3) Check trùng giờ (trip SCHEDULED/ONGOING)
            List<TripDrivers> driverTrips = tripDriverRepository.findAllByDriverId(d.getId());
            boolean overlap = driverTrips.stream().anyMatch(td -> {
                Trips t = td.getTrip();
                if (t.getId().equals(trip.getId())) return false;
                if (t.getStatus() == TripStatus.CANCELLED || t.getStatus() == TripStatus.COMPLETED) return false;
                Instant s1 = t.getStartTime();
                Instant e1 = t.getEndTime();
                Instant s2 = trip.getStartTime();
                Instant e2 = trip.getEndTime();
                if (s1 == null || e1 == null || s2 == null || e2 == null) return false;
                return s1.isBefore(e2) && s2.isBefore(e1);
            });
            if (overlap) {
                log.debug("Driver {} has overlap trips, skip", d.getId());
                continue;
            }

            // 4) Fairness: số chuyến đã chạy trong ngày
            long todayTrips = driverTrips.stream().filter(td -> {
                Trips t = td.getTrip();
                if (t.getStartTime() == null) return false;
                LocalDate dDate = t.getStartTime().atZone(ZoneId.systemDefault()).toLocalDate();
                return dDate.equals(tripDate);
            }).count();

            scored.add(new CandidateScore<>(d, (int) todayTrips));
        }

        if (scored.isEmpty()) {
            log.warn("[Dispatch] No eligible driver found for trip {}", trip.getId());
            return null;
        }

        // Chọn driver có score thấp nhất (ít chuyến nhất trong ngày)
        scored.sort(Comparator.comparingInt(CandidateScore::score));
        Drivers best = scored.get(0).candidate();
        log.info("[Dispatch] Auto-picked driver {} for trip {}", best.getId(), trip.getId());
        return best.getId();
    }

    private Integer pickBestVehicleForTrip(Bookings booking, Trips trip) {
        Integer branchId = booking.getBranch().getId();
        log.info("[Dispatch] Picking best vehicle for branch {}, trip {}", branchId, trip.getId());

        // Đơn giản: tất cả vehicle AVAILABLE cùng chi nhánh
        List<Vehicles> candidates = vehicleRepository
                .findByBranch_IdAndStatus(branchId, VehicleStatus.AVAILABLE);
        if (candidates.isEmpty()) {
            log.warn("[Dispatch] No AVAILABLE vehicle found in branch {}", branchId);
            return null;
        }

        List<CandidateScore<Vehicles>> scored = new ArrayList<>();
        for (Vehicles v : candidates) {
            // Check trùng giờ
            List<TripVehicles> overlaps = tripVehicleRepository.findOverlapsForVehicle(
                    v.getId(),
                    trip.getStartTime(),
                    trip.getEndTime()
            );
            // bỏ các trip đã bị cancel
            boolean busy = overlaps.stream().anyMatch(tv ->
                    tv.getTrip().getStatus() != TripStatus.CANCELLED
                            && !tv.getTrip().getId().equals(trip.getId())
            );
            if (busy) continue;

            // Score: tạm thời = 0 (sau này có thể thêm logic km, maintenance,...)
            scored.add(new CandidateScore<>(v, 0));
        }

        if (scored.isEmpty()) {
            log.warn("[Dispatch] No free vehicle found for trip {}", trip.getId());
            return null;
        }

        scored.sort(Comparator.comparingInt(CandidateScore::score));
        Vehicles best = scored.get(0).candidate();
        log.info("[Dispatch] Auto-picked vehicle {} for trip {}", best.getId(), trip.getId());
        return best.getId();
    }


    // Helper generic
    private record CandidateScore<T>(T candidate, int score) {}
}

