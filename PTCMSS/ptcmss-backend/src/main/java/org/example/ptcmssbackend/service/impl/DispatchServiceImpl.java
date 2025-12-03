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
import org.example.ptcmssbackend.entity.TripDriverId;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.BookingService;
import org.example.ptcmssbackend.service.DispatchService;
import org.example.ptcmssbackend.service.SystemSettingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
                    BookingStatus.DRAFT,
                    BookingStatus.PENDING,
                    BookingStatus.QUOTATION_SENT,
                    BookingStatus.CONFIRMED,
                    BookingStatus.INPROGRESS,
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
    private final org.example.ptcmssbackend.service.WebSocketNotificationService webSocketNotificationService;
    private final SystemSettingService systemSettingService;
    private final BookingVehicleDetailsRepository bookingVehicleDetailsRepository;
    private final org.example.ptcmssbackend.repository.InvoiceRepository invoiceRepository;
    private final org.example.ptcmssbackend.repository.PaymentHistoryRepository paymentHistoryRepository;
    private final DriverRatingsRepository driverRatingsRepository;

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

        // Lấy các trip có status SCHEDULED hoặc ASSIGNED (ASSIGNED có thể có 1 phần đã gán)
        List<Trips> scheduledTrips = tripRepository.findByBooking_Branch_IdAndStatusAndStartTimeBetween(branchId, TripStatus.SCHEDULED, from, to);
        List<Trips> assignedTrips = tripRepository.findByBooking_Branch_IdAndStatusAndStartTimeBetween(branchId, TripStatus.ASSIGNED, from, to);

        List<Trips> trips = new ArrayList<>();
        trips.addAll(scheduledTrips);
        trips.addAll(assignedTrips);

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
    public List<PendingTripResponse> getAllPendingTrips() {
        log.info("[Dispatch] Loading all pending trips (all branches)");

        LocalDate today = LocalDate.now();
        Instant from = today.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant to = today.plusDays(7).atStartOfDay(ZoneId.systemDefault()).toInstant(); // 7 ngày tới

        // Lấy tất cả trips SCHEDULED và ASSIGNED trong khoảng thời gian
        List<Trips> scheduledTrips = tripRepository.findByStatusAndStartTimeBetween(TripStatus.SCHEDULED, from, to);
        List<Trips> assignedTrips = tripRepository.findByStatusAndStartTimeBetween(TripStatus.ASSIGNED, from, to);

        List<Trips> trips = new ArrayList<>();
        trips.addAll(scheduledTrips);
        trips.addAll(assignedTrips);

        List<PendingTripResponse> result = new ArrayList<>();

        for (Trips t : trips) {
            // Chỉ lấy các trip CHƯA gán driver và CHƯA gán vehicle
            List<TripDrivers> tripDrivers = tripDriverRepository.findByTripId(t.getId());
            List<TripVehicles> tripVehicles = tripVehicleRepository.findByTripId(t.getId());
            if (!tripDrivers.isEmpty() || !tripVehicles.isEmpty()) {
                continue;
            }

            Bookings b = t.getBooking();
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

        result.sort(Comparator.comparing(PendingTripResponse::getStartTime));
        return result;
    }

    @Override
    public org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse getAssignmentSuggestions(Integer tripId) {
        log.info("[Dispatch] Getting assignment suggestions for trip {}", tripId);

        Trips trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi: " + tripId));

        Bookings booking = trip.getBooking();
        Integer branchId = booking.getBranch().getId();

        // Get vehicle type from booking vehicle details
        List<BookingVehicleDetails> bookingVehicles = bookingVehicleDetailsRepository.findByBookingId(booking.getId());
        String vehicleType = bookingVehicles != null && !bookingVehicles.isEmpty()
                ? bookingVehicles.get(0).getVehicleCategory().getCategoryName()
                : null;

        // Build trip summary
        org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.TripSummary summary =
                org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.TripSummary.builder()
                        .tripId(trip.getId())
                        .bookingId(booking.getId())
                        .branchId(branchId)
                        .branchName(booking.getBranch().getBranchName())
                        .customerName(booking.getCustomer().getFullName())
                        .customerPhone(booking.getCustomer().getPhone())
                        .startTime(trip.getStartTime())
                        .endTime(trip.getEndTime())
                        .startLocation(trip.getStartLocation())
                        .endLocation(trip.getEndLocation())
                        .hireType(booking.getHireType() != null ? booking.getHireType().getName() : null)
                        .vehicleType(vehicleType)
                        .bookingStatus(booking.getStatus())
                        .routeLabel(routeLabel(trip))
                        .build();

        // Get all drivers and vehicles in branch
        List<Drivers> allDrivers = driverRepository.findByBranchId(branchId);
        List<Vehicles> allVehicles = vehicleRepository.findByBranch_IdAndStatus(branchId, VehicleStatus.AVAILABLE);

        LocalDate tripDate = trip.getStartTime().atZone(ZoneId.systemDefault()).toLocalDate();

        // Evaluate driver candidates with fairness scoring
        List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.DriverCandidate> driverCandidates =
                evaluateDriverCandidates(allDrivers, trip, tripDate);

        // Evaluate vehicle candidates
        List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.VehicleCandidate> vehicleCandidates =
                evaluateVehicleCandidates(allVehicles, trip);

        // Build pair suggestions (top eligible combinations)
        List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.PairSuggestion> pairSuggestions =
                buildPairSuggestions(driverCandidates, vehicleCandidates);

        // Recommend best pair
        Integer recommendedDriverId = null;
        Integer recommendedVehicleId = null;
        if (!pairSuggestions.isEmpty()) {
            var best = pairSuggestions.get(0);
            recommendedDriverId = best.getDriver().getId();
            recommendedVehicleId = best.getVehicle().getId();
        }

        return org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.builder()
                .summary(summary)
                .suggestions(pairSuggestions)
                .drivers(driverCandidates)
                .vehicles(vehicleCandidates)
                .recommendedDriverId(recommendedDriverId)
                .recommendedVehicleId(recommendedVehicleId)
                .build();
    }

    private List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.DriverCandidate>
    evaluateDriverCandidates(List<Drivers> drivers, Trips trip, LocalDate tripDate) {

        List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.DriverCandidate> candidates = new ArrayList<>();

        // Lấy customerId từ booking
        Integer customerId = trip.getBooking() != null && trip.getBooking().getCustomer() != null
                ? trip.getBooking().getCustomer().getId()
                : null;

        for (Drivers d : drivers) {
            // Kiểm tra lịch sử chuyến đi với khách hàng này
            boolean hasHistoryWithCustomer = false;
            if (customerId != null) {
                // Tìm các chuyến đã hoàn thành của tài xế này với khách hàng
                List<TripDrivers> driverTrips = tripDriverRepository.findAllByDriverId(d.getId());
                hasHistoryWithCustomer = driverTrips.stream().anyMatch(td -> {
                    Trips t = td.getTrip();
                    if (t.getStatus() != TripStatus.COMPLETED) return false;
                    if (t.getBooking() == null || t.getBooking().getCustomer() == null) return false;
                    return t.getBooking().getCustomer().getId().equals(customerId);
                });
            }
            List<String> reasons = new ArrayList<>();
            boolean eligible = true;
            int score = 0;

            // 1) Check day-off (nghỉ phép)
            boolean dayOff = !driverDayOffRepository
                    .findApprovedDayOffOnDate(d.getId(), DriverDayOffStatus.APPROVED, tripDate)
                    .isEmpty();
            if (dayOff) {
                eligible = false;
                reasons.add("Đang nghỉ phép");
            } else {
                reasons.add("Không nghỉ phép");
            }

            // 2) Check license expiry
            if (d.getLicenseExpiry() != null && d.getLicenseExpiry().isBefore(tripDate)) {
                eligible = false;
                reasons.add("Bằng lái hết hạn");
            } else {
                reasons.add("Bằng lái còn hạn");
            }

            // 3) Check license class vs vehicle capacity
            // Hạng D: Lái xe từ 10-30 chỗ
            // Hạng E: Lái xe trên 30 chỗ
            // Hạng B1/B2: Lái xe dưới 9 chỗ
            Integer maxSeatsRequired = getMaxSeatsFromBooking(trip.getBooking());
            String licenseClass = d.getLicenseClass() != null ? d.getLicenseClass().toUpperCase() : "";
            boolean licenseClassValid = isLicenseClassValidForSeats(licenseClass, maxSeatsRequired);
            if (!licenseClassValid) {
                eligible = false;
                reasons.add(String.format("Bằng %s không đủ hạng cho xe %d chỗ", licenseClass, maxSeatsRequired));
            } else {
                reasons.add(String.format("Bằng %s phù hợp xe %d chỗ", licenseClass, maxSeatsRequired != null ? maxSeatsRequired : 0));
            }

            // 4) Check time overlap
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
                eligible = false;
                reasons.add("Trùng giờ với chuyến khác");
            } else {
                reasons.add("Rảnh tại thời điểm này");
            }

            // 4) Fairness scoring: số chuyến trong ngày
            long tripsToday = driverTrips.stream().filter(td -> {
                Trips t = td.getTrip();
                if (t.getStartTime() == null) return false;
                LocalDate dDate = t.getStartTime().atZone(ZoneId.systemDefault()).toLocalDate();
                return dDate.equals(tripDate);
            }).count();

            // 5) Fairness: số chuyến trong tuần
            LocalDate weekStart = tripDate.minusDays(tripDate.getDayOfWeek().getValue() - 1);
            LocalDate weekEnd = weekStart.plusDays(6);
            long tripsThisWeek = driverTrips.stream().filter(td -> {
                Trips t = td.getTrip();
                if (t.getStartTime() == null) return false;
                LocalDate dDate = t.getStartTime().atZone(ZoneId.systemDefault()).toLocalDate();
                return !dDate.isBefore(weekStart) && !dDate.isAfter(weekEnd);
            }).count();

            // 6) Fairness: mức độ được gán gần đây (recent assignment)
            long recentAssignments = driverTrips.stream().filter(td -> {
                Trips t = td.getTrip();
                if (t.getStartTime() == null) return false;
                LocalDate dDate = t.getStartTime().atZone(ZoneId.systemDefault()).toLocalDate();
                return !dDate.isBefore(tripDate.minusDays(3)); // 3 ngày gần đây
            }).count();

            // Calculate fairness score (lower is better)
            // Trọng số: ngày (40%), tuần (30%), gần đây (30%)
            score = (int) (tripsToday * 40 + tripsThisWeek * 30 + recentAssignments * 30);

            if (eligible) {
                // Thêm thông tin lịch sử với khách hàng
                if (hasHistoryWithCustomer) {
                    reasons.add("✓ Đã từng phục vụ khách hàng này");
                }

                reasons.add(String.format("Số chuyến hôm nay: %d", tripsToday));
                reasons.add(String.format("Số chuyến tuần này: %d", tripsThisWeek));
                reasons.add(String.format("Số chuyến 3 ngày gần: %d", recentAssignments));
                if (score == 0) {
                    reasons.add("Điểm: 0 (chưa có chuyến nào - ưu tiên cao)");
                } else {
                    reasons.add(String.format("Điểm công bằng: %d (thấp = ưu tiên)", score));
                }

                // Chỉ hiển thị rating nếu có lịch sử với khách hàng
                if (hasHistoryWithCustomer && d.getRating() != null && d.getRating().compareTo(BigDecimal.ZERO) > 0) {
                    reasons.add(String.format("Đánh giá: %.1f⭐", d.getRating().doubleValue()));
                }
            }

            String driverName = extractDriverName(d);
            String phone = d.getEmployee() != null && d.getEmployee().getUser() != null
                    ? d.getEmployee().getUser().getPhone() : null;

            candidates.add(org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.DriverCandidate.builder()
                    .id(d.getId())
                    .name(driverName)
                    .phone(phone)
                    .branchName(d.getBranch() != null ? d.getBranch().getBranchName() : null)
                    .licenseClass(d.getLicenseClass())
                    .rating(d.getRating())
                    .tripsToday((int) tripsToday)
                    .score(score)
                    .eligible(eligible)
                    .reasons(reasons)
                    .hasHistoryWithCustomer(hasHistoryWithCustomer)
                    .build());
        }

        // Sort: eligible first, then by score (ascending)
        candidates.sort((a, b) -> {
            if (a.isEligible() != b.isEligible()) {
                return a.isEligible() ? -1 : 1;
            }
            // Sort by score (lower is better - fewer trips = higher priority)
            int scoreCompare = Integer.compare(a.getScore(), b.getScore());
            if (scoreCompare != 0) {
                return scoreCompare;
            }
            // If same score, prioritize by rating (higher is better)
            if (a.getRating() != null && b.getRating() != null) {
                return b.getRating().compareTo(a.getRating());
            }
            return 0;
        });

        return candidates;
    }

    private List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.VehicleCandidate>
    evaluateVehicleCandidates(List<Vehicles> vehicles, Trips trip) {

        List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.VehicleCandidate> candidates = new ArrayList<>();

        for (Vehicles v : vehicles) {
            List<String> reasons = new ArrayList<>();
            boolean eligible = true;
            int score = 0;

            // 1) Check status
            if (v.getStatus() != VehicleStatus.AVAILABLE) {
                eligible = false;
                reasons.add("Xe không sẵn sàng: " + v.getStatus());
            } else {
                reasons.add("Xe sẵn sàng");
            }

            // 2) Check time overlap
            List<TripVehicles> overlaps = tripVehicleRepository.findOverlapsForVehicle(
                    v.getId(),
                    trip.getStartTime(),
                    trip.getEndTime()
            );
            boolean busy = overlaps.stream().anyMatch(tv ->
                    tv.getTrip().getStatus() != TripStatus.CANCELLED
                            && !tv.getTrip().getId().equals(trip.getId())
            );
            if (busy) {
                eligible = false;
                reasons.add("Trùng giờ với chuyến khác");
            } else {
                reasons.add("Rảnh tại thời điểm này");
            }

            // 3) Score based on capacity, mileage, etc. (simple for now)
            score = 0; // Could add: mileage, last maintenance, etc.

            if (eligible) {
                reasons.add("Đủ điều kiện gán");
            }

            candidates.add(org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.VehicleCandidate.builder()
                    .id(v.getId())
                    .plate(v.getLicensePlate())
                    .model(v.getModel())
                    .capacity(v.getCapacity())
                    .status(v.getStatus())
                    .score(score)
                    .eligible(eligible)
                    .reasons(reasons)
                    .build());
        }

        // Sort: eligible first, then by score
        candidates.sort((a, b) -> {
            if (a.isEligible() != b.isEligible()) {
                return a.isEligible() ? -1 : 1;
            }
            return Integer.compare(a.getScore(), b.getScore());
        });

        return candidates;
    }

    private List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.PairSuggestion>
    buildPairSuggestions(
            List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.DriverCandidate> drivers,
            List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.VehicleCandidate> vehicles) {

        List<org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.PairSuggestion> pairs = new ArrayList<>();

        // Only pair eligible candidates
        var eligibleDrivers = drivers.stream().filter(d -> d.isEligible()).limit(5).collect(Collectors.toList());
        var eligibleVehicles = vehicles.stream().filter(v -> v.isEligible()).limit(5).collect(Collectors.toList());

        for (var driver : eligibleDrivers) {
            for (var vehicle : eligibleVehicles) {
                int pairScore = driver.getScore() + vehicle.getScore();
                List<String> pairReasons = new ArrayList<>();
                pairReasons.add(String.format("Tài xế: %s (điểm: %d)", driver.getName(), driver.getScore()));
                pairReasons.add(String.format("Xe: %s (điểm: %d)", vehicle.getPlate(), vehicle.getScore()));
                pairReasons.add(String.format("Tổng điểm: %d", pairScore));

                pairs.add(org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.PairSuggestion.builder()
                        .driver(org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.DriverBrief.builder()
                                .id(driver.getId())
                                .name(driver.getName())
                                .phone(driver.getPhone())
                                .hasHistoryWithCustomer(driver.getHasHistoryWithCustomer())
                                .build())
                        .vehicle(org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.VehicleBrief.builder()
                                .id(vehicle.getId())
                                .plate(vehicle.getPlate())
                                .model(vehicle.getModel())
                                .build())
                        .score(pairScore)
                        .reasons(pairReasons)
                        .build());
            }
        }

        // Sort by score (ascending - lower is better)
        pairs.sort(Comparator.comparingInt(org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse.PairSuggestion::getScore));

        // Return top 10 suggestions
        return pairs.stream().limit(10).collect(Collectors.toList());
    }

    @Override
    public DispatchDashboardResponse getDashboard(Integer branchId, LocalDate date) {
        if (branchId == null) {
            throw new IllegalArgumentException("Mã chi nhánh là bắt buộc");
        }

        Instant from;
        Instant to;
        LocalDate targetDate;

        if (date != null) {
            // Nếu có date cụ thể: lấy trong ngày đó
            targetDate = date;
            from = targetDate.atStartOfDay(DEFAULT_ZONE).toInstant();
            to = targetDate.plusDays(1).atStartOfDay(DEFAULT_ZONE).toInstant();
        } else {
            // Nếu không có date: lấy từ hiện tại đến tương lai (1 năm)
            targetDate = LocalDate.now();
            from = Instant.now();
            to = LocalDate.now().plusYears(1).atStartOfDay(DEFAULT_ZONE).toInstant();
        }

        List<PendingTripResponse> pending = getPendingTrips(branchId, from, to);
        List<Drivers> drivers = driverRepository.findByBranchId(branchId);
        List<Vehicles> vehicles = vehicleRepository.filterVehicles(null, branchId, null);
        if (vehicles == null) {
            vehicles = new ArrayList<>();
        }
        List<Trips> tripsInDay = tripRepository.findByBooking_Branch_IdAndStartTimeBetween(branchId, from, to);

        // ===== THỐNG KÊ =====
        int pendingCount = 0;
        int assignedCount = 0;
        int cancelledCount = 0;
        int completedCount = 0;
        int inProgressCount = 0;

        for (Trips trip : tripsInDay) {
            TripStatus status = trip.getStatus();
            if (status == TripStatus.CANCELLED) {
                cancelledCount++;
            } else if (status == TripStatus.COMPLETED) {
                completedCount++;
            } else if (status == TripStatus.ONGOING) {
                inProgressCount++;
            } else if (status == TripStatus.SCHEDULED) {
                // Kiểm tra đã gán driver/vehicle chưa
                List<TripDrivers> td = tripDriverRepository.findByTripId(trip.getId());
                List<TripVehicles> tv = tripVehicleRepository.findByTripId(trip.getId());
                if (td.isEmpty() && tv.isEmpty()) {
                    pendingCount++;
                } else {
                    assignedCount++;
                }
            }
        }
        // ===== END THỐNG KÊ =====

        Map<Integer, List<TripDrivers>> tripDriverMap = new HashMap<>();
        Map<Integer, List<TripVehicles>> tripVehicleMap = new HashMap<>();

        List<DispatchDashboardResponse.DriverScheduleItem> driverSchedules = drivers.stream()
                .map(driver -> buildDriverSchedule(driver, tripsInDay, tripDriverMap, targetDate))
                .collect(Collectors.toList());

        List<DispatchDashboardResponse.VehicleScheduleItem> vehicleSchedules = vehicles.stream()
                .map(vehicle -> buildVehicleSchedule(vehicle, tripsInDay, tripVehicleMap, targetDate))
                .collect(Collectors.toList());

        return DispatchDashboardResponse.builder()
                .pendingCount(pendingCount)
                .assignedCount(assignedCount)
                .cancelledCount(cancelledCount)
                .completedCount(completedCount)
                .inProgressCount(inProgressCount)
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
            throw new RuntimeException("Mã đơn hàng là bắt buộc");
        }

        Bookings booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + request.getBookingId()));

        // Check điều kiện thanh toán trước khi gán chuyến
        // Cho phép gán nếu:
        // 1. Có deposit đã xác nhận HOẶC
        // 2. Đã thu >= 30% tổng giá trị HOẶC
        // 3. Đã hoàn thành thanh toán (100%)

        List<org.example.ptcmssbackend.entity.Invoices> allInvoices = invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId());

        // Tính tổng tiền đã thu (CONFIRMED)
        BigDecimal totalPaid = BigDecimal.ZERO;
        boolean hasConfirmedDeposit = false;

        for (var inv : allInvoices) {
            var payments = paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(inv.getId());
            if (payments != null) {
                for (var payment : payments) {
                    if (payment.getConfirmationStatus() == org.example.ptcmssbackend.enums.PaymentConfirmationStatus.CONFIRMED) {
                        totalPaid = totalPaid.add(payment.getAmount());

                        // Check nếu là deposit
                        if (Boolean.TRUE.equals(inv.getIsDeposit())) {
                            hasConfirmedDeposit = true;
                        }
                    }
                }
            }
        }

        // Lấy tổng giá trị booking
        BigDecimal totalBookingAmount = booking.getTotalCost() != null ? booking.getTotalCost() : BigDecimal.ZERO;

        // Tính % đã thanh toán
        BigDecimal paymentPercentage = BigDecimal.ZERO;
        if (totalBookingAmount.compareTo(BigDecimal.ZERO) > 0) {
            paymentPercentage = totalPaid.multiply(BigDecimal.valueOf(100)).divide(totalBookingAmount, 2, java.math.RoundingMode.HALF_UP);
        }

        // Kiểm tra điều kiện
        boolean canAssign = hasConfirmedDeposit ||
                paymentPercentage.compareTo(BigDecimal.valueOf(30)) >= 0 ||
                paymentPercentage.compareTo(BigDecimal.valueOf(100)) >= 0;

        if (!canAssign) {
            throw new RuntimeException(String.format(
                    "Đơn hàng chưa đủ điều kiện gán chuyến. Đã thu: %s/%s (%.2f%%). " +
                            "Yêu cầu: Có tiền cọc đã xác nhận HOẶC đã thu >= 30%% tổng giá trị.",
                    totalPaid, totalBookingAmount, paymentPercentage
            ));
        }

        log.info("[Dispatch] Payment check passed - Paid: {}/{} ({}%), Has deposit: {}",
                totalPaid, totalBookingAmount, paymentPercentage, hasConfirmedDeposit);

        List<Trips> trips = tripRepository.findByBooking_Id(booking.getId());
        if (trips.isEmpty()) {
            throw new RuntimeException("Không tìm thấy chuyến đi cho đơn hàng " + booking.getId());
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
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi để phân công tự động"));

            if (driverId == null) {
                // Tính tổng quãng đường của booking để quyết định số lượng tài xế
                double totalDistance = trips.stream()
                        .filter(t -> targetTripIds.contains(t.getId()))
                        .mapToDouble(t -> t.getDistance() != null ? t.getDistance().doubleValue() : 0.0)
                        .sum();

                // Lấy ngưỡng từ SystemSettings (mặc định 300km)
                int maxDistanceForSingleDriver = getSystemSettingInt("SINGLE_DRIVER_MAX_DISTANCE_KM", 300);

                if (totalDistance > maxDistanceForSingleDriver) {
                    // Chuyến dài: cần 2 tài xế
                    log.info("[Dispatch] Long trip detected ({} km > {} km), assigning 2 drivers", totalDistance, maxDistanceForSingleDriver);
                    List<Integer> driverIds = pickDriversForLongTrip(booking, representativeTrip, 2);
                    if (driverIds.size() >= 2) {
                        driverId = driverIds.get(0); // Gán tài xế đầu tiên
                        // Tài xế thứ 2 sẽ được gán sau trong logic assign
                        request.setSecondDriverId(driverIds.get(1));
                    } else if (driverIds.size() == 1) {
                        driverId = driverIds.get(0);
                        log.warn("[Dispatch] Only 1 driver available for long trip, assigning single driver");
                    } else {
                        driverId = pickBestDriverForTrip(booking, representativeTrip);
                    }
                } else {
                    // Chuyến ngắn: chỉ cần 1 tài xế
                    driverId = pickBestDriverForTrip(booking, representativeTrip);
                }
            }
            if (vehicleId == null) {
                vehicleId = pickBestVehicleForTrip(booking, representativeTrip);
            }
        }

        // Tới đây, nếu vẫn không có driverId hoặc vehicleId thì coi như lỗi (có thể mềm dẻo hơn)
        if (driverId == null && vehicleId == null) {
            throw new RuntimeException("Chưa chỉ định tài xế hoặc xe để phân công");
        }

        // Sử dụng BookingService.assign để tái dùng logic gán driver/vehicle cho tất cả trips được chọn
        org.example.ptcmssbackend.dto.request.Booking.AssignRequest bookingAssignReq =
                new org.example.ptcmssbackend.dto.request.Booking.AssignRequest();
        bookingAssignReq.setTripIds(targetTripIds);
        bookingAssignReq.setDriverId(driverId);
        bookingAssignReq.setVehicleId(vehicleId);
        bookingAssignReq.setNote(request.getNote());

        var bookingResponse = bookingService.assign(booking.getId(), bookingAssignReq);

        // Nếu có tài xế thứ 2 (cho chuyến dài), gán thêm
        if (request.getSecondDriverId() != null) {
            log.info("[Dispatch] Assigning second driver {} for long trip", request.getSecondDriverId());
            Drivers secondDriver = driverRepository.findById(request.getSecondDriverId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy tài xế phụ: " + request.getSecondDriverId()));

            for (Integer tid : targetTripIds) {
                // Check xem đã có tài xế thứ 2 chưa
                List<TripDrivers> existingDrivers = tripDriverRepository.findByTripId(tid);
                boolean alreadyHasSecondDriver = existingDrivers.stream()
                        .anyMatch(td -> td.getDriver().getId().equals(secondDriver.getId()));

                if (!alreadyHasSecondDriver) {
                    TripDrivers td = new TripDrivers();
                    TripDriverId id = new TripDriverId();
                    id.setTripId(tid);
                    id.setDriverId(secondDriver.getId());
                    td.setId(id);
                    Trips trip = trips.stream().filter(t -> t.getId().equals(tid)).findFirst().orElseThrow();
                    td.setTrip(trip);
                    td.setDriver(secondDriver);
                    td.setDriverRole("Co-Driver"); // Tài xế thay ca
                    td.setNote("Tài xế thứ 2 cho chuyến dài");
                    tripDriverRepository.save(td);
                    log.info("[Dispatch] Assigned second driver {} to trip {}", secondDriver.getId(), tid);
                }
            }
        }

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

        AssignRespone response = AssignRespone.builder()
                .bookingId(booking.getId())
                .bookingStatus(bookingResponse.getStatus())
                .trips(tripInfos)
                .build();

        // Send WebSocket notifications for trip assignment
        try {
            String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "Khách hàng";
            String bookingCode = "ORD-" + booking.getId();

            // Get driver and vehicle info
            String driverInfo = "";
            String vehicleInfo = "";

            if (!tripInfos.isEmpty()) {
                AssignRespone.AssignedTripInfo firstTrip = tripInfos.get(0);
                if (firstTrip.getDriverName() != null) {
                    driverInfo = " - TX: " + firstTrip.getDriverName();
                }
                if (firstTrip.getVehicleLicensePlate() != null) {
                    vehicleInfo = " - Xe: " + firstTrip.getVehicleLicensePlate();
                }
            }

            // Global notification
            webSocketNotificationService.sendGlobalNotification(
                    "Đã gán chuyến",
                    String.format("Đơn %s - %s%s%s",
                            bookingCode,
                            customerName,
                            driverInfo,
                            vehicleInfo),
                    "SUCCESS"
            );

            // Dispatch update notification
            webSocketNotificationService.sendDispatchUpdate(
                    booking.getId(),
                    "ASSIGNED",
                    String.format("Đã gán %d chuyến%s%s",
                            tripInfos.size(),
                            driverInfo,
                            vehicleInfo)
            );

            // Booking update notification
            webSocketNotificationService.sendBookingUpdate(
                    booking.getId(),
                    "ASSIGNED",
                    String.format("Đã gán tài xế và xe cho %d chuyến", tripInfos.size())
            );

            // Send notification to specific driver if available
            if (driverId != null) {
                Drivers driver = driverRepository.findById(driverId).orElse(null);
                if (driver != null && driver.getEmployee() != null && driver.getEmployee().getUser() != null) {
                    Integer userId = driver.getEmployee().getUser().getId();
                    webSocketNotificationService.sendUserNotification(
                            userId,
                            "Chuyến mới được gán",
                            String.format("Bạn được gán %d chuyến cho đơn %s",
                                    tripInfos.size(),
                                    bookingCode),
                            "INFO"
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification for trip assignment", e);
        }

        return response;
    }

    // =========================================================
    // 3) UNASSIGN
    // =========================================================
    @Override
    public void unassign(Integer tripId, String note) {
        log.info("[Dispatch] Unassign trip {}", tripId);
        Trips trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi: " + tripId));

        // Xoá driver mapping
        List<TripDrivers> tds = tripDriverRepository.findByTripId(tripId);
        if (!tds.isEmpty()) {
            tripDriverRepository.deleteAll(tds);
        }

        // Send WebSocket notification for unassignment
        try {
            Bookings booking = trip.getBooking();
            String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "Khách hàng";
            String bookingCode = "ORD-" + booking.getId();

            webSocketNotificationService.sendGlobalNotification(
                    "Đã hủy gán chuyến",
                    String.format("Chuyến #%d (Đơn %s - %s) đã được hủy gán",
                            tripId,
                            bookingCode,
                            customerName),
                    "WARNING"
            );

            webSocketNotificationService.sendDispatchUpdate(
                    booking.getId(),
                    "UNASSIGNED",
                    String.format("Đã hủy gán chuyến #%d", tripId)
            );
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification for trip unassignment", e);
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
        log.info("[Dispatch] Reassigning - bookingId: {}, tripIds: {}, driverId: {}, vehicleId: {}",
                request.getBookingId(), request.getTripIds(), request.getDriverId(), request.getVehicleId());

        // Validate vehicle category if changing vehicle
        if (request.getVehicleId() != null) {
            validateVehicleCategoryForReassign(request);
        }

        // Unassign current assignments
        if (request.getTripIds() != null && !request.getTripIds().isEmpty()) {
            for (Integer tid : request.getTripIds()) {
                unassign(tid, request.getNote());
            }
        } else if (request.getBookingId() != null) {
            List<Trips> trips = tripRepository.findByBooking_Id(request.getBookingId());
            for (Trips t : trips) {
                unassign(t.getId(), request.getNote());
            }
        }

        // Assign with new driver/vehicle
        return assign(request);
    }

    /**
     * Validate that new vehicle belongs to same category as booking requirements
     */
    private void validateVehicleCategoryForReassign(AssignRequest request) {
        try {
            Vehicles newVehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy xe: " + request.getVehicleId()));

            Integer bookingId = request.getBookingId();
            if (bookingId == null && request.getTripIds() != null && !request.getTripIds().isEmpty()) {
                // Get booking from first trip
                Trips trip = tripRepository.findById(request.getTripIds().get(0))
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến: " + request.getTripIds().get(0)));
                bookingId = trip.getBooking().getId();
            }

            if (bookingId == null) {
                log.warn("[Dispatch] Cannot validate vehicle category - no bookingId");
                return;
            }

            // Get vehicle categories from booking
            List<BookingVehicleDetails> bookingVehicles = bookingVehicleDetailsRepository.findByBookingId(bookingId);
            if (bookingVehicles == null || bookingVehicles.isEmpty()) {
                log.warn("[Dispatch] No vehicle details found for booking {}", bookingId);
                return;
            }

            // Check if new vehicle matches any required category
            VehicleCategoryPricing newVehicleCategory = newVehicle.getCategory();
            if (newVehicleCategory == null) {
                throw new RuntimeException("Xe mới không có loại xe (category) được xác định");
            }

            boolean matchesCategory = bookingVehicles.stream()
                    .anyMatch(bv -> {
                        VehicleCategoryPricing bookingCategory = bv.getVehicleCategory();
                        if (bookingCategory == null) return false;

                        // Same category ID
                        if (bookingCategory.getId().equals(newVehicleCategory.getId())) {
                            return true;
                        }

                        // Or same seats capacity (flexible matching)
                        if (bookingCategory.getSeats() != null && newVehicleCategory.getSeats() != null) {
                            return bookingCategory.getSeats().equals(newVehicleCategory.getSeats());
                        }

                        return false;
                    });

            if (!matchesCategory) {
                String requiredCategories = bookingVehicles.stream()
                        .map(bv -> {
                            VehicleCategoryPricing cat = bv.getVehicleCategory();
                            return cat != null ? cat.getCategoryName() + " (" + cat.getSeats() + " chỗ)" : "N/A";
                        })
                        .collect(Collectors.joining(", "));

                throw new RuntimeException(String.format(
                        "❌ Xe mới (%s - %s chỗ) không cùng loại với yêu cầu đơn hàng.\n" +
                                "Loại xe yêu cầu: %s\n" +
                                "Vui lòng chọn xe cùng loại (số chỗ ngồi tương đương).",
                        newVehicleCategory.getCategoryName(),
                        newVehicleCategory.getSeats(),
                        requiredCategories
                ));
            }

            log.info("[Dispatch] Vehicle category validation passed for vehicle {} ({})",
                    newVehicle.getId(), newVehicleCategory.getCategoryName());

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Dispatch] Error validating vehicle category", e);
            throw new RuntimeException("Lỗi khi kiểm tra loại xe: " + e.getMessage());
        }
    }

    @Override
    public void driverAcceptTrip(Integer tripId) {

    }

    @Override
    @Transactional(readOnly = true)
    public TripDetailResponse getTripDetail(Integer tripId) {
        Trips trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi: " + tripId));

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

        // Tính số tiền còn lại cần thanh toán
        java.math.BigDecimal totalCost = booking.getTotalCost() != null ? booking.getTotalCost() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal remainingAmount = totalCost.subtract(depositAmount);

        // Lấy rating nếu có
        var ratingOpt = driverRatingsRepository.findByTrip_Id(trip.getId());
        java.math.BigDecimal rating = ratingOpt.map(r -> r.getOverallRating()).orElse(null);
        String ratingComment = ratingOpt.map(r -> r.getComment()).orElse(null);

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
                .bookingNote(booking.getNote())
                .totalCost(totalCost)
                .depositAmount(depositAmount)
                .remainingAmount(remainingAmount)
                .rating(rating)
                .ratingComment(ratingComment)
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

            // 3) Check hạng bằng lái phù hợp với loại xe
            Integer maxSeats = getMaxSeatsFromBooking(booking);
            String licenseClass = d.getLicenseClass() != null ? d.getLicenseClass() : "";
            if (!isLicenseClassValidForSeats(licenseClass, maxSeats)) {
                log.debug("Driver {} license class {} not valid for {} seats, skip", d.getId(), licenseClass, maxSeats);
                continue;
            }

            // 4) Check trùng giờ (trip SCHEDULED/ONGOING)
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

            // 5) Fairness: số chuyến đã chạy trong ngày
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
        scored.sort(Comparator.comparingInt(CandidateScore::getScore));
        Drivers best = scored.get(0).getCandidate();
        log.info("[Dispatch] Auto-picked driver {} for trip {}", best.getId(), trip.getId());
        return best.getId();
    }

    /**
     * Chọn nhiều tài xế cho chuyến dài (cần 2 tài xế thay ca)
     */
    private List<Integer> pickDriversForLongTrip(Bookings booking, Trips trip, int numberOfDrivers) {
        Integer branchId = booking.getBranch().getId();
        log.info("[Dispatch] Picking {} drivers for long trip, branch {}, trip {}", numberOfDrivers, branchId, trip.getId());

        List<Drivers> candidates = driverRepository.findByBranchId(branchId);
        if (candidates.isEmpty()) {
            log.warn("[Dispatch] No drivers found in branch {}", branchId);
            return new ArrayList<>();
        }

        LocalDate tripDate = trip.getStartTime()
                .atZone(ZoneId.systemDefault())
                .toLocalDate();

        List<CandidateScore<Drivers>> scored = new ArrayList<>();

        for (Drivers d : candidates) {
            // Check nghỉ phép
            boolean dayOff = !driverDayOffRepository
                    .findApprovedDayOffOnDate(d.getId(), DriverDayOffStatus.APPROVED, tripDate)
                    .isEmpty();
            if (dayOff) continue;

            // Check hạn bằng lái
            if (d.getLicenseExpiry() != null && d.getLicenseExpiry().isBefore(tripDate)) {
                continue;
            }

            // Check hạng bằng lái phù hợp với loại xe
            Integer maxSeats = getMaxSeatsFromBooking(booking);
            String licenseClass = d.getLicenseClass() != null ? d.getLicenseClass() : "";
            if (!isLicenseClassValidForSeats(licenseClass, maxSeats)) {
                log.debug("Driver {} license class {} not valid for {} seats, skip", d.getId(), licenseClass, maxSeats);
                continue;
            }

            // Check trùng giờ
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
            if (overlap) continue;

            // Tính score: số chuyến trong ngày + priorityLevel (ưu tiên priorityLevel cao)
            long todayTrips = driverTrips.stream().filter(td -> {
                Trips t = td.getTrip();
                if (t.getStartTime() == null) return false;
                LocalDate dDate = t.getStartTime().atZone(ZoneId.systemDefault()).toLocalDate();
                return dDate.equals(tripDate);
            }).count();

            // PriorityLevel cao hơn = tốt hơn, nên trừ đi để score thấp hơn
            int priorityScore = d.getPriorityLevel() != null ? (11 - d.getPriorityLevel()) : 5;
            scored.add(new CandidateScore<>(d, (int) todayTrips + priorityScore));
        }

        if (scored.isEmpty()) {
            log.warn("[Dispatch] No eligible drivers found for long trip {}", trip.getId());
            return new ArrayList<>();
        }

        // Sắp xếp và chọn N tài xế tốt nhất
        scored.sort(Comparator.comparingInt(CandidateScore::getScore));
        return scored.stream()
                .limit(numberOfDrivers)
                .map(cs -> cs.getCandidate().getId())
                .collect(Collectors.toList());
    }

    /**
     * Helper method: Lấy giá trị int từ SystemSettings
     */
    private int getSystemSettingInt(String key, int defaultValue) {
        try {
            var setting = systemSettingService.getByKey(key);
            if (setting != null && setting.getSettingValue() != null) {
                return Integer.parseInt(setting.getSettingValue());
            }
        } catch (Exception e) {
            log.warn("Cannot get system setting {}: {}", key, e.getMessage());
        }
        return defaultValue;
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

        scored.sort(Comparator.comparingInt(CandidateScore::getScore));
        Vehicles best = scored.get(0).getCandidate();
        log.info("[Dispatch] Auto-picked vehicle {} for trip {}", best.getId(), trip.getId());
        return best.getId();
    }


    // Helper generic
    private static class CandidateScore<T> {
        private final T candidate;
        private final int score;

        public CandidateScore(T candidate, int score) {
            this.candidate = candidate;
            this.score = score;
        }

        public T getCandidate() { return candidate; }
        public int getScore() { return score; }
    }

    /**
     * Lấy số ghế tối đa từ các loại xe trong booking
     */
    private Integer getMaxSeatsFromBooking(Bookings booking) {
        if (booking == null) return null;

        try {
            List<BookingVehicleDetails> vehicleDetails = bookingVehicleDetailsRepository.findByBookingId(booking.getId());
            if (vehicleDetails == null || vehicleDetails.isEmpty()) {
                return null;
            }

            return vehicleDetails.stream()
                    .map(vd -> vd.getVehicleCategory())
                    .filter(cat -> cat != null && cat.getSeats() != null)
                    .mapToInt(cat -> cat.getSeats())
                    .max()
                    .orElse(0);
        } catch (Exception e) {
            log.warn("Cannot get max seats from booking {}: {}", booking.getId(), e.getMessage());
            return null;
        }
    }

    /**
     * Kiểm tra hạng bằng lái có đủ để lái xe với số ghế yêu cầu không
     *
     * Quy định bằng lái VN:
     * - Hạng B1: Xe ô tô chở người đến 9 chỗ ngồi
     * - Hạng B2: Xe ô tô chở người đến 9 chỗ ngồi (có thể lái xe tải)
     * - Hạng C: Xe tải, xe chuyên dùng
     * - Hạng D: Xe ô tô chở người từ 10-30 chỗ ngồi
     * - Hạng E: Xe ô tô chở người trên 30 chỗ ngồi
     * - Hạng F: Các loại xe hạng B, C, D, E có kéo rơ moóc
     */
    private boolean isLicenseClassValidForSeats(String licenseClass, Integer seats) {
        if (licenseClass == null || licenseClass.isEmpty()) {
            return false; // Không có bằng lái -> không hợp lệ
        }
        if (seats == null || seats <= 0) {
            return true; // Không có thông tin số ghế -> bỏ qua check
        }

        String upperClass = licenseClass.toUpperCase().trim();

        // Hạng E hoặc F: Lái được tất cả loại xe khách
        if (upperClass.equals("E") || upperClass.startsWith("F")) {
            return true;
        }

        // Hạng D: Lái được xe từ 10-30 chỗ (và cả dưới 10 chỗ)
        if (upperClass.equals("D")) {
            return seats <= 30;
        }

        // Hạng B1, B2: Chỉ lái được xe dưới 9 chỗ
        if (upperClass.equals("B1") || upperClass.equals("B2") || upperClass.equals("B")) {
            return seats <= 9;
        }

        // Hạng C: Xe tải, không phù hợp cho xe khách (trừ trường hợp đặc biệt)
        if (upperClass.equals("C")) {
            return seats <= 9; // Tạm cho phép lái xe nhỏ
        }

        // Các hạng khác (A1, A2, A3, A4...): Không lái được xe khách
        return false;
    }
}

