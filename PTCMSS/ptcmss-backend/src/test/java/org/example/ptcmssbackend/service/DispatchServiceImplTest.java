package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.dispatch.AssignRequest;
import org.example.ptcmssbackend.dto.response.Booking.BookingResponse;
import org.example.ptcmssbackend.dto.response.dispatch.AssignRespone;
import org.example.ptcmssbackend.dto.response.dispatch.PendingTripResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.PaymentConfirmationStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.DispatchServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DispatchServiceImplTest {

    @Mock
    private TripRepository tripRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private TripDriverRepository tripDriverRepository;
    @Mock
    private TripVehicleRepository tripVehicleRepository;
    @Mock
    private DriverRepository driverRepository;
    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private DriverDayOffRepository driverDayOffRepository;
    @Mock
    private BookingService bookingService;
    @Mock
    private org.example.ptcmssbackend.service.WebSocketNotificationService webSocketNotificationService;
    @Mock
    private SystemSettingService systemSettingService;
    @Mock
    private BookingVehicleDetailsRepository bookingVehicleDetailsRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private PaymentHistoryRepository paymentHistoryRepository;
    @Mock
    private DriverRatingsRepository driverRatingsRepository;

    @InjectMocks
    private DispatchServiceImpl dispatchService;

    @Test
    void getPendingTrips_shouldReturnOnlyUnassignedTripsWithDispatchableBookings() {
        Integer branchId = 1;
        Instant from = Instant.parse("2025-12-04T00:00:00Z");
        Instant to = Instant.parse("2025-12-05T00:00:00Z");

        // Booking dispatchable (PENDING)
        Bookings bookingPending = new Bookings();
        bookingPending.setId(10);
        bookingPending.setStatus(BookingStatus.PENDING);
        Customers customer = new Customers();
        customer.setFullName("Nguyễn Văn A");
        customer.setPhone("0909");
        bookingPending.setCustomer(customer);
        Branches branch = new Branches();
        branch.setId(branchId);
        branch.setBranchName("Chi nhánh A");
        bookingPending.setBranch(branch);

        // Booking không dispatchable (CANCELLED)
        Bookings bookingCancelled = new Bookings();
        bookingCancelled.setId(11);
        bookingCancelled.setStatus(BookingStatus.CANCELLED);
        bookingCancelled.setCustomer(customer);
        bookingCancelled.setBranch(branch);

        // Trip 1: SCHEDULED, chưa gán driver/vehicle -> phải được trả về
        Trips trip1 = new Trips();
        trip1.setId(100);
        trip1.setStatus(TripStatus.SCHEDULED);
        trip1.setStartTime(from.plusSeconds(3600));
        trip1.setEndTime(from.plusSeconds(7200));
        trip1.setBooking(bookingPending);

        // Trip 2: SCHEDULED nhưng đã gán driver -> loại bỏ
        Trips trip2 = new Trips();
        trip2.setId(200);
        trip2.setStatus(TripStatus.SCHEDULED);
        trip2.setStartTime(from.plusSeconds(3600));
        trip2.setEndTime(from.plusSeconds(7200));
        trip2.setBooking(bookingPending);

        // Trip 3: SCHEDULED, chưa gán nhưng booking CANCELLED -> loại bỏ
        Trips trip3 = new Trips();
        trip3.setId(300);
        trip3.setStatus(TripStatus.SCHEDULED);
        trip3.setStartTime(from.plusSeconds(3600));
        trip3.setEndTime(from.plusSeconds(7200));
        trip3.setBooking(bookingCancelled);

        when(tripRepository.findByBooking_Branch_IdAndStatusAndStartTimeBetween(
                eq(branchId), eq(TripStatus.SCHEDULED), eq(from), eq(to)))
                .thenReturn(List.of(trip1, trip2, trip3));
        when(tripRepository.findByBooking_Branch_IdAndStatusAndStartTimeBetween(
                eq(branchId), eq(TripStatus.ASSIGNED), eq(from), eq(to)))
                .thenReturn(Collections.emptyList());

        // Trip1: chưa gán
        when(tripDriverRepository.findByTripId(100)).thenReturn(Collections.emptyList());
        when(tripVehicleRepository.findByTripId(100)).thenReturn(Collections.emptyList());
        // Trip2: đã gán driver
        TripDrivers td = new TripDrivers();
        td.setId(new TripDriverId());
        when(tripDriverRepository.findByTripId(200)).thenReturn(List.of(td));
        when(tripVehicleRepository.findByTripId(200)).thenReturn(Collections.emptyList());
        // Trip3: chưa gán nhưng booking CANCELLED
        when(tripDriverRepository.findByTripId(300)).thenReturn(Collections.emptyList());
        when(tripVehicleRepository.findByTripId(300)).thenReturn(Collections.emptyList());

        List<PendingTripResponse> result = dispatchService.getPendingTrips(branchId, from, to);

        assertThat(result).hasSize(1);
        PendingTripResponse r = result.get(0);
        assertThat(r.getTripId()).isEqualTo(100);
        assertThat(r.getBookingId()).isEqualTo(10);
        assertThat(r.getBranchId()).isEqualTo(branchId);
        assertThat(r.getCustomerName()).isEqualTo("Nguyễn Văn A");
        assertThat(r.getBookingStatus()).isEqualTo(BookingStatus.PENDING);
    }

    // ==================== assign() Tests ====================

    @Test
    void assign_whenValidRequestWithDeposit_shouldAssignSuccessfully() {
        // Given
        AssignRequest request = new AssignRequest();
        request.setBookingId(1);
        request.setDriverId(10);
        request.setVehicleId(20);
        request.setTripIds(List.of(100));

        Bookings booking = new Bookings();
        booking.setId(1);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setDepositAmount(new BigDecimal("500000"));
        booking.setTotalCost(new BigDecimal("2000000"));

        Branches branch = new Branches();
        branch.setId(1);
        booking.setBranch(branch);

        Customers customer = new Customers();
        customer.setId(1);
        booking.setCustomer(customer);

        Trips trip = new Trips();
        trip.setId(100);
        trip.setStatus(TripStatus.SCHEDULED);
        trip.setBooking(booking);

        Drivers driver = new Drivers();
        driver.setId(10);
        Employees driverEmployee = new Employees();
        Users driverUser = new Users();
        driverUser.setId(101);
        driverEmployee.setUser(driverUser);
        driver.setEmployee(driverEmployee);

        Vehicles vehicle = new Vehicles();
        vehicle.setId(20);
        vehicle.setLicensePlate("29A-111.11");

        Invoices depositInvoice = new Invoices();
        depositInvoice.setId(1);
        depositInvoice.setIsDeposit(true);
        depositInvoice.setAmount(new BigDecimal("500000"));

        PaymentHistory payment = new PaymentHistory();
        payment.setId(1);
        payment.setInvoice(depositInvoice);
        payment.setAmount(new BigDecimal("500000"));
        payment.setConfirmationStatus(PaymentConfirmationStatus.CONFIRMED);

        BookingResponse bookingResponse = BookingResponse.builder()
                .id(1)
                .build();

        // Mock
        when(bookingRepository.findById(1)).thenReturn(java.util.Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(1)).thenReturn(List.of(depositInvoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(1)).thenReturn(List.of(payment));
        when(invoiceRepository.calculateConfirmedPaidAmountByBookingId(1)).thenReturn(new BigDecimal("500000"));
        when(tripRepository.findByBooking_Id(1)).thenReturn(List.of(trip));
        when(bookingService.assign(eq(1), any())).thenReturn(bookingResponse);

        // When
        AssignRespone response = dispatchService.assign(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getBookingId()).isEqualTo(1);
        verify(bookingService).assign(eq(1), any());
    }

    @Test
    void assign_whenBookingNotFound_shouldThrowException() {
        // Given
        AssignRequest request = new AssignRequest();
        request.setBookingId(999);
        request.setDriverId(10);
        request.setVehicleId(20);

        when(bookingRepository.findById(999)).thenReturn(java.util.Optional.empty());

        // When & Then
        assertThatThrownBy(() -> dispatchService.assign(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }

    @Test
    void assign_whenNoDepositAndLessThan30Percent_shouldThrowException() {
        // Given
        AssignRequest request = new AssignRequest();
        request.setBookingId(1);
        request.setDriverId(10);
        request.setVehicleId(20);

        Bookings booking = new Bookings();
        booking.setId(1);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setTotalCost(new BigDecimal("2000000"));
        booking.setDepositAmount(BigDecimal.ZERO);

        Invoices invoice = new Invoices();
        invoice.setId(1);
        invoice.setIsDeposit(false);
        invoice.setAmount(new BigDecimal("500000")); // Chỉ 25% (< 30%)

        PaymentHistory payment = new PaymentHistory();
        payment.setId(1);
        payment.setInvoice(invoice);
        payment.setAmount(new BigDecimal("500000"));
        payment.setConfirmationStatus(PaymentConfirmationStatus.CONFIRMED);

        // Mock
        when(bookingRepository.findById(1)).thenReturn(java.util.Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(1)).thenReturn(List.of(invoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(1)).thenReturn(List.of(payment));

        // When & Then
        assertThatThrownBy(() -> dispatchService.assign(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Đơn hàng chưa đủ điều kiện gán chuyến");
    }

    @Test
    void assign_whenNoTrips_shouldThrowException() {
        // Given
        AssignRequest request = new AssignRequest();
        request.setBookingId(1);
        request.setDriverId(10);
        request.setVehicleId(20);

        Bookings booking = new Bookings();
        booking.setId(1);
        booking.setStatus(BookingStatus.COMPLETED); // COMPLETED skip payment check

        // Mock
        when(bookingRepository.findById(1)).thenReturn(java.util.Optional.of(booking));
        when(tripRepository.findByBooking_Id(1)).thenReturn(Collections.emptyList());

        // When & Then
        assertThatThrownBy(() -> dispatchService.assign(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chuyến đi cho đơn hàng");
    }

    @Test
    void assign_whenCompletedBooking_shouldSkipPaymentCheck() {
        // Given
        AssignRequest request = new AssignRequest();
        request.setBookingId(1);
        request.setDriverId(10);
        request.setVehicleId(20);
        request.setTripIds(List.of(100));

        Bookings booking = new Bookings();
        booking.setId(1);
        booking.setStatus(BookingStatus.COMPLETED); // COMPLETED skip payment check

        Branches branch = new Branches();
        branch.setId(1);
        booking.setBranch(branch);

        Trips trip = new Trips();
        trip.setId(100);
        trip.setStatus(TripStatus.SCHEDULED);
        trip.setBooking(booking);

        Drivers driver = new Drivers();
        driver.setId(10);

        Vehicles vehicle = new Vehicles();
        vehicle.setId(20);

        BookingResponse bookingResponse = BookingResponse.builder()
                .id(1)
                .build();

        // Mock
        when(bookingRepository.findById(1)).thenReturn(java.util.Optional.of(booking));
        when(tripRepository.findByBooking_Id(1)).thenReturn(List.of(trip));
        when(bookingService.assign(eq(1), any())).thenReturn(bookingResponse);

        // When
        AssignRespone response = dispatchService.assign(request);

        // Then
        assertThat(response).isNotNull();
        // Verify payment check was skipped (no invoice repository calls)
        verify(invoiceRepository, never()).findByBooking_IdOrderByCreatedAtDesc(anyInt());
        verify(bookingService).assign(eq(1), any());
    }
}


