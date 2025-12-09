package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Booking.CreateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.UpdateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.CustomerRequest;
import org.example.ptcmssbackend.dto.request.Booking.TripRequest;
import org.example.ptcmssbackend.dto.request.Booking.VehicleDetailRequest;
import org.example.ptcmssbackend.dto.response.Booking.BookingResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Customers;
import org.example.ptcmssbackend.entity.VehicleCategoryPricing;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.CustomerStatus;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.enums.VehicleCategoryStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.CustomerRepository;
import org.example.ptcmssbackend.repository.VehicleCategoryPricingRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BookingServiceIntegrationTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BranchesRepository branchesRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private VehicleCategoryPricingRepository vehicleCategoryPricingRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Branches testBranch;
    private Customers testCustomer;
    private VehicleCategoryPricing testCategory;
    private Employees testEmployee;

    @BeforeEach
    void setUp() {
        // Create test branch
        testBranch = new Branches();
        testBranch.setBranchName("Chi nhánh Test");
        testBranch.setLocation("123 Test Street");
        testBranch.setStatus(BranchStatus.ACTIVE);
        testBranch = branchesRepository.save(testBranch);

        // Create test customer
        testCustomer = new Customers();
        testCustomer.setFullName("Test Customer");
        testCustomer.setPhone("0987654321");
        testCustomer.setEmail("test@example.com");
        testCustomer.setStatus(CustomerStatus.ACTIVE);
        testCustomer = customerRepository.save(testCustomer);

        // Create test vehicle category
        testCategory = new VehicleCategoryPricing();
        testCategory.setCategoryName("Sedan");
        testCategory.setBaseFare(new BigDecimal("500000"));
        testCategory.setPricePerKm(new BigDecimal("10000"));
        testCategory.setStatus(VehicleCategoryStatus.ACTIVE);
        testCategory = vehicleCategoryPricingRepository.save(testCategory);

        // Create test employee (consultant)
        Roles role = new Roles();
        role.setRoleName("CONSULTANT");
        role.setDescription("Consultant Role");
        role = rolesRepository.save(role);

        Users user = new Users();
        user.setFullName("Consultant");
        user.setUsername("consultant");
        user.setEmail("consultant@example.com");
        user.setPhone("0111222333");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(role);
        user = usersRepository.save(user);

        testEmployee = new Employees();
        testEmployee.setUser(user);
        testEmployee.setBranch(testBranch);
        testEmployee.setRole(role);
        testEmployee.setStatus(EmployeeStatus.ACTIVE);
        testEmployee = employeeRepository.save(testEmployee);
    }

    @Test
    void createBooking_shouldCreateBookingSuccessfully() {
        // Given
        CustomerRequest customerRequest = new CustomerRequest();
        customerRequest.setFullName("Test Customer");
        customerRequest.setPhone("0987654321");
        customerRequest.setEmail("test@example.com");

        TripRequest tripRequest = new TripRequest();
        tripRequest.setStartLocation("Location A");
        tripRequest.setEndLocation("Location B");
        tripRequest.setStartTime(Instant.now().plusSeconds(86400)); // Tomorrow
        tripRequest.setDistance(50.0);

        VehicleDetailRequest vehicleRequest = new VehicleDetailRequest();
        vehicleRequest.setVehicleCategoryId(testCategory.getId());
        vehicleRequest.setQuantity(1);

        CreateBookingRequest request = new CreateBookingRequest();
        request.setCustomer(customerRequest);
        request.setBranchId(testBranch.getId());
        request.setTrips(List.of(tripRequest));
        request.setVehicles(List.of(vehicleRequest));
        request.setUseHighway(false);
        request.setIsHoliday(false);
        request.setIsWeekend(false);

        // When
        BookingResponse response = bookingService.create(request, testEmployee.getEmployeeId());

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isNotNull();
        assertThat(response.getStatus()).isEqualTo(BookingStatus.PENDING.name());
    }

    @Test
    void createBooking_withInvalidBranch_shouldThrowException() {
        // Given
        CustomerRequest customerRequest = new CustomerRequest();
        customerRequest.setFullName("Test Customer");
        customerRequest.setPhone("0987654321");

        TripRequest tripRequest = new TripRequest();
        tripRequest.setStartLocation("Location A");
        tripRequest.setEndLocation("Location B");
        tripRequest.setStartTime(Instant.now().plusSeconds(86400));

        VehicleDetailRequest vehicleRequest = new VehicleDetailRequest();
        vehicleRequest.setVehicleCategoryId(testCategory.getId());
        vehicleRequest.setQuantity(1);

        CreateBookingRequest request = new CreateBookingRequest();
        request.setCustomer(customerRequest);
        request.setBranchId(99999); // Invalid branch
        request.setTrips(List.of(tripRequest));
        request.setVehicles(List.of(vehicleRequest));

        // When & Then
        assertThatThrownBy(() -> bookingService.create(request, testEmployee.getEmployeeId()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void getBookingById_shouldReturnBooking() {
        // Given
        CustomerRequest customerRequest = new CustomerRequest();
        customerRequest.setFullName("Test Customer");
        customerRequest.setPhone("0987654321");

        TripRequest tripRequest = new TripRequest();
        tripRequest.setStartLocation("Location A");
        tripRequest.setEndLocation("Location B");
        tripRequest.setStartTime(Instant.now().plusSeconds(86400));
        tripRequest.setDistance(50.0);

        VehicleDetailRequest vehicleRequest = new VehicleDetailRequest();
        vehicleRequest.setVehicleCategoryId(testCategory.getId());
        vehicleRequest.setQuantity(1);

        CreateBookingRequest createRequest = new CreateBookingRequest();
        createRequest.setCustomer(customerRequest);
        createRequest.setBranchId(testBranch.getId());
        createRequest.setTrips(List.of(tripRequest));
        createRequest.setVehicles(List.of(vehicleRequest));
        
        BookingResponse created = bookingService.create(createRequest, testEmployee.getEmployeeId());

        // When
        BookingResponse response = bookingService.getById(created.getId());

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(created.getId());
    }

    @Test
    void getBookingById_withInvalidId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> bookingService.getById(99999))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Booking not found");
    }

    @Test
    void getAllBookings_shouldReturnPagedResults() {
        // Given
        for (int i = 0; i < 3; i++) {
            CustomerRequest customerRequest = new CustomerRequest();
            customerRequest.setFullName("Customer " + i);
            customerRequest.setPhone("098765432" + i);

            TripRequest tripRequest = new TripRequest();
            tripRequest.setStartLocation("Location " + i);
            tripRequest.setEndLocation("Location " + (i + 1));
            tripRequest.setStartTime(Instant.now().plusSeconds(86400));
            tripRequest.setDistance(50.0);

            VehicleDetailRequest vehicleRequest = new VehicleDetailRequest();
            vehicleRequest.setVehicleCategoryId(testCategory.getId());
            vehicleRequest.setQuantity(1);

            CreateBookingRequest request = new CreateBookingRequest();
            request.setCustomer(customerRequest);
            request.setBranchId(testBranch.getId());
            request.setTrips(List.of(tripRequest));
            request.setVehicles(List.of(vehicleRequest));
            bookingService.create(request, testEmployee.getEmployeeId());
        }

        // When
        org.example.ptcmssbackend.dto.response.common.PageResponse<?> result = 
                bookingService.getAll(
                        null,
                        testBranch.getId(),
                        null,
                        null,
                        null,
                        null,
                        0,
                        10,
                        "id"
                );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(3);
    }

    @Test
    void updateBooking_shouldUpdateBookingSuccessfully() {
        // Given
        CustomerRequest customerRequest = new CustomerRequest();
        customerRequest.setFullName("Test Customer");
        customerRequest.setPhone("0987654321");

        TripRequest tripRequest = new TripRequest();
        tripRequest.setStartLocation("Original Location");
        tripRequest.setEndLocation("Location B");
        tripRequest.setStartTime(Instant.now().plusSeconds(86400));
        tripRequest.setDistance(50.0);

        VehicleDetailRequest vehicleRequest = new VehicleDetailRequest();
        vehicleRequest.setVehicleCategoryId(testCategory.getId());
        vehicleRequest.setQuantity(1);

        CreateBookingRequest createRequest = new CreateBookingRequest();
        createRequest.setCustomer(customerRequest);
        createRequest.setBranchId(testBranch.getId());
        createRequest.setTrips(List.of(tripRequest));
        createRequest.setVehicles(List.of(vehicleRequest));
        
        BookingResponse booking = bookingService.create(createRequest, testEmployee.getEmployeeId());

        UpdateBookingRequest updateRequest = new UpdateBookingRequest();
        updateRequest.setNote("Updated booking");

        // When
        BookingResponse response = bookingService.update(booking.getId(), updateRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(booking.getId());
    }

    @Test
    void deleteBooking_shouldDeleteBookingSuccessfully() {
        // Given
        CustomerRequest customerRequest = new CustomerRequest();
        customerRequest.setFullName("Test Customer");
        customerRequest.setPhone("0987654321");

        TripRequest tripRequest = new TripRequest();
        tripRequest.setStartLocation("Location A");
        tripRequest.setEndLocation("Location B");
        tripRequest.setStartTime(Instant.now().plusSeconds(86400));
        tripRequest.setDistance(50.0);

        VehicleDetailRequest vehicleRequest = new VehicleDetailRequest();
        vehicleRequest.setVehicleCategoryId(testCategory.getId());
        vehicleRequest.setQuantity(1);

        CreateBookingRequest createRequest = new CreateBookingRequest();
        createRequest.setCustomer(customerRequest);
        createRequest.setBranchId(testBranch.getId());
        createRequest.setTrips(List.of(tripRequest));
        createRequest.setVehicles(List.of(vehicleRequest));
        
        BookingResponse booking = bookingService.create(createRequest, testEmployee.getEmployeeId());

        // When
        bookingService.delete(booking.getId());

        // Then
        BookingResponse deleted = bookingService.getById(booking.getId());
        assertThat(deleted.getStatus()).isEqualTo(BookingStatus.CANCELLED.name());
    }

    @Test
    void calculatePrice_shouldCalculatePriceSuccessfully() {
        // Given
        List<Integer> vehicleCategoryIds = List.of(testCategory.getId());
        List<Integer> quantities = List.of(1);
        Double distance = 50.0;
        Boolean useHighway = false;

        // When
        BigDecimal price = bookingService.calculatePrice(vehicleCategoryIds, quantities, distance, useHighway);

        // Then
        assertThat(price).isNotNull();
        assertThat(price).isGreaterThan(BigDecimal.ZERO);
    }
}
