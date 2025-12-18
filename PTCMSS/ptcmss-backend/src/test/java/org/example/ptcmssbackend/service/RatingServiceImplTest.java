package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.DriverPerformanceResponse;
import org.example.ptcmssbackend.dto.RatingRequest;
import org.example.ptcmssbackend.dto.RatingResponse;
import org.example.ptcmssbackend.dto.TripForRatingResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.RatingServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RatingServiceImplTest {

    @Mock
    private DriverRatingsRepository ratingsRepository;
    @Mock
    private TripRepository tripsRepository;
    @Mock
    private DriverRepository driversRepository;
    @Mock
    private UsersRepository usersRepository;
    @Mock
    private CustomerRepository customersRepository;
    @Mock
    private TripDriversRepository tripDriversRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;

    @InjectMocks
    private RatingServiceImpl ratingService;

    // ==================== createRating() Tests ====================

    @Test
    void createRating_whenValidRequest_shouldCreateSuccessfully() {
        // Given
        Integer userId = 100;
        RatingRequest request = new RatingRequest();
        request.setTripId(200);
        request.setPunctualityRating(5);
        request.setAttitudeRating(4);
        request.setSafetyRating(5);
        request.setComplianceRating(4);
        request.setComment("Tài xế rất tốt");

        Trips trip = createTestTrip(200, TripStatus.COMPLETED);
        Drivers driver = createTestDriver(400);
        TripDrivers tripDriver = createTestTripDriver(300, trip);
        tripDriver.setDriver(driver);
        Users user = createTestUser(userId);

        when(tripsRepository.findById(200)).thenReturn(Optional.of(trip));
        when(tripDriversRepository.findMainDriverByTripId(200)).thenReturn(Optional.of(tripDriver));
        when(ratingsRepository.findByTrip_Id(200)).thenReturn(Optional.empty());
        when(usersRepository.findById(userId)).thenReturn(Optional.of(user));
        when(ratingsRepository.save(any())).thenAnswer(inv -> {
            DriverRatings r = inv.getArgument(0);
            r.setId(600);
            r.setOverallRating(new BigDecimal("4.5"));
            return r;
        });
        when(driversRepository.findById(400)).thenReturn(Optional.of(driver));
        when(ratingsRepository.getAverageRatingForDriver(anyInt(), any())).thenReturn(new BigDecimal("4.5"));
        when(driversRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(notificationRepository.save(any())).thenAnswer(inv -> {
            Notifications n = inv.getArgument(0);
            n.setId(700);
            return n;
        });
        doNothing().when(webSocketNotificationService).sendUserNotification(anyInt(), anyString(), anyString(), anyString());

        // When
        RatingResponse result = ratingService.createRating(request, userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTripId()).isEqualTo(200);
        assertThat(result.getDriverId()).isEqualTo(400);
        verify(ratingsRepository).save(any());
        verify(driversRepository).save(any());
    }

    @Test
    void createRating_whenTripNotFound_shouldThrowException() {
        // Given
        Integer userId = 100;
        RatingRequest request = new RatingRequest();
        request.setTripId(999);

        when(tripsRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> ratingService.createRating(request, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chuyến đi");
    }

    @Test
    void createRating_whenTripNotCompleted_shouldThrowException() {
        // Given
        Integer userId = 100;
        RatingRequest request = new RatingRequest();
        request.setTripId(200);

        Trips trip = createTestTrip(200, TripStatus.ONGOING);

        when(tripsRepository.findById(200)).thenReturn(Optional.of(trip));

        // When & Then
        assertThatThrownBy(() -> ratingService.createRating(request, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Chỉ có thể đánh giá các chuyến đi đã hoàn thành");
    }

    @Test
    void createRating_whenAlreadyRated_shouldThrowException() {
        // Given
        Integer userId = 100;
        RatingRequest request = new RatingRequest();
        request.setTripId(200);

        Trips trip = createTestTrip(200, TripStatus.COMPLETED);
        DriverRatings existingRating = createTestRating(600, trip, createTestDriver(400));

        when(tripsRepository.findById(200)).thenReturn(Optional.of(trip));
        when(ratingsRepository.findByTrip_Id(200)).thenReturn(Optional.of(existingRating));

        // When & Then
        assertThatThrownBy(() -> ratingService.createRating(request, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Chuyến đi đã được đánh giá");
    }

    // ==================== getRatingByTrip() Tests ====================

    @Test
    void getRatingByTrip_whenRatingExists_shouldReturnRating() {
        // Given
        Integer tripId = 200;
        DriverRatings rating = createTestRating(600, createTestTrip(200, TripStatus.COMPLETED), createTestDriver(400));

        when(ratingsRepository.findByTrip_Id(tripId)).thenReturn(Optional.of(rating));

        // When
        RatingResponse result = ratingService.getRatingByTrip(tripId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getRatingId()).isEqualTo(600);
        assertThat(result.getTripId()).isEqualTo(200);
    }

    @Test
    void getRatingByTrip_whenRatingNotExists_shouldReturnNull() {
        // Given
        Integer tripId = 200;

        when(ratingsRepository.findByTrip_Id(tripId)).thenReturn(Optional.empty());

        // When
        RatingResponse result = ratingService.getRatingByTrip(tripId);

        // Then
        assertThat(result).isNull();
    }

    // ==================== getDriverRatings() Tests ====================

    @Test
    void getDriverRatings_whenRatingsExist_shouldReturnRatings() {
        // Given
        Integer driverId = 400;
        DriverRatings rating1 = createTestRating(600, createTestTrip(200, TripStatus.COMPLETED), createTestDriver(driverId));
        DriverRatings rating2 = createTestRating(601, createTestTrip(201, TripStatus.COMPLETED), createTestDriver(driverId));
        List<DriverRatings> ratings = List.of(rating1, rating2);

        when(ratingsRepository.findByDriver_IdOrderByRatedAtDesc(driverId)).thenReturn(ratings);

        // When
        List<RatingResponse> result = ratingService.getDriverRatings(driverId, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(ratingsRepository).findByDriver_IdOrderByRatedAtDesc(driverId);
    }

    @Test
    void getDriverRatings_whenWithLimit_shouldReturnLimitedRatings() {
        // Given
        Integer driverId = 400;
        DriverRatings rating1 = createTestRating(600, createTestTrip(200, TripStatus.COMPLETED), createTestDriver(driverId));
        DriverRatings rating2 = createTestRating(601, createTestTrip(201, TripStatus.COMPLETED), createTestDriver(driverId));
        List<DriverRatings> ratings = List.of(rating1, rating2);

        when(ratingsRepository.findByDriver_IdOrderByRatedAtDesc(driverId)).thenReturn(ratings);

        // When
        List<RatingResponse> result = ratingService.getDriverRatings(driverId, 1);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(1);
    }

    // ==================== getDriverPerformance() Tests ====================

    @Test
    void getDriverPerformance_whenRatingsExist_shouldCalculatePerformance() {
        // Given
        Integer driverId = 400;
        Integer days = 30;
        Drivers driver = createTestDriver(driverId);
        DriverRatings rating1 = createTestRating(600, createTestTrip(200, TripStatus.COMPLETED), driver);
        rating1.setPunctualityRating(5);
        rating1.setAttitudeRating(4);
        rating1.setSafetyRating(5);
        rating1.setComplianceRating(4);
        rating1.setOverallRating(new BigDecimal("4.5"));
        List<DriverRatings> ratings = List.of(rating1);

        when(driversRepository.findById(driverId)).thenReturn(Optional.of(driver));
        when(ratingsRepository.findByDriver_IdAndRatedAtAfterOrderByRatedAtDesc(anyInt(), any()))
                .thenReturn(ratings);

        // When
        DriverPerformanceResponse result = ratingService.getDriverPerformance(driverId, days);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getDriverId()).isEqualTo(driverId);
        assertThat(result.getTotalRatings()).isEqualTo(1);
        assertThat(result.getAvgPunctuality()).isNotNull();
        assertThat(result.getAvgAttitude()).isNotNull();
        assertThat(result.getAvgSafety()).isNotNull();
        assertThat(result.getAvgCompliance()).isNotNull();
        assertThat(result.getAvgOverall()).isNotNull();
    }

    @Test
    void getDriverPerformance_whenDriverNotFound_shouldThrowException() {
        // Given
        Integer driverId = 999;
        Integer days = 30;

        when(driversRepository.findById(driverId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> ratingService.getDriverPerformance(driverId, days))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy tài xế");
    }

    // ==================== getCompletedTripsForRating() Tests ====================

    @Test
    void getCompletedTripsForRating_whenTripsExist_shouldReturnTrips() {
        // Given
        Trips trip1 = createTestTrip(200, TripStatus.COMPLETED);
        Trips trip2 = createTestTrip(201, TripStatus.COMPLETED);
        List<Trips> trips = List.of(trip1, trip2);

        when(tripsRepository.findByStatusOrderByEndTimeDesc(TripStatus.COMPLETED)).thenReturn(trips);
        when(tripDriversRepository.findMainDriverByTripId(anyInt())).thenReturn(Optional.empty());

        // When
        List<TripForRatingResponse> result = ratingService.getCompletedTripsForRating();

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(tripsRepository).findByStatusOrderByEndTimeDesc(TripStatus.COMPLETED);
    }

    // ==================== Helper Methods ====================

    private Trips createTestTrip(Integer tripId, TripStatus status) {
        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(status);
        trip.setStartLocation("Hà Nội");
        trip.setEndLocation("Hải Phòng");
        trip.setStartTime(Instant.now().minusSeconds(3600));
        trip.setEndTime(Instant.now());

        Bookings booking = new Bookings();
        booking.setId(100);
        Customers customer = createTestCustomer(500);
        booking.setCustomer(customer);
        trip.setBooking(booking);

        return trip;
    }

    private TripDrivers createTestTripDriver(Integer id, Trips trip) {
        TripDrivers tripDriver = new TripDrivers();
        tripDriver.setTrip(trip);
        return tripDriver;
    }

    private Drivers createTestDriver(Integer driverId) {
        Drivers driver = new Drivers();
        driver.setId(driverId);

        Employees employee = new Employees();
        employee.setEmployeeId(1);
        Users user = new Users();
        user.setId(200);
        user.setFullName("Tài xế " + driverId);
        employee.setUser(user);
        driver.setEmployee(employee);

        return driver;
    }

    private Customers createTestCustomer(Integer customerId) {
        Customers customer = new Customers();
        customer.setId(customerId);
        customer.setFullName("Khách hàng " + customerId);
        return customer;
    }

    private Users createTestUser(Integer userId) {
        Users user = new Users();
        user.setId(userId);
        user.setFullName("User " + userId);
        return user;
    }

    private DriverRatings createTestRating(Integer ratingId, Trips trip, Drivers driver) {
        DriverRatings rating = new DriverRatings();
        rating.setId(ratingId);
        rating.setTrip(trip);
        rating.setDriver(driver);
        rating.setPunctualityRating(5);
        rating.setAttitudeRating(4);
        rating.setSafetyRating(5);
        rating.setComplianceRating(4);
        rating.setOverallRating(new BigDecimal("4.5"));
        rating.setRatedAt(Instant.now());
        return rating;
    }
}

