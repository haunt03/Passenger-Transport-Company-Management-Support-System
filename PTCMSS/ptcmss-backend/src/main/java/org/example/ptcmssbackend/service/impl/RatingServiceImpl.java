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
    private final TripDriversRepository tripDriversRepository;
    private final BookingRepository bookingRepository;

    @Override
    @Transactional
    public RatingResponse createRating(RatingRequest request, Integer userId) {
        log.info("Creating rating for trip {} by user {}", request.getTripId(), userId);
        
        // Validate trip exists and is COMPLETED
        Trips trip = tripsRepository.findById(request.getTripId())
            .orElseThrow(() -> new RuntimeException("Trip not found"));
        
        if (trip.getStatus() != TripStatus.COMPLETED) {
            throw new RuntimeException("Can only rate completed trips");
        }
        
        // Check if already rated
        if (ratingsRepository.findByTrip_Id(request.getTripId()).isPresent()) {
            throw new RuntimeException("Trip already rated");
        }
        
        // Get driver from trip (via TripDrivers)
        TripDrivers tripDriver = tripDriversRepository.findMainDriverByTripId(request.getTripId())
            .orElseThrow(() -> new RuntimeException("No driver assigned to this trip"));
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
        
        // Save (trigger will calculate overallRating)
        rating = ratingsRepository.save(rating);
        
        // Update driver's overall rating (30-day average)
        updateDriverOverallRating(driver.getId());
        
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
            .orElseThrow(() -> new RuntimeException("Driver not found"));
        
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
    public List<TripForRatingResponse> getCompletedTripsForRating() {
        log.info("Getting completed trips for rating");
        
        List<Trips> completedTrips = tripsRepository.findByStatusOrderByEndTimeDesc(TripStatus.COMPLETED);
        
        return completedTrips.stream()
            .map(this::mapTripToResponse)
            .collect(Collectors.toList());
    }

    private TripForRatingResponse mapTripToResponse(Trips trip) {
        // Get main driver
        TripDrivers tripDriver = tripDriversRepository.findMainDriverByTripId(trip.getId()).orElse(null);
        
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
        if (trip.getBooking() != null && trip.getBooking().getCustomer() != null) {
            customerId = trip.getBooking().getCustomer().getId();
            customerName = trip.getBooking().getCustomer().getFullName();
        }
        
        return TripForRatingResponse.builder()
            .tripId(trip.getId())
            .bookingId(trip.getBooking() != null ? trip.getBooking().getId() : null)
            .driverId(driverId)
            .driverName(driverName)
            .customerId(customerId)
            .customerName(customerName)
            .startLocation(trip.getStartLocation())
            .endLocation(trip.getEndLocation())
            .startTime(trip.getStartTime())
            .endTime(trip.getEndTime())
            .status(trip.getStatus() != null ? trip.getStatus().name() : null)
            .build();
    }
}
