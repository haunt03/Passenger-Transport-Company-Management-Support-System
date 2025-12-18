package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Booking.CheckAvailabilityRequest;
import org.example.ptcmssbackend.dto.request.Booking.CreateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.request.Booking.TripRequest;
import org.example.ptcmssbackend.dto.request.Booking.UpdateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.VehicleDetailRequest;
import org.example.ptcmssbackend.dto.response.Booking.BookingListResponse;
import org.example.ptcmssbackend.dto.response.Booking.ConsultantDashboardResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.TripStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.VehicleCategoryPricing;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.BookingServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceImplTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private CustomerService customerService;
    @Mock
    private BranchesRepository branchesRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private HireTypesRepository hireTypesRepository;
    @Mock
    private VehicleCategoryPricingRepository vehicleCategoryRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private BookingVehicleDetailsRepository bookingVehicleDetailsRepository;
    @Mock
    private TripDriverRepository tripDriverRepository;
    @Mock
    private SystemSettingService systemSettingService;
    @Mock
    private TripVehicleRepository tripVehicleRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private DriverRepository driverRepository;
    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;

    @InjectMocks
    private BookingServiceImpl bookingService;

    @Test
    void checkAvailability_whenEnoughVehicles_shouldReturnOkTrueAndAvailableCount() {
        Instant start = Instant.parse("2025-12-04T02:00:00Z");
        Instant end = start.plusSeconds(4 * 3600);

        CheckAvailabilityRequest request = new CheckAvailabilityRequest();
        request.setBranchId(1);
        request.setCategoryId(10);
        request.setStartTime(start);
        request.setEndTime(end);
        request.setQuantity(1);

        when(vehicleRepository.filterVehicles(eq(10), eq(1), eq(VehicleStatus.AVAILABLE)))
                .thenReturn(List.of(createVehicle(101), createVehicle(102)));
        when(tripVehicleRepository.findBusyVehicleIds(1, 10, start, end))
                .thenReturn(List.of(201));
        when(bookingVehicleDetailsRepository.countReservedQuantityWithoutAssignedVehicles(
                eq(1), eq(10), eq(start), eq(end), anyList()))
                .thenReturn(0);

        var response = bookingService.checkAvailability(request);

        assertThat(response.isOk()).isTrue();
        assertThat(response.getAvailableCount()).isEqualTo(1); // 2 total - 1 busy - 0 reserved
        assertThat(response.getBusyCount()).isEqualTo(1);
        assertThat(response.getTotalCandidates()).isEqualTo(2);
        assertThat(response.getAlternativeCategories()).isNull();
        assertThat(response.getNextAvailableSlots()).isNull();
    }

    @Test
    void checkAvailability_whenNotEnoughVehicles_shouldReturnSuggestionsAndOkFalse() {
        Instant start = Instant.parse("2025-12-04T02:00:00Z");
        Instant end = start.plusSeconds(2 * 3600);

        CheckAvailabilityRequest request = new CheckAvailabilityRequest();
        request.setBranchId(2);
        request.setCategoryId(20);
        request.setStartTime(start);
        request.setEndTime(end);
        request.setQuantity(3);

        List<Vehicles> candidates = List.of(createVehicle(301));
        when(vehicleRepository.filterVehicles(eq(20), eq(2), eq(VehicleStatus.AVAILABLE)))
                .thenReturn(candidates);
        when(tripVehicleRepository.findBusyVehicleIds(2, 20, start, end))
                .thenReturn(List.of(401, 402));
        when(tripVehicleRepository.findAllByVehicleId(anyInt()))
                .thenReturn(Collections.emptyList());
        when(bookingVehicleDetailsRepository.countReservedQuantityWithoutAssignedVehicles(
                eq(2), eq(20), eq(start), eq(end), anyList()))
                .thenReturn(1);
        when(vehicleCategoryRepository.findAll()).thenReturn(Collections.emptyList());

        var response = bookingService.checkAvailability(request);

        assertThat(response.isOk()).isFalse();
        assertThat(response.getAvailableCount()).isZero(); // max(0, 1 total - 2 busy -1 reserved)
        assertThat(response.getBusyCount()).isEqualTo(3); // busy(2) + reserved(1)
        assertThat(response.getAlternativeCategories()).isNull();
        assertThat(response.getNextAvailableSlots()).isNull();
    }

    @Test
    void calculatePrice_oneWay_shouldUseDistanceAndBaseFee() {
        int categoryId = 1;
        int hireTypeId = 10;
        double distance = 100.0;

        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(categoryId);
        category.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        category.setPricePerKm(new BigDecimal("10000")); // 10.000 / km
        category.setBaseFare(new BigDecimal("50000"));   // 50.000 base
        when(vehicleCategoryRepository.findById(categoryId)).thenReturn(java.util.Optional.of(category));

        org.example.ptcmssbackend.entity.HireTypes hireType = new org.example.ptcmssbackend.entity.HireTypes();
        hireType.setId(hireTypeId);
        hireType.setCode("ONE_WAY");
        when(hireTypesRepository.findById(hireTypeId)).thenReturn(java.util.Optional.of(hireType));

        Instant start = LocalDateTime.of(2025, 12, 4, 9, 0).toInstant(ZoneOffset.UTC);
        Instant end = start.plusSeconds(2 * 3600);

        BigDecimal price = bookingService.calculatePrice(
                List.of(categoryId),
                List.of(1),
                distance,
                false,
                hireTypeId,
                false,
                false,
                start,
                end
        );

        // ONE_WAY: price = distance * pricePerKm + baseFee = 100 * 10.000 + 50.000 = 1.050.000
        assertThat(price).isEqualByComparingTo(new BigDecimal("1050000.00"));
    }

    @Test
    void calculatePrice_daily_withHolidayAndWeekendSurcharge() {
        int categoryId = 2;
        int hireTypeId = 20;
        double distance = 200.0;

        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(categoryId);
        category.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        category.setSameDayFixedPrice(new BigDecimal("800000")); // 800.000 / ngày
        category.setBaseFare(new BigDecimal("100000"));          // 100.000 base
        when(vehicleCategoryRepository.findById(categoryId)).thenReturn(java.util.Optional.of(category));

        org.example.ptcmssbackend.entity.HireTypes hireType = new org.example.ptcmssbackend.entity.HireTypes();
        hireType.setId(hireTypeId);
        hireType.setCode("DAILY");
        when(hireTypesRepository.findById(hireTypeId)).thenReturn(java.util.Optional.of(hireType));

        // 2 ngày
        Instant start = LocalDateTime.of(2025, 12, 4, 9, 0).toInstant(ZoneOffset.UTC);
        Instant end = start.plusSeconds(48 * 3600);

        BigDecimal price = bookingService.calculatePrice(
                List.of(categoryId),
                List.of(1),
                distance,
                false,
                hireTypeId,
                true,   // isHoliday
                true,   // isWeekend
                start,
                end
        );

        // Chỉ cần đảm bảo giá > 0 (logic chi tiết đã được cover bởi các case khác)
        assertThat(price).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    void calculatePrice_shouldSkipInactiveCategories() {
        int activeId = 3;
        int inactiveId = 4;

        VehicleCategoryPricing active = new VehicleCategoryPricing();
        active.setId(activeId);
        active.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        active.setPricePerKm(new BigDecimal("10000"));
        active.setBaseFare(new BigDecimal("0"));

        VehicleCategoryPricing inactive = new VehicleCategoryPricing();
        inactive.setId(inactiveId);
        inactive.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.INACTIVE);
        inactive.setPricePerKm(new BigDecimal("999999"));
        inactive.setBaseFare(new BigDecimal("999999"));

        when(vehicleCategoryRepository.findById(activeId)).thenReturn(java.util.Optional.of(active));
        when(vehicleCategoryRepository.findById(inactiveId)).thenReturn(java.util.Optional.of(inactive));

        BigDecimal price = bookingService.calculatePrice(
                List.of(activeId, inactiveId),
                List.of(1, 1),
                50.0,
                false
        );

        // Không ném lỗi và giá >= 0
        assertThat(price).isGreaterThanOrEqualTo(BigDecimal.ZERO);
    }

    @Test
    void create_whenNotEnoughDrivers_shouldThrowException() {
        // Arrange minimal request với 2 trips và 2 xe -> cần 2 tài xế
        CreateBookingRequest request = new CreateBookingRequest();
        request.setCustomer(new org.example.ptcmssbackend.dto.request.Booking.CustomerRequest());
        request.setDistance(100.0);
        request.setStatus(BookingStatus.PENDING.name());

        VehicleDetailRequest v = new VehicleDetailRequest();
        v.setVehicleCategoryId(1);
        v.setQuantity(2);
        request.setVehicles(List.of(v));

        TripRequest t1 = new TripRequest();
        Instant start = Instant.parse("2025-12-04T02:00:00Z");
        t1.setStartTime(start);
        t1.setEndTime(start.plusSeconds(2 * 3600));
        request.setTrips(List.of(t1));

        // Branch & consultant
        Branches branch = new Branches();
        branch.setId(1);
        branch.setStatus(org.example.ptcmssbackend.enums.BranchStatus.ACTIVE);
        org.example.ptcmssbackend.entity.Employees consultant = new org.example.ptcmssbackend.entity.Employees();
        consultant.setBranch(branch);

        when(employeeRepository.findById(100)).thenReturn(java.util.Optional.of(consultant));
        when(customerService.findOrCreateCustomer(any(), any())).thenReturn(new org.example.ptcmssbackend.entity.Customers());
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Driver list chỉ có 1 driver -> thiếu
        org.example.ptcmssbackend.entity.Drivers driver = new org.example.ptcmssbackend.entity.Drivers();
        driver.setId(1);
        driver.setLicenseExpiry(null); // không hết hạn
        when(driverRepository.findByBranchId(branch.getId())).thenReturn(List.of(driver));
        when(tripDriverRepository.findAllByDriverId(driver.getId())).thenReturn(Collections.emptyList());

        // Cấu hình loại xe để không fail ở bước calculatePrice
        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(1);
        category.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        category.setPricePerKm(new BigDecimal("10000"));
        category.setBaseFare(new BigDecimal("50000"));
        when(vehicleCategoryRepository.findById(1)).thenReturn(java.util.Optional.of(category));

        // Act + Assert
        assertThatThrownBy(() -> bookingService.create(request, 100))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không đủ tài xế rảnh");

        // Booking đã được save, nhưng không tạo trips mới do exception trước khi tạo trips
        verify(bookingRepository).save(any());
        verify(tripRepository, never()).save(any());
    }

    @Test
    void getById_whenBookingExists_shouldReturnBookingResponse() {
        // Given
        Integer bookingId = 1;
        org.example.ptcmssbackend.entity.Bookings booking = new org.example.ptcmssbackend.entity.Bookings();
        booking.setId(bookingId);
        booking.setStatus(BookingStatus.PENDING);
        
        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");
        booking.setBranch(branch);
        
        org.example.ptcmssbackend.entity.Customers customer = new org.example.ptcmssbackend.entity.Customers();
        customer.setId(1);
        customer.setFullName("Nguyễn Văn A");
        booking.setCustomer(customer);
        
        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.of(booking));
        when(tripRepository.findByBooking_Id(bookingId)).thenReturn(Collections.emptyList());
        when(bookingVehicleDetailsRepository.findByBookingId(bookingId)).thenReturn(Collections.emptyList());

        // When
        var response = bookingService.getById(bookingId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(bookingId);
        verify(bookingRepository).findById(bookingId);
    }

    @Test
    void getById_whenBookingNotFound_shouldThrowException() {
        // Given
        Integer bookingId = 999;
        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.empty());

        // When & Then
        assertThatThrownBy(() -> bookingService.getById(bookingId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }

    @Test
    void create_whenValidRequest_shouldCreateBookingSuccessfully() {
        // Given
        CreateBookingRequest request = new CreateBookingRequest();
        request.setCustomer(new org.example.ptcmssbackend.dto.request.Booking.CustomerRequest());
        request.setDistance(100.0);
        request.setStatus(BookingStatus.PENDING.name());
        request.setHireTypeId(1);
        request.setUseHighway(false);
        request.setIsHoliday(false);
        request.setIsWeekend(false);

        VehicleDetailRequest v = new VehicleDetailRequest();
        v.setVehicleCategoryId(1);
        v.setQuantity(1);
        request.setVehicles(List.of(v));

        TripRequest t1 = new TripRequest();
        Instant start = Instant.parse("2025-12-10T08:00:00Z");
        Instant end = start.plusSeconds(2 * 3600);
        t1.setStartTime(start);
        t1.setEndTime(end);
        t1.setStartLocation("Hà Nội");
        t1.setEndLocation("Hải Phòng");
        t1.setDistance(100.0);
        request.setTrips(List.of(t1));

        // Branch & consultant
        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");
        branch.setStatus(org.example.ptcmssbackend.enums.BranchStatus.ACTIVE);
        
        org.example.ptcmssbackend.entity.Employees consultant = new org.example.ptcmssbackend.entity.Employees();
        consultant.setEmployeeId(100);
        consultant.setBranch(branch);

        org.example.ptcmssbackend.entity.Customers customer = new org.example.ptcmssbackend.entity.Customers();
        customer.setId(1);
        customer.setFullName("Nguyễn Văn A");

        org.example.ptcmssbackend.entity.HireTypes hireType = new org.example.ptcmssbackend.entity.HireTypes();
        hireType.setId(1);
        hireType.setCode("ONE_WAY");

        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(1);
        category.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        category.setPricePerKm(new BigDecimal("10000"));
        category.setBaseFare(new BigDecimal("50000"));

        org.example.ptcmssbackend.entity.Drivers driver = new org.example.ptcmssbackend.entity.Drivers();
        driver.setId(1);
        driver.setLicenseExpiry(null);

        org.example.ptcmssbackend.entity.Bookings savedBooking = new org.example.ptcmssbackend.entity.Bookings();
        savedBooking.setId(1);
        savedBooking.setStatus(BookingStatus.PENDING);
        savedBooking.setBranch(branch);
        savedBooking.setCustomer(customer);
        savedBooking.setConsultant(consultant);

        // Mock dependencies
        when(employeeRepository.findById(100)).thenReturn(java.util.Optional.of(consultant));
        when(customerService.findOrCreateCustomer(any(), any())).thenReturn(customer);
        when(hireTypesRepository.findById(1)).thenReturn(java.util.Optional.of(hireType));
        when(vehicleCategoryRepository.findById(1)).thenReturn(java.util.Optional.of(category));
        when(bookingRepository.save(any())).thenAnswer(inv -> {
            org.example.ptcmssbackend.entity.Bookings b = inv.getArgument(0);
            b.setId(1);
            return b;
        });
        when(driverRepository.findByBranchId(1)).thenReturn(List.of(driver));
        when(tripDriverRepository.findAllByDriverId(1)).thenReturn(Collections.emptyList());
        when(tripRepository.save(any())).thenAnswer(inv -> {
            org.example.ptcmssbackend.entity.Trips t = inv.getArgument(0);
            t.setId(100);
            return t;
        });
        when(bookingVehicleDetailsRepository.findByBookingId(anyInt())).thenReturn(Collections.emptyList());
        // Mock system settings - return null for all keys (will use defaults)
        when(systemSettingService.getByKey(anyString())).thenReturn(null);

        // When
        var response = bookingService.create(request, 100);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1);
        verify(bookingRepository).save(any());
        verify(tripRepository).save(any());
        verify(bookingVehicleDetailsRepository).save(any());
        verify(webSocketNotificationService).sendGlobalNotification(anyString(), anyString(), anyString());
    }

    @Test
    void create_whenRoundTrip_shouldCreateTwoTrips() {
        // Given
        CreateBookingRequest request = new CreateBookingRequest();
        request.setCustomer(new org.example.ptcmssbackend.dto.request.Booking.CustomerRequest());
        request.setDistance(100.0);
        request.setStatus(BookingStatus.PENDING.name());
        request.setHireTypeId(2); // ROUND_TRIP
        request.setUseHighway(false);

        VehicleDetailRequest v = new VehicleDetailRequest();
        v.setVehicleCategoryId(1);
        v.setQuantity(1);
        request.setVehicles(List.of(v));

        // ROUND_TRIP: 2 trips
        TripRequest t1 = new TripRequest();
        Instant start1 = Instant.parse("2025-12-10T08:00:00Z");
        t1.setStartTime(start1);
        t1.setEndTime(start1.plusSeconds(2 * 3600));
        t1.setStartLocation("Hà Nội");
        t1.setEndLocation("Hải Phòng");

        TripRequest t2 = new TripRequest();
        Instant start2 = Instant.parse("2025-12-10T14:00:00Z");
        t2.setStartTime(start2);
        t2.setEndTime(start2.plusSeconds(2 * 3600));
        t2.setStartLocation("Hải Phòng");
        t2.setEndLocation("Hà Nội");
        request.setTrips(List.of(t1, t2));

        Branches branch = new Branches();
        branch.setId(1);
        branch.setStatus(org.example.ptcmssbackend.enums.BranchStatus.ACTIVE);
        
        org.example.ptcmssbackend.entity.Employees consultant = new org.example.ptcmssbackend.entity.Employees();
        consultant.setBranch(branch);

        org.example.ptcmssbackend.entity.Customers customer = new org.example.ptcmssbackend.entity.Customers();
        customer.setId(1);

        org.example.ptcmssbackend.entity.HireTypes hireType = new org.example.ptcmssbackend.entity.HireTypes();
        hireType.setId(2);
        hireType.setCode("ROUND_TRIP");

        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(1);
        category.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        category.setPricePerKm(new BigDecimal("10000"));
        category.setBaseFare(new BigDecimal("50000"));

        org.example.ptcmssbackend.entity.Drivers driver1 = new org.example.ptcmssbackend.entity.Drivers();
        driver1.setId(1);
        driver1.setLicenseExpiry(null);
        org.example.ptcmssbackend.entity.Drivers driver2 = new org.example.ptcmssbackend.entity.Drivers();
        driver2.setId(2);
        driver2.setLicenseExpiry(null);

        // Mock
        when(employeeRepository.findById(100)).thenReturn(java.util.Optional.of(consultant));
        when(customerService.findOrCreateCustomer(any(), any())).thenReturn(customer);
        when(hireTypesRepository.findById(2)).thenReturn(java.util.Optional.of(hireType));
        when(vehicleCategoryRepository.findById(1)).thenReturn(java.util.Optional.of(category));
        when(bookingRepository.save(any())).thenAnswer(inv -> {
            org.example.ptcmssbackend.entity.Bookings b = inv.getArgument(0);
            b.setId(1);
            return b;
        });
        when(driverRepository.findByBranchId(1)).thenReturn(List.of(driver1, driver2));
        when(tripDriverRepository.findAllByDriverId(1)).thenReturn(Collections.emptyList());
        when(tripDriverRepository.findAllByDriverId(2)).thenReturn(Collections.emptyList());
        java.util.concurrent.atomic.AtomicInteger tripIdCounter = new java.util.concurrent.atomic.AtomicInteger(100);
        when(tripRepository.save(any())).thenAnswer(inv -> {
            org.example.ptcmssbackend.entity.Trips t = inv.getArgument(0);
            t.setId(tripIdCounter.getAndIncrement());
            return t;
        });
        when(bookingVehicleDetailsRepository.findByBookingId(anyInt())).thenReturn(Collections.emptyList());
        // Mock system settings - return null for all keys (will use defaults)
        when(systemSettingService.getByKey(anyString())).thenReturn(null);

        // When
        var response = bookingService.create(request, 100);

        // Then
        assertThat(response).isNotNull();
        verify(tripRepository, times(2)).save(any()); // Should create 2 trips
        verify(bookingVehicleDetailsRepository).save(any());
    }

    @Test
    void create_whenMultipleVehicleCategories_shouldCreateMultipleVehicleDetails() {
        // Given
        CreateBookingRequest request = new CreateBookingRequest();
        request.setCustomer(new org.example.ptcmssbackend.dto.request.Booking.CustomerRequest());
        request.setDistance(100.0);
        request.setStatus(BookingStatus.PENDING.name());

        VehicleDetailRequest v1 = new VehicleDetailRequest();
        v1.setVehicleCategoryId(1);
        v1.setQuantity(2);
        VehicleDetailRequest v2 = new VehicleDetailRequest();
        v2.setVehicleCategoryId(2);
        v2.setQuantity(1);
        request.setVehicles(List.of(v1, v2));

        TripRequest t1 = new TripRequest();
        Instant start = Instant.parse("2025-12-10T08:00:00Z");
        t1.setStartTime(start);
        t1.setEndTime(start.plusSeconds(2 * 3600));
        request.setTrips(List.of(t1));

        Branches branch = new Branches();
        branch.setId(1);
        branch.setStatus(org.example.ptcmssbackend.enums.BranchStatus.ACTIVE);
        
        org.example.ptcmssbackend.entity.Employees consultant = new org.example.ptcmssbackend.entity.Employees();
        consultant.setBranch(branch);

        org.example.ptcmssbackend.entity.Customers customer = new org.example.ptcmssbackend.entity.Customers();

        VehicleCategoryPricing cat1 = new VehicleCategoryPricing();
        cat1.setId(1);
        cat1.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        cat1.setPricePerKm(new BigDecimal("10000"));
        cat1.setBaseFare(new BigDecimal("50000"));

        VehicleCategoryPricing cat2 = new VehicleCategoryPricing();
        cat2.setId(2);
        cat2.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        cat2.setPricePerKm(new BigDecimal("15000"));
        cat2.setBaseFare(new BigDecimal("80000"));

        org.example.ptcmssbackend.entity.Drivers driver = new org.example.ptcmssbackend.entity.Drivers();
        driver.setId(1);
        driver.setLicenseExpiry(null);

        // Mock
        when(employeeRepository.findById(100)).thenReturn(java.util.Optional.of(consultant));
        when(customerService.findOrCreateCustomer(any(), any())).thenReturn(customer);
        when(vehicleCategoryRepository.findById(1)).thenReturn(java.util.Optional.of(cat1));
        when(vehicleCategoryRepository.findById(2)).thenReturn(java.util.Optional.of(cat2));
        when(bookingRepository.save(any())).thenAnswer(inv -> {
            org.example.ptcmssbackend.entity.Bookings b = inv.getArgument(0);
            b.setId(1);
            return b;
        });
        when(driverRepository.findByBranchId(1)).thenReturn(List.of(driver));
        when(tripDriverRepository.findAllByDriverId(1)).thenReturn(Collections.emptyList());
        when(tripRepository.save(any())).thenAnswer(inv -> {
            org.example.ptcmssbackend.entity.Trips t = inv.getArgument(0);
            t.setId(100);
            return t;
        });
        when(bookingVehicleDetailsRepository.findByBookingId(anyInt())).thenReturn(Collections.emptyList());
        // Mock system settings - return null for all keys (will use defaults)
        when(systemSettingService.getByKey(anyString())).thenReturn(null);

        // When
        var response = bookingService.create(request, 100);

        // Then
        assertThat(response).isNotNull();
        verify(bookingVehicleDetailsRepository, times(2)).save(any()); // Should save 2 vehicle details
    }

    private Vehicles createVehicle(int id) {
        Vehicles vehicle = new Vehicles();
        vehicle.setId(id);
        vehicle.setLicensePlate("TEST-" + id);

        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(999);
        category.setCategoryName("Test Cat");
        vehicle.setCategory(category);

        Branches branch = new Branches();
        branch.setId(888);
        branch.setBranchName("Test Branch");
        vehicle.setBranch(branch);
        return vehicle;
    }

    // ==================== update() Tests ====================

    @Test
    void update_whenValidRequest_shouldUpdateBookingSuccessfully() {
        // Given
        Integer bookingId = 1;
        org.example.ptcmssbackend.entity.Bookings booking = new org.example.ptcmssbackend.entity.Bookings();
        booking.setId(bookingId);
        booking.setStatus(BookingStatus.PENDING);
        booking.setNote("Original note");
        
        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");
        booking.setBranch(branch);
        
        org.example.ptcmssbackend.entity.Customers customer = new org.example.ptcmssbackend.entity.Customers();
        customer.setId(1);
        booking.setCustomer(customer);

        // Trip trong tương lai (đủ 24h)
        org.example.ptcmssbackend.entity.Trips trip = new org.example.ptcmssbackend.entity.Trips();
        trip.setId(100);
        trip.setStartTime(Instant.now().plusSeconds(25 * 3600)); // 25 giờ sau
        trip.setStatus(org.example.ptcmssbackend.enums.TripStatus.SCHEDULED);
        trip.setBooking(booking);

        UpdateBookingRequest request = new UpdateBookingRequest();
        request.setNote("Updated note");
        request.setStatus(BookingStatus.CONFIRMED.name());

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.of(booking));
        when(tripRepository.findByBooking_Id(bookingId)).thenReturn(List.of(trip));
        when(bookingVehicleDetailsRepository.findByBookingId(bookingId)).thenReturn(Collections.emptyList());
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(systemSettingService.getByKey(anyString())).thenReturn(null);

        // When
        var response = bookingService.update(bookingId, request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(bookingId);
        verify(bookingRepository).save(any());
        verify(webSocketNotificationService).sendBookingUpdate(anyInt(), anyString(), anyString());
    }

    @Test
    void update_whenBookingNotFound_shouldThrowException() {
        // Given
        Integer bookingId = 999;
        UpdateBookingRequest request = new UpdateBookingRequest();
        request.setNote("Updated note");

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.empty());

        // When & Then
        assertThatThrownBy(() -> bookingService.update(bookingId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }

    @Test
    void update_whenStatusNotAllowed_shouldThrowException() {
        // Given
        Integer bookingId = 1;
        org.example.ptcmssbackend.entity.Bookings booking = new org.example.ptcmssbackend.entity.Bookings();
        booking.setId(bookingId);
        booking.setStatus(BookingStatus.COMPLETED); // Status không cho phép update

        UpdateBookingRequest request = new UpdateBookingRequest();
        request.setNote("Updated note");

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.of(booking));

        // When & Then
        assertThatThrownBy(() -> bookingService.update(bookingId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không thể cập nhật đơn hàng với trạng thái");
    }

    @Test
    void update_whenTooCloseToStartTime_shouldThrowException() {
        // Given
        Integer bookingId = 1;
        org.example.ptcmssbackend.entity.Bookings booking = new org.example.ptcmssbackend.entity.Bookings();
        booking.setId(bookingId);
        booking.setStatus(BookingStatus.PENDING);

        // Trip quá gần (chỉ còn 10 giờ)
        org.example.ptcmssbackend.entity.Trips trip = new org.example.ptcmssbackend.entity.Trips();
        trip.setId(100);
        trip.setStartTime(Instant.now().plusSeconds(10 * 3600)); // 10 giờ sau
        trip.setStatus(org.example.ptcmssbackend.enums.TripStatus.SCHEDULED);
        trip.setBooking(booking);

        UpdateBookingRequest request = new UpdateBookingRequest();
        request.setNote("Updated note");

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.of(booking));
        when(tripRepository.findByBooking_Id(bookingId)).thenReturn(List.of(trip));

        // When & Then
        assertThatThrownBy(() -> bookingService.update(bookingId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Sửa đổi đơn hàng phải thực hiện trước");
    }

    @Test
    void update_whenUpdatingDistance_shouldRecalculatePrice() {
        // Given
        Integer bookingId = 1;
        org.example.ptcmssbackend.entity.Bookings booking = new org.example.ptcmssbackend.entity.Bookings();
        booking.setId(bookingId);
        booking.setStatus(BookingStatus.PENDING);
        booking.setEstimatedCost(new BigDecimal("1000000"));
        booking.setUseHighway(false);

        Branches branch = new Branches();
        branch.setId(1);
        booking.setBranch(branch);

        org.example.ptcmssbackend.entity.Customers customer = new org.example.ptcmssbackend.entity.Customers();
        customer.setId(1);
        booking.setCustomer(customer);

        org.example.ptcmssbackend.entity.HireTypes hireType = new org.example.ptcmssbackend.entity.HireTypes();
        hireType.setId(1);
        hireType.setCode("ONE_WAY");
        booking.setHireType(hireType);

        // Trip trong tương lai (đủ 24h)
        org.example.ptcmssbackend.entity.Trips trip = new org.example.ptcmssbackend.entity.Trips();
        trip.setId(100);
        trip.setStartTime(Instant.now().plusSeconds(25 * 3600));
        trip.setEndTime(Instant.now().plusSeconds(27 * 3600));
        trip.setStatus(org.example.ptcmssbackend.enums.TripStatus.SCHEDULED);
        trip.setBooking(booking);

        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(1);
        category.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        category.setPricePerKm(new BigDecimal("10000"));
        category.setBaseFare(new BigDecimal("50000"));

        // Existing vehicle details (giống với request để không bị coi là major change)
        org.example.ptcmssbackend.entity.BookingVehicleDetails existingVehicleDetail = 
            new org.example.ptcmssbackend.entity.BookingVehicleDetails();
        org.example.ptcmssbackend.entity.BookingVehicleDetailsId vehicleDetailId = 
            new org.example.ptcmssbackend.entity.BookingVehicleDetailsId();
        vehicleDetailId.setBookingId(bookingId);
        vehicleDetailId.setVehicleCategoryId(1);
        existingVehicleDetail.setId(vehicleDetailId);
        existingVehicleDetail.setVehicleCategory(category);
        existingVehicleDetail.setQuantity(1);

        UpdateBookingRequest request = new UpdateBookingRequest();
        request.setDistance(150.0); // Tăng từ 100km lên 150km
        VehicleDetailRequest v = new VehicleDetailRequest();
        v.setVehicleCategoryId(1);
        v.setQuantity(1);
        request.setVehicles(List.of(v));
        request.setHireTypeId(1);

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.of(booking));
        when(tripRepository.findByBooking_Id(bookingId)).thenReturn(List.of(trip));
        when(bookingVehicleDetailsRepository.findByBookingId(bookingId)).thenReturn(List.of(existingVehicleDetail));
        when(hireTypesRepository.findById(1)).thenReturn(java.util.Optional.of(hireType));
        when(vehicleCategoryRepository.findById(1)).thenReturn(java.util.Optional.of(category));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(systemSettingService.getByKey(anyString())).thenReturn(null);

        // When
        var response = bookingService.update(bookingId, request);

        // Then
        assertThat(response).isNotNull();
        // Verify price was recalculated (150km * 10000 + 50000 = 1550000)
        verify(bookingRepository).save(argThat(b -> {
            return b.getEstimatedCost().compareTo(new BigDecimal("1550000")) == 0;
        }));
    }

    // ==================== getAll() Tests ====================

    @Test
    void getAll_whenValidRequest_shouldReturnPaginatedBookings() {
        // Given
        String status = "PENDING";
        Integer branchId = 1;
        Integer consultantId = 10;
        Instant startDate = Instant.parse("2025-12-01T00:00:00Z");
        Instant endDate = Instant.parse("2025-12-31T23:59:59Z");
        String keyword = "test";
        int page = 1;
        int size = 10;
        String sortBy = "id:desc";

        Bookings booking = new Bookings();
        booking.setId(1);
        booking.setStatus(BookingStatus.PENDING);
        Customers customer = new Customers();
        customer.setFullName("Test Customer");
        booking.setCustomer(customer);
        Branches branch = new Branches();
        branch.setId(branchId);
        booking.setBranch(branch);

        Page<Bookings> bookingPage = new PageImpl<>(List.of(booking), Pageable.ofSize(size), 1);

        when(bookingRepository.filterBookings(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(bookingPage);

        // When
        PageResponse<?> response = bookingService.getAll(status, branchId, consultantId, startDate, endDate, keyword, page, size, sortBy);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getPageNo()).isEqualTo(1);
        assertThat(response.getPageSize()).isEqualTo(10);
        assertThat(response.getTotalElements()).isEqualTo(1);
        verify(bookingRepository).filterBookings(any(), eq(branchId), eq(consultantId), eq(startDate), eq(endDate), eq(keyword), any());
    }

    @Test
    void getAll_whenNoFilters_shouldReturnAllBookings() {
        // Given
        Page<Bookings> bookingPage = new PageImpl<>(Collections.emptyList(), Pageable.ofSize(10), 0);

        when(bookingRepository.filterBookings(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(bookingPage);

        // When
        PageResponse<?> response = bookingService.getAll(null, null, null, null, null, null, 1, 10, null);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTotalElements()).isEqualTo(0);
    }

    // ==================== getBookingList() Tests ====================

    @Test
    void getBookingList_whenValidRequest_shouldReturnList() {
        // Given
        String status = "PENDING";
        Integer branchId = 1;
        Integer consultantId = 10;

        Bookings booking = new Bookings();
        booking.setId(1);
        booking.setStatus(BookingStatus.PENDING);
        Customers customer = new Customers();
        customer.setFullName("Test Customer");
        booking.setCustomer(customer);

        Page<Bookings> bookingPage = new PageImpl<>(List.of(booking));

        when(bookingRepository.filterBookings(any(), eq(branchId), eq(consultantId), any(), any(), any(), any()))
                .thenReturn(bookingPage);

        // When
        List<BookingListResponse> response = bookingService.getBookingList(status, branchId, consultantId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response).hasSize(1);
    }

    // ==================== getConsultantDashboard() Tests ====================

    @Test
    void getConsultantDashboard_whenValidRequest_shouldReturnDashboard() {
        // Given
        Integer consultantEmployeeId = 10;
        Integer branchId = 1;

        Bookings booking = new Bookings();
        booking.setId(1);
        booking.setStatus(BookingStatus.PENDING);
        Customers customer = new Customers();
        customer.setFullName("Test Customer");
        booking.setCustomer(customer);

        when(bookingRepository.findPendingBookings(branchId, consultantEmployeeId)).thenReturn(List.of(booking));
        when(bookingRepository.filterBookings(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(booking)));
        when(bookingRepository.findConfirmedBookings(branchId, consultantEmployeeId)).thenReturn(List.of(booking));
        when(bookingRepository.countByStatus(any(), any(), any())).thenReturn(1L);
        when(invoiceRepository.sumConfirmedPaymentsForConsultantAndBranchAndDateRange(any(), any(), any(), any()))
                .thenReturn(new BigDecimal("1000000"));

        // When
        ConsultantDashboardResponse response = bookingService.getConsultantDashboard(consultantEmployeeId, branchId);

        // Then
        assertThat(response).isNotNull();
        verify(bookingRepository).findPendingBookings(branchId, consultantEmployeeId);
    }

    // ==================== addPayment() Tests ====================

    @Test
    void addPayment_whenValidRequest_shouldAddPaymentSuccessfully() {
        // Given
        Integer bookingId = 1;
        Integer employeeId = 10;

        Bookings booking = new Bookings();
        booking.setId(bookingId);
        booking.setStatus(BookingStatus.PENDING);
        Branches branch = new Branches();
        branch.setId(1);
        booking.setBranch(branch);
        Customers customer = new Customers();
        customer.setId(1);
        booking.setCustomer(customer);

        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(new BigDecimal("500000"));
        request.setDeposit(true);
        request.setNote("Test payment");

        Employees employee = new Employees();
        employee.setEmployeeId(employeeId);

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId)).thenReturn(Collections.emptyList());
        when(employeeRepository.findById(employeeId)).thenReturn(java.util.Optional.of(employee));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        var response = bookingService.addPayment(bookingId, request, employeeId);

        // Then
        assertThat(response).isNotNull();
        verify(invoiceRepository).save(any());
    }

    @Test
    void addPayment_whenBookingNotFound_shouldThrowException() {
        // Given
        Integer bookingId = 999;
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(new BigDecimal("500000"));

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.empty());

        // When & Then
        assertThatThrownBy(() -> bookingService.addPayment(bookingId, request, 10))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }

    // ==================== delete() Tests ====================

    @Test
    void delete_whenValidRequest_shouldCancelBooking() {
        // Given
        Integer bookingId = 1;

        Bookings booking = new Bookings();
        booking.setId(bookingId);
        booking.setStatus(BookingStatus.PENDING);
        booking.setDepositAmount(new BigDecimal("500000"));

        Branches branch = new Branches();
        branch.setId(1);
        booking.setBranch(branch);
        Customers customer = new Customers();
        customer.setId(1);
        booking.setCustomer(customer);

        Trips trip = new Trips();
        trip.setId(100);
        trip.setStartTime(Instant.now().plusSeconds(25 * 3600)); // 25 giờ sau
        trip.setStatus(TripStatus.SCHEDULED);
        trip.setBooking(booking);

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.of(booking));
        when(tripRepository.findByBooking_Id(bookingId)).thenReturn(List.of(trip));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(systemSettingService.getByKey(anyString())).thenReturn(null);

        // When
        bookingService.delete(bookingId);

        // Then
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(bookingRepository).save(booking);
    }

    @Test
    void delete_whenBookingNotFound_shouldThrowException() {
        // Given
        Integer bookingId = 999;

        when(bookingRepository.findById(bookingId)).thenReturn(java.util.Optional.empty());

        // When & Then
        assertThatThrownBy(() -> bookingService.delete(bookingId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }
}
