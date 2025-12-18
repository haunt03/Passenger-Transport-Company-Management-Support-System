package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Driver.DriverDayOffRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.response.Driver.DriverDayOffResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.DriverStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.DriverServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DriverServiceImplTest {

    @Mock
    private DriverRepository driverRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private TripDriverRepository tripDriverRepository;
    @Mock
    private TripVehicleRepository tripVehicleRepository;
    @Mock
    private DriverDayOffRepository driverDayOffRepository;
    @Mock
    private TripIncidentRepository tripIncidentRepository;
    @Mock
    private BranchesRepository branchRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ApprovalService approvalService;
    @Mock
    private DriverRatingsRepository driverRatingsRepository;
    @Mock
    private GraphHopperService graphHopperService;
    @Mock
    private InvoiceRepository invoiceRepository;

    @InjectMocks
    private DriverServiceImpl driverService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updateProfile_coordinatorCannotSetInvalidStatus() {
        mockAuth("ROLE_COORDINATOR");

        Drivers driver = buildDriver();
        driver.setStatus(DriverStatus.ACTIVE);

        when(driverRepository.findById(1)).thenReturn(Optional.of(driver));

        DriverProfileUpdateRequest request = new DriverProfileUpdateRequest();
        request.setStatus("ON_TRIP");

        assertThatThrownBy(() -> driverService.updateProfile(1, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Điều phối viên chỉ được phép chuyển tài xế");

        verify(driverRepository, never()).save(any());
    }

    @Test
    void updateProfile_shouldUpdateFieldsForAdmin() {
        mockAuth("ROLE_ADMIN");

        Drivers driver = buildDriver();
        driver.setStatus(DriverStatus.ACTIVE);
        when(driverRepository.findById(1)).thenReturn(Optional.of(driver));
        when(driverRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        DriverProfileUpdateRequest request = new DriverProfileUpdateRequest();
        request.setPhone("0909000999");
        request.setAddress("35 Lê Lợi");
        request.setStatus("INACTIVE");
        request.setNote("Updated");

        var response = driverService.updateProfile(1, request);

        assertThat(response.getPhone()).isEqualTo("0909000999");
        assertThat(driver.getStatus()).isEqualTo(DriverStatus.INACTIVE);
        verify(driverRepository).save(driver);
    }

    @Test
    void requestDayOff_shouldPersistAndCreateApproval() {
        Drivers driver = buildDriver();
        Branches branch = new Branches();
        branch.setId(5);
        branch.setBranchName("Chi nhánh HCM");
        driver.setBranch(branch);

        when(driverRepository.findById(1)).thenReturn(Optional.of(driver));
        when(driverDayOffRepository.save(any())).thenAnswer(inv -> {
            DriverDayOff entity = inv.getArgument(0);
            entity.setId(50);
            return entity;
        });

        DriverDayOffRequest request = new DriverDayOffRequest();
        request.setStartDate(LocalDate.of(2025, 12, 1));
        request.setEndDate(LocalDate.of(2025, 12, 3));
        request.setReason("Nghỉ ốm");

        DriverDayOffResponse response = driverService.requestDayOff(1, request);

        assertThat(response.getStatus()).isEqualTo(DriverDayOffStatus.PENDING);
        assertThat(response.getStartDate()).isEqualTo(request.getStartDate());
        verify(driverDayOffRepository).save(any());
        verify(approvalService).createApprovalRequest(eq(ApprovalType.DRIVER_DAY_OFF), eq(50), any(), eq("Nghỉ ốm"), eq(branch));
    }

    private Drivers buildDriver() {
        Users user = new Users();
        user.setFullName("Nguyễn Văn A");
        user.setPhone("0909000990");
        user.setAddress("Đà Nẵng");

        Employees employee = new Employees();
        employee.setUser(user);

        Drivers driver = new Drivers();
        driver.setId(1);
        driver.setEmployee(employee);
        driver.setStatus(DriverStatus.ACTIVE);
        driver.setBranch(new Branches());
        return driver;
    }

    private void mockAuth(String... roles) {
        List<GrantedAuthority> authorities = roles == null ? Collections.emptyList() :
                java.util.Arrays.stream(roles)
                        .map(role -> (GrantedAuthority) () -> role)
                        .collect(Collectors.toList());

        Authentication authentication = mock(Authentication.class);
        when(authentication.getAuthorities()).thenReturn((java.util.Collection) authorities);

        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(context);
    }

    // ==================== startTrip() Tests ====================

    @Test
    void startTrip_whenValidRequest_shouldStartTripSuccessfully() {
        // Given
        Integer tripId = 100;
        Integer driverId = 1;

        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(TripStatus.SCHEDULED);
        trip.setStartTime(null);

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)).thenReturn(true);
        when(tripRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Integer result = driverService.startTrip(tripId, driverId);

        // Then
        assertThat(result).isEqualTo(tripId);
        assertThat(trip.getStatus()).isEqualTo(TripStatus.ONGOING);
        assertThat(trip.getStartTime()).isNotNull();
        verify(tripRepository).save(trip);
    }

    @Test
    void startTrip_whenTripNotFound_shouldThrowException() {
        // Given
        Integer tripId = 999;
        Integer driverId = 1;

        when(tripRepository.findById(tripId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> driverService.startTrip(tripId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chuyến đi");
    }

    @Test
    void startTrip_whenDriverNotAssigned_shouldThrowException() {
        // Given
        Integer tripId = 100;
        Integer driverId = 1;

        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(TripStatus.SCHEDULED);

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> driverService.startTrip(tripId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tài xế không được phân công cho chuyến đi này");
    }

    @Test
    void startTrip_whenInvalidStatus_shouldThrowException() {
        // Given
        Integer tripId = 100;
        Integer driverId = 1;

        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(TripStatus.COMPLETED); // Invalid status

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> driverService.startTrip(tripId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Chuyến đi không ở trạng thái ĐÃ LÊN LỊCH hoặc ĐÃ PHÂN XE");
    }

    @Test
    void startTrip_whenStatusIsAssigned_shouldStartSuccessfully() {
        // Given
        Integer tripId = 100;
        Integer driverId = 1;

        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(TripStatus.ASSIGNED); // Valid status
        trip.setStartTime(null);

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)).thenReturn(true);
        when(tripRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Integer result = driverService.startTrip(tripId, driverId);

        // Then
        assertThat(result).isEqualTo(tripId);
        assertThat(trip.getStatus()).isEqualTo(TripStatus.ONGOING);
        verify(tripRepository).save(trip);
    }

    // ==================== completeTrip() Tests ====================

    @Test
    void completeTrip_whenValidRequest_shouldCompleteTripSuccessfully() {
        // Given
        Integer tripId = 100;
        Integer driverId = 1;

        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(TripStatus.ONGOING);
        trip.setEndTime(null);

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)).thenReturn(true);
        when(tripRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Integer result = driverService.completeTrip(tripId, driverId);

        // Then
        assertThat(result).isEqualTo(tripId);
        assertThat(trip.getStatus()).isEqualTo(TripStatus.COMPLETED);
        assertThat(trip.getEndTime()).isNotNull();
        verify(tripRepository).save(trip);
    }

    @Test
    void completeTrip_whenTripNotFound_shouldThrowException() {
        // Given
        Integer tripId = 999;
        Integer driverId = 1;

        when(tripRepository.findById(tripId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> driverService.completeTrip(tripId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chuyến đi");
    }

    @Test
    void completeTrip_whenDriverNotAssigned_shouldThrowException() {
        // Given
        Integer tripId = 100;
        Integer driverId = 1;

        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(TripStatus.ONGOING);

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> driverService.completeTrip(tripId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tài xế không được phân công cho chuyến đi này");
    }

    @Test
    void completeTrip_whenInvalidStatus_shouldThrowException() {
        // Given
        Integer tripId = 100;
        Integer driverId = 1;

        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(TripStatus.SCHEDULED); // Invalid status (not ONGOING or ASSIGNED)

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> driverService.completeTrip(tripId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Chuyến đi không ở trạng thái ĐANG THỰC HIỆN hoặc ĐÃ PHÂN XE");
    }

    @Test
    void completeTrip_whenStatusIsAssigned_shouldCompleteSuccessfully() {
        // Given
        Integer tripId = 100;
        Integer driverId = 1;

        Trips trip = new Trips();
        trip.setId(tripId);
        trip.setStatus(TripStatus.ASSIGNED); // Valid status
        trip.setEndTime(null);

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDriverRepository.existsByTrip_IdAndDriver_Id(tripId, driverId)).thenReturn(true);
        when(tripRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Integer result = driverService.completeTrip(tripId, driverId);

        // Then
        assertThat(result).isEqualTo(tripId);
        assertThat(trip.getStatus()).isEqualTo(TripStatus.COMPLETED);
        verify(tripRepository).save(trip);
    }

    // ==================== getDashboard() Tests ====================

    @Test
    void getDashboard_whenValidRequest_shouldReturnDashboard() {
        // Given
        Integer driverId = 1;

        Drivers driver = buildDriver();
        Trips trip = new Trips();
        trip.setId(100);
        trip.setStatus(TripStatus.SCHEDULED);
        trip.setStartTime(Instant.now().plusSeconds(3600));

        TripDrivers tripDriver = new TripDrivers();
        tripDriver.setDriver(driver);
        tripDriver.setTrip(trip);

        when(tripDriverRepository.findAllByDriverId(driverId)).thenReturn(List.of(tripDriver));

        // When
        var response = driverService.getDashboard(driverId);

        // Then
        assertThat(response).isNotNull();
        verify(tripDriverRepository).findAllByDriverId(driverId);
    }

    @Test
    void getDashboard_whenNoTrips_shouldReturnNull() {
        // Given
        Integer driverId = 1;

        when(tripDriverRepository.findAllByDriverId(driverId)).thenReturn(Collections.emptyList());

        // When
        var response = driverService.getDashboard(driverId);

        // Then
        assertThat(response).isNull();
    }

    // ==================== getSchedule() Tests ====================

    @Test
    void getSchedule_whenValidRequest_shouldReturnSchedule() {
        // Given
        Integer driverId = 1;
        Instant startDate = Instant.parse("2025-12-01T00:00:00Z");
        Instant endDate = Instant.parse("2025-12-31T23:59:59Z");

        Drivers driver = buildDriver();
        Trips trip = new Trips();
        trip.setId(100);
        trip.setStartTime(startDate.plusSeconds(3600));
        trip.setEndTime(startDate.plusSeconds(7200));
        trip.setStartLocation("Location A");
        trip.setEndLocation("Location B");

        Bookings booking = new Bookings();
        org.example.ptcmssbackend.entity.HireTypes hireType = new org.example.ptcmssbackend.entity.HireTypes();
        hireType.setCode("ONE_WAY");
        hireType.setName("Một chiều");
        booking.setHireType(hireType);
        trip.setBooking(booking);

        TripDrivers tripDriver = new TripDrivers();
        tripDriver.setDriver(driver);
        tripDriver.setTrip(trip);

        when(tripDriverRepository.findAllByDriverIdAndDateRange(driverId, startDate, endDate))
                .thenReturn(List.of(tripDriver));
        when(driverRatingsRepository.findByTrip_Id(100)).thenReturn(Optional.empty());

        // When
        var response = driverService.getSchedule(driverId, startDate, endDate);

        // Then
        assertThat(response).isNotNull();
        assertThat(response).hasSize(1);
        assertThat(response.get(0).getTripId()).isEqualTo(100);
    }

    @Test
    void getSchedule_whenNoDateRange_shouldReturnAllTrips() {
        // Given
        Integer driverId = 1;

        Drivers driver = buildDriver();
        Trips trip = new Trips();
        trip.setId(100);
        trip.setStartTime(Instant.now());

        TripDrivers tripDriver = new TripDrivers();
        tripDriver.setDriver(driver);
        tripDriver.setTrip(trip);

        when(tripDriverRepository.findAllByDriverId(driverId)).thenReturn(List.of(tripDriver));
        when(driverRatingsRepository.findByTrip_Id(100)).thenReturn(Optional.empty());

        // When
        var response = driverService.getSchedule(driverId, null, null);

        // Then
        assertThat(response).isNotNull();
        verify(tripDriverRepository).findAllByDriverId(driverId);
    }

    // ==================== getProfile() Tests ====================

    @Test
    void getProfile_whenValidRequest_shouldReturnProfile() {
        // Given
        Integer driverId = 1;

        Drivers driver = buildDriver();
        driver.setId(driverId);

        Trips trip = new Trips();
        trip.setId(100);
        trip.setStatus(TripStatus.COMPLETED);

        TripDrivers tripDriver = new TripDrivers();
        tripDriver.setDriver(driver);
        tripDriver.setTrip(trip);

        when(driverRepository.findById(driverId)).thenReturn(Optional.of(driver));
        when(tripDriverRepository.findAllByDriverId(driverId)).thenReturn(List.of(tripDriver));

        // When
        var response = driverService.getProfile(driverId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTotalTrips()).isEqualTo(1);
        verify(driverRepository).findById(driverId);
    }

    @Test
    void getProfile_whenDriverNotFound_shouldThrowException() {
        // Given
        Integer driverId = 999;

        when(driverRepository.findById(driverId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> driverService.getProfile(driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy tài xế");
    }

    @Test
    void getProfileByUserId_whenValidRequest_shouldReturnProfile() {
        // Given
        Integer userId = 101;

        Users user = new Users();
        user.setId(userId);

        Employees employee = new Employees();
        employee.setEmployeeId(10);
        employee.setUser(user);

        Drivers driver = buildDriver();
        driver.setId(1);
        driver.setEmployee(employee);

        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.of(employee));
        when(driverRepository.findByEmployee_EmployeeId(10)).thenReturn(Optional.of(driver));
        when(driverRepository.findById(1)).thenReturn(Optional.of(driver));
        when(tripDriverRepository.findAllByDriverId(1)).thenReturn(Collections.emptyList());

        // When
        var response = driverService.getProfileByUserId(userId);

        // Then
        assertThat(response).isNotNull();
        verify(employeeRepository).findByUserId(userId);
    }

    // ==================== getDayOffHistory() Tests ====================

    @Test
    void getDayOffHistory_whenValidRequest_shouldReturnHistory() {
        // Given
        Integer driverId = 1;

        Drivers driver = buildDriver();
        driver.setId(driverId);

        DriverDayOff dayOff = new DriverDayOff();
        dayOff.setId(50);
        dayOff.setDriver(driver);
        dayOff.setStartDate(LocalDate.of(2025, 12, 1));
        dayOff.setEndDate(LocalDate.of(2025, 12, 3));
        dayOff.setStatus(DriverDayOffStatus.APPROVED);
        dayOff.setCreatedAt(Instant.now());

        when(driverDayOffRepository.findByDriver_Id(driverId)).thenReturn(List.of(dayOff));

        // When
        var response = driverService.getDayOffHistory(driverId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response).hasSize(1);
        assertThat(response.get(0).getStatus()).isEqualTo(DriverDayOffStatus.APPROVED);
        verify(driverDayOffRepository).findByDriver_Id(driverId);
    }

    // ==================== cancelDayOffRequest() Tests ====================

    @Test
    void cancelDayOffRequest_whenValidRequest_shouldCancelSuccessfully() {
        // Given
        Integer dayOffId = 50;
        Integer driverId = 1;

        Drivers driver = buildDriver();
        driver.setId(driverId);
        driver.setStatus(DriverStatus.OFF_DUTY);

        DriverDayOff dayOff = new DriverDayOff();
        dayOff.setId(dayOffId);
        dayOff.setDriver(driver);
        dayOff.setStatus(DriverDayOffStatus.PENDING);

        when(driverDayOffRepository.findById(dayOffId)).thenReturn(Optional.of(dayOff));
        when(driverDayOffRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(driverRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        driverService.cancelDayOffRequest(dayOffId, driverId);

        // Then
        assertThat(dayOff.getStatus()).isEqualTo(DriverDayOffStatus.CANCELLED);
        assertThat(driver.getStatus()).isEqualTo(DriverStatus.ACTIVE);
        verify(driverDayOffRepository).save(dayOff);
        verify(driverRepository).save(driver);
    }

    @Test
    void cancelDayOffRequest_whenDayOffNotFound_shouldThrowException() {
        // Given
        Integer dayOffId = 999;
        Integer driverId = 1;

        when(driverDayOffRepository.findById(dayOffId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> driverService.cancelDayOffRequest(dayOffId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy yêu cầu nghỉ phép");
    }

    @Test
    void cancelDayOffRequest_whenNotOwner_shouldThrowException() {
        // Given
        Integer dayOffId = 50;
        Integer driverId = 1;
        Integer otherDriverId = 2;

        Drivers otherDriver = buildDriver();
        otherDriver.setId(otherDriverId);

        DriverDayOff dayOff = new DriverDayOff();
        dayOff.setId(dayOffId);
        dayOff.setDriver(otherDriver);
        dayOff.setStatus(DriverDayOffStatus.PENDING);

        when(driverDayOffRepository.findById(dayOffId)).thenReturn(Optional.of(dayOff));

        // When & Then
        assertThatThrownBy(() -> driverService.cancelDayOffRequest(dayOffId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Bạn không có quyền hủy yêu cầu này");
    }

    @Test
    void cancelDayOffRequest_whenAlreadyRejected_shouldThrowException() {
        // Given
        Integer dayOffId = 50;
        Integer driverId = 1;

        Drivers driver = buildDriver();
        driver.setId(driverId);

        DriverDayOff dayOff = new DriverDayOff();
        dayOff.setId(dayOffId);
        dayOff.setDriver(driver);
        dayOff.setStatus(DriverDayOffStatus.REJECTED);

        when(driverDayOffRepository.findById(dayOffId)).thenReturn(Optional.of(dayOff));

        // When & Then
        assertThatThrownBy(() -> driverService.cancelDayOffRequest(dayOffId, driverId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không thể hủy yêu cầu đã bị từ chối");
    }

    // ==================== reportIncident() Tests ====================

    @Test
    void reportIncident_whenValidRequest_shouldReportSuccessfully() {
        // Given
        org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest request = 
            new org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest();
        request.setTripId(100);
        request.setDriverId(1);
        request.setDescription("Test incident");
        request.setSeverity("MEDIUM");

        Drivers driver = buildDriver();
        driver.setId(1);

        Trips trip = new Trips();
        trip.setId(100);
        Bookings booking = new Bookings();
        Branches branch = new Branches();
        branch.setId(1);
        booking.setBranch(branch);
        trip.setBooking(booking);

        when(tripRepository.findById(100)).thenReturn(Optional.of(trip));
        when(driverRepository.findById(1)).thenReturn(Optional.of(driver));
        when(tripIncidentRepository.save(any())).thenAnswer(inv -> {
            TripIncidents incident = inv.getArgument(0);
            incident.setId(200);
            return incident;
        });

        // When
        var response = driverService.reportIncident(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getDescription()).isEqualTo("Test incident");
        verify(tripIncidentRepository).save(any());
    }

    @Test
    void reportIncident_whenTripNotFound_shouldThrowException() {
        // Given
        org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest request = 
            new org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest();
        request.setTripId(999);
        request.setDriverId(1);
        request.setDescription("Test incident");

        when(tripRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> driverService.reportIncident(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chuyến đi");
    }
}

