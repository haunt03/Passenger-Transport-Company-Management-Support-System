package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Vehicle.VehicleRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleTripResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.VehicleServiceImpl;
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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VehicleServiceImplTest {

    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private BranchesRepository branchRepository;
    @Mock
    private VehicleCategoryPricingRepository categoryRepository;
    @Mock
    private TripVehicleRepository tripVehicleRepository;
    @Mock
    private TripDriverRepository tripDriverRepository;
    @Mock
    private InvoiceRepository invoiceRepository;

    @InjectMocks
    private VehicleServiceImpl vehicleService;

    @AfterEach
    void cleanSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_shouldSaveVehicle_whenPlateUnique() {
        VehicleRequest request = buildRequest();
        Branches branch = buildBranch(1, "Chi nhánh ĐN");
        VehicleCategoryPricing category = buildCategory(2, "Xe 45 chỗ");

        when(vehicleRepository.existsByBranch_IdAndLicensePlateIgnoreCase(1, request.getLicensePlate()))
                .thenReturn(false);
        when(branchRepository.findById(1)).thenReturn(Optional.of(branch));
        when(categoryRepository.findById(2)).thenReturn(Optional.of(category));
        when(vehicleRepository.save(any())).thenAnswer(inv -> {
            Vehicles v = inv.getArgument(0);
            v.setId(99);
            return v;
        });

        var response = vehicleService.create(request);

        assertThat(response.getId()).isEqualTo(99);
        assertThat(response.getBranchName()).isEqualTo("Chi nhánh ĐN");
        assertThat(response.getCategoryName()).isEqualTo("Xe 45 chỗ");
        verify(vehicleRepository).save(any(Vehicles.class));
    }

    @Test
    void create_shouldThrowWhenLicensePlateDuplicatedInBranch() {
        VehicleRequest request = buildRequest();
        when(vehicleRepository.existsByBranch_IdAndLicensePlateIgnoreCase(anyInt(), anyString()))
                .thenReturn(true);

        assertThatThrownBy(() -> vehicleService.create(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Biển số xe đã tồn tại");

        verify(vehicleRepository, never()).save(any());
    }

    @Test
    void update_coordinatorCannotChangeStatusToInUse() {
        mockAuth("ROLE_COORDINATOR");

        VehicleRequest request = buildRequest();
        request.setStatus("INUSE");

        Branches branch = buildBranch(1, "Chi nhánh ĐN");
        VehicleCategoryPricing category = buildCategory(2, "Xe 45 chỗ");
        Vehicles existing = new Vehicles();
        existing.setId(5);
        existing.setStatus(VehicleStatus.AVAILABLE);
        existing.setBranch(branch);
        existing.setCategory(category);

        when(vehicleRepository.findById(5)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> vehicleService.update(5, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Điều phối viên không được phép chuyển xe sang trạng thái 'Đang sử dụng'");

        verify(vehicleRepository, never()).save(any());
    }

    @Test
    void getVehicleTrips_shouldReturnMappedResponses() {
        Vehicles vehicle = new Vehicles();
        vehicle.setId(1);
        when(vehicleRepository.findById(1)).thenReturn(Optional.of(vehicle));

        Bookings booking = new Bookings();
        booking.setId(10);
        Trips trip = new Trips();
        trip.setId(100);
        trip.setBooking(booking);
        trip.setStartLocation("Đà Nẵng");
        trip.setEndLocation("Huế");
        trip.setStartTime(Instant.parse("2025-12-04T01:00:00Z"));
        trip.setEndTime(Instant.parse("2025-12-04T04:00:00Z"));
        trip.setStatus(org.example.ptcmssbackend.enums.TripStatus.SCHEDULED);

        TripVehicles tripVehicle = new TripVehicles();
        tripVehicle.setTrip(trip);
        tripVehicle.setVehicle(vehicle);
        tripVehicle.setNote("Giao khách VIP");
        tripVehicle.setAssignedAt(Instant.parse("2025-12-03T23:00:00Z"));

        when(tripVehicleRepository.findAllByVehicleId(1)).thenReturn(List.of(tripVehicle));

        List<VehicleTripResponse> responses = vehicleService.getVehicleTrips(1);

        assertThat(responses).hasSize(1);
        VehicleTripResponse r = responses.get(0);
        assertThat(r.getTripId()).isEqualTo(100);
        assertThat(r.getBookingId()).isEqualTo(10);
        assertThat(r.getStartLocation()).isEqualTo("Đà Nẵng");
        assertThat(r.getStatus()).isEqualTo("SCHEDULED");
        verify(tripVehicleRepository).findAllByVehicleId(1);
    }

    private VehicleRequest buildRequest() {
        VehicleRequest request = new VehicleRequest();
        request.setBranchId(1);
        request.setCategoryId(2);
        request.setLicensePlate("43A-111.11");
        request.setModel("Solati");
        request.setBrand("Hyundai");
        request.setCapacity(45);
        request.setProductionYear(2023);
        request.setStatus("AVAILABLE");
        return request;
    }

    private Branches buildBranch(int id, String name) {
        Branches branch = new Branches();
        branch.setId(id);
        branch.setBranchName(name);
        return branch;
    }

    private VehicleCategoryPricing buildCategory(int id, String name) {
        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(id);
        category.setCategoryName(name);
        category.setStatus(org.example.ptcmssbackend.enums.VehicleCategoryStatus.ACTIVE);
        return category;
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
}


