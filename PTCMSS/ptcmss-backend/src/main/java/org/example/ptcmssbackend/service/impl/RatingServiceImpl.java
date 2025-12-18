package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.DriverPerformanceResponse;
import org.example.ptcmssbackend.dto.RatingRequest;
import org.example.ptcmssbackend.dto.RatingResponse;
import org.example.ptcmssbackend.dto.TripForRatingResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.RatingService;
import org.example.ptcmssbackend.service.WebSocketNotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {

    private final DriverRatingsRepository ratingsRepository;
    private final TripRepository tripsRepository;
    private final DriverRepository driversRepository;
    private final UsersRepository usersRepository;
    private final CustomerRepository customersRepository;
    private final TripDriverRepository tripDriverRepository;
    private final BookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationService webSocketNotificationService;

    @Override
    @Transactional
    public RatingResponse createRating(RatingRequest request, Integer userId) {
        log.info("Creating rating for trip {} by user {}", request.getTripId(), userId);

        // Validate trip exists and is COMPLETED
        Trips trip = tripsRepository.findById(request.getTripId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến đi"));

        if (trip.getStatus() != TripStatus.COMPLETED) {
            throw new RuntimeException("Chỉ có thể đánh giá các chuyến đi đã hoàn thành");
        }

        // Check if already rated
        if (ratingsRepository.findByTrip_Id(request.getTripId()).isPresent()) {
            throw new RuntimeException("Chuyến đi đã được đánh giá");
        }

        // Get driver from trip (via TripDrivers)
        TripDrivers tripDriver = null;
        try {
            tripDriver = tripDriverRepository.findFirstMainDriverByTripId(request.getTripId());
        } catch (Exception e) {
            // Fallback: get first driver from trip
            List<TripDrivers> tripDrivers = tripDriverRepository.findByTrip_Id(request.getTripId());
            if (!tripDrivers.isEmpty()) {
                tripDriver = tripDrivers.get(0);
            }
        }

        if (tripDriver == null) {
            throw new RuntimeException("Chưa có tài xế được phân công cho chuyến đi này");
        }
        Drivers driver = tripDriver.getDriver();

        // Get customer
        Customers customer = trip.getBooking() != null ? trip.getBooking().getCustomer() : null;

        // Get user
        Users ratedByUser = usersRepository.findById(userId).orElse(null);

        // Create rating
        DriverRatings rating = new DriverRatings();
        rating.setTrip(trip);
        rating.setDriver(driver);
        rating.setCustomer(customer);
        rating.setPunctualityRating(request.getPunctualityRating());
        rating.setAttitudeRating(request.getAttitudeRating());
        rating.setSafetyRating(request.getSafetyRating());
        rating.setComplianceRating(request.getComplianceRating());
        rating.setComment(request.getComment());
        rating.setRatedBy(ratedByUser);
        rating.setRatedAt(Instant.now());

        // Calculate overallRating as average of 4 criteria
        BigDecimal overallRating = calculateOverallRating(
                request.getPunctualityRating(),
                request.getAttitudeRating(),
                request.getSafetyRating(),
                request.getComplianceRating()
        );
        rating.setOverallRating(overallRating);

        // Save
        rating = ratingsRepository.save(rating);

        // Update driver's overall rating (30-day average)
        updateDriverOverallRating(driver.getId());

        // GỬI THÔNG BÁO CHO TÀI XẾ
        sendRatingNotificationToDriver(rating, driver, trip);

        log.info("Rating created successfully: {}", rating.getId());
        return mapToResponse(rating);
    }

    @Override
    public RatingResponse getRatingByTrip(Integer tripId) {
        return ratingsRepository.findByTrip_Id(tripId)
                .map(this::mapToResponse)
                .orElse(null);
    }

    @Override
    public List<RatingResponse> getDriverRatings(Integer driverId, Integer limit) {
        List<DriverRatings> ratings = ratingsRepository.findByDriver_IdOrderByRatedAtDesc(driverId);

        if (limit != null && limit > 0) {
            ratings = ratings.stream().limit(limit).collect(Collectors.toList());
        }

        return ratings.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public DriverPerformanceResponse getDriverPerformance(Integer driverId, Integer days) {
        log.info("Getting performance for driver {} for last {} days", driverId, days);

        Drivers driver = driversRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài xế"));

        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        List<DriverRatings> ratings = ratingsRepository
                .findByDriver_IdAndRatedAtAfterOrderByRatedAtDesc(driverId, since);

        // Calculate averages
        BigDecimal avgPunctuality = calculateAverage(ratings, DriverRatings::getPunctualityRating);
        BigDecimal avgAttitude = calculateAverage(ratings, DriverRatings::getAttitudeRating);
        BigDecimal avgSafety = calculateAverage(ratings, DriverRatings::getSafetyRating);
        BigDecimal avgCompliance = calculateAverage(ratings, DriverRatings::getComplianceRating);
        BigDecimal avgOverall = calculateAverage(ratings, DriverRatings::getOverallRating);

        // Get recent ratings (limit 10)
        List<RatingResponse> recentRatings = ratings.stream()
                .limit(10)
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        String driverName = driver.getEmployee() != null && driver.getEmployee().getUser() != null
                ? driver.getEmployee().getUser().getFullName()
                : "Unknown";

        return DriverPerformanceResponse.builder()
                .driverId(driverId)
                .driverName(driverName)
                .days(days)
                .totalRatings(ratings.size())
                .avgPunctuality(avgPunctuality)
                .avgAttitude(avgAttitude)
                .avgSafety(avgSafety)
                .avgCompliance(avgCompliance)
                .avgOverall(avgOverall)
                .recentRatings(recentRatings)
                .build();
    }

    private void updateDriverOverallRating(Integer driverId) {
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        BigDecimal avgRating = ratingsRepository.getAverageRatingForDriver(driverId, since);

        if (avgRating != null) {
            driversRepository.findById(driverId).ifPresent(driver -> {
                driver.setRating(avgRating);
                driversRepository.save(driver);
                log.info("Updated driver {} overall rating to {}", driverId, avgRating);
            });
        }
    }

    /**
     * Calculate overall rating as average of 4 criteria
     */
    private BigDecimal calculateOverallRating(Integer punctuality, Integer attitude,
                                              Integer safety, Integer compliance) {
        int count = 0;
        BigDecimal sum = BigDecimal.ZERO;

        if (punctuality != null) {
            sum = sum.add(BigDecimal.valueOf(punctuality));
            count++;
        }
        if (attitude != null) {
            sum = sum.add(BigDecimal.valueOf(attitude));
            count++;
        }
        if (safety != null) {
            sum = sum.add(BigDecimal.valueOf(safety));
            count++;
        }
        if (compliance != null) {
            sum = sum.add(BigDecimal.valueOf(compliance));
            count++;
        }

        if (count == 0) {
            return BigDecimal.ZERO;
        }

        return sum.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateAverage(List<DriverRatings> ratings,
                                        java.util.function.Function<DriverRatings, Object> getter) {
        if (ratings.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return ratings.stream()
                .map(getter)
                .filter(val -> val != null)
                .map(val -> {
                    if (val instanceof Integer) {
                        return BigDecimal.valueOf((Integer) val);
                    } else if (val instanceof BigDecimal) {
                        return (BigDecimal) val;
                    }
                    return BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(ratings.size()), 2, RoundingMode.HALF_UP);
    }

    private RatingResponse mapToResponse(DriverRatings rating) {
        String driverName = rating.getDriver() != null &&
                rating.getDriver().getEmployee() != null &&
                rating.getDriver().getEmployee().getUser() != null
                ? rating.getDriver().getEmployee().getUser().getFullName()
                : "Unknown";

        String customerName = rating.getCustomer() != null
                ? rating.getCustomer().getFullName()
                : null;

        String ratedByName = rating.getRatedBy() != null
                ? rating.getRatedBy().getFullName()
                : null;

        return RatingResponse.builder()
                .ratingId(rating.getId())
                .tripId(rating.getTrip() != null ? rating.getTrip().getId() : null)
                .driverId(rating.getDriver() != null ? rating.getDriver().getId() : null)
                .driverName(driverName)
                .customerId(rating.getCustomer() != null ? rating.getCustomer().getId() : null)
                .customerName(customerName)
                .punctualityRating(rating.getPunctualityRating())
                .attitudeRating(rating.getAttitudeRating())
                .safetyRating(rating.getSafetyRating())
                .complianceRating(rating.getComplianceRating())
                .overallRating(rating.getOverallRating())
                .comment(rating.getComment())
                .ratedAt(rating.getRatedAt())
                .ratedByName(ratedByName)
                .build();
    }

    @Override
    public List<TripForRatingResponse> getCompletedTripsForRating(Integer branchId) {
        log.info("Getting completed trips for rating, branchId: {}", branchId);

        List<Trips> completedTrips = tripsRepository.findByStatusAndBranchIdOrderByEndTimeDesc(
                TripStatus.COMPLETED,
                branchId
        );

        return completedTrips.stream()
                .map(this::mapTripToResponse)
                .collect(Collectors.toList());
    }

    private TripForRatingResponse mapTripToResponse(Trips trip) {
        // Get main driver - handle case where multiple main drivers exist (take first one)
        TripDrivers tripDriver = null;
        try {
            // Try to get first main driver using native query with LIMIT
            tripDriver = tripDriverRepository.findFirstMainDriverByTripId(trip.getId());
        } catch (Exception e) {
            // Fallback: get first driver from trip if native query fails
            log.warn("Error getting main driver for trip {}, using first driver: {}", trip.getId(), e.getMessage());
            List<TripDrivers> tripDrivers = tripDriverRepository.findByTrip_Id(trip.getId());
            if (!tripDrivers.isEmpty()) {
                tripDriver = tripDrivers.get(0);
            }
        }

        String driverName = null;
        Integer driverId = null;
        if (tripDriver != null && tripDriver.getDriver() != null) {
            driverId = tripDriver.getDriver().getId();
            if (tripDriver.getDriver().getEmployee() != null &&
                    tripDriver.getDriver().getEmployee().getUser() != null) {
                driverName = tripDriver.getDriver().getEmployee().getUser().getFullName();
            }
        }

        // Get customer
        String customerName = null;
        Integer customerId = null;
        String customerPhone = null;
        String customerAddress = null;
        if (trip.getBooking() != null && trip.getBooking().getCustomer() != null) {
            var customer = trip.getBooking().getCustomer();
            customerId = customer.getId();
            customerName = customer.getFullName();
            customerPhone = customer.getPhone();
            customerAddress = customer.getAddress();
        }

        return TripForRatingResponse.builder()
                .tripId(trip.getId())
                .bookingId(trip.getBooking() != null ? trip.getBooking().getId() : null)
                .driverId(driverId)
                .driverName(driverName)
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAddress(customerAddress)
                .startLocation(trip.getStartLocation())
                .endLocation(trip.getEndLocation())
                .startTime(trip.getStartTime())
                .endTime(trip.getEndTime())
                .status(trip.getStatus() != null ? trip.getStatus().name() : null)
                .build();
    }

    /**
     * Gửi thông báo cho tài xế khi có đánh giá mới
     */
    private void sendRatingNotificationToDriver(DriverRatings rating, Drivers driver, Trips trip) {
        try {
            // Lấy user của tài xế
            Users driverUser = driver.getEmployee() != null ? driver.getEmployee().getUser() : null;
            if (driverUser == null) {
                log.warn("Cannot send notification: Driver {} has no user account", driver.getId());
                return;
            }

            // Tạo thông báo
            Notifications notification = new Notifications();
            notification.setUser(driverUser);
            notification.setTitle("Đánh giá mới từ khách hàng");

            // Tạo message với thông tin chi tiết
            String customerName = rating.getCustomer() != null
                    ? rating.getCustomer().getFullName()
                    : "Khách hàng";

            String tripInfo = String.format("Chuyến #%d: %s → %s",
                    trip.getId(),
                    trip.getStartLocation() != null ? trip.getStartLocation() : "N/A",
                    trip.getEndLocation() != null ? trip.getEndLocation() : "N/A"
            );

            String ratingInfo = String.format("Điểm: %.1f⭐ - %s",
                    rating.getOverallRating() != null ? rating.getOverallRating().doubleValue() : 0.0,
                    tripInfo
            );

            notification.setMessage(String.format("%s đã đánh giá chuyến đi của bạn. %s",
                    customerName, ratingInfo));
            notification.setIsRead(false);
            notification.setCreatedAt(Instant.now());

            // Lưu vào database
            notificationRepository.save(notification);
            log.info("Notification saved for driver {} (user {})", driver.getId(), driverUser.getId());

            // Gửi real-time notification qua WebSocket
            if (webSocketNotificationService != null) {
                try {
                    webSocketNotificationService.sendUserNotification(
                            driverUser.getId(),
                            notification.getTitle(),
                            notification.getMessage(),
                            "RATING_RECEIVED"
                    );
                    log.info("Real-time notification sent to driver {} via WebSocket", driver.getId());
                } catch (Exception e) {
                    log.warn("Failed to send WebSocket notification to driver {}: {}",
                            driver.getId(), e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("Failed to send rating notification to driver {}: {}",
                    driver.getId(), e.getMessage(), e);
        }
    }
}
