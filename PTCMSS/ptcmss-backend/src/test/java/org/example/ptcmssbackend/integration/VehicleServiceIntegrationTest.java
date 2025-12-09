package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Vehicle.VehicleRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.VehicleCategoryPricing;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.VehicleCategoryStatus;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.VehicleCategoryPricingRepository;
import org.example.ptcmssbackend.repository.VehicleRepository;
import org.example.ptcmssbackend.service.VehicleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class VehicleServiceIntegrationTest {

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private BranchesRepository branchesRepository;

    @Autowired
    private VehicleCategoryPricingRepository categoryRepository;

    private Branches testBranch;
    private VehicleCategoryPricing testCategory;

    @BeforeEach
    void setUp() {
        // Create test branch
        testBranch = new Branches();
        testBranch.setBranchName("Test Branch");
        testBranch.setLocation("123 Test Street");
        testBranch.setStatus(BranchStatus.ACTIVE);
        testBranch = branchesRepository.save(testBranch);

        // Create test category
        testCategory = new VehicleCategoryPricing();
        testCategory.setCategoryName("4 Seater");
        testCategory.setSeats(4);
        testCategory.setDescription("4 Seater Vehicle");
        testCategory.setBaseFare(new BigDecimal("100000"));
        testCategory.setPricePerKm(new BigDecimal("10000"));
        testCategory.setStatus(VehicleCategoryStatus.ACTIVE);
        testCategory = categoryRepository.save(testCategory);
    }

    @Test
    void create_shouldCreateVehicleSuccessfully() {
        // Given
        VehicleRequest request = new VehicleRequest();
        request.setCategoryId(testCategory.getId());
        request.setBranchId(testBranch.getId());
        request.setLicensePlate("30A-12345");
        request.setModel("Toyota Vios");
        request.setBrand("Toyota");
        request.setCapacity(4);
        request.setProductionYear(2020);
        request.setRegistrationDate(LocalDate.of(2020, 1, 1));
        request.setInspectionExpiry(LocalDate.of(2025, 12, 31));
        request.setInsuranceExpiry(LocalDate.of(2025, 12, 31));
        request.setOdometer(50000L);
        request.setStatus("AVAILABLE");

        // When
        VehicleResponse result = vehicleService.create(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getLicensePlate()).isEqualTo("30A-12345");
        assertThat(result.getModel()).isEqualTo("Toyota Vios");
        assertThat(result.getBrand()).isEqualTo("Toyota");
        assertThat(result.getCapacity()).isEqualTo(4);
        assertThat(result.getProductionYear()).isEqualTo(2020);
        assertThat(result.getOdometer()).isEqualTo(50000L);
    }

    @Test
    void create_withDuplicateLicensePlateInSameBranch_shouldThrowException() {
        // Given
        Vehicles existingVehicle = new Vehicles();
        existingVehicle.setCategory(testCategory);
        existingVehicle.setBranch(testBranch);
        existingVehicle.setLicensePlate("30A-12345");
        existingVehicle.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(existingVehicle);

        VehicleRequest request = new VehicleRequest();
        request.setCategoryId(testCategory.getId());
        request.setBranchId(testBranch.getId());
        request.setLicensePlate("30A-12345");

        // When & Then
        assertThatThrownBy(() -> vehicleService.create(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Biển số xe đã tồn tại trong chi nhánh này");
    }

    @Test
    void create_withSameLicensePlateInDifferentBranch_shouldSucceed() {
        // Given
        Branches anotherBranch = new Branches();
        anotherBranch.setBranchName("Another Branch");
        anotherBranch.setLocation("Another Location");
        anotherBranch.setStatus(BranchStatus.ACTIVE);
        Branches savedAnotherBranch = branchesRepository.save(anotherBranch);

        Vehicles existingVehicle = new Vehicles();
        existingVehicle.setCategory(testCategory);
        existingVehicle.setBranch(testBranch);
        existingVehicle.setLicensePlate("30A-12345");
        existingVehicle.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(existingVehicle);

        VehicleRequest request = new VehicleRequest();
        request.setCategoryId(testCategory.getId());
        request.setBranchId(savedAnotherBranch.getId());
        request.setLicensePlate("30A-12345");

        // When
        VehicleResponse result = vehicleService.create(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getLicensePlate()).isEqualTo("30A-12345");
    }

    @Test
    void update_shouldUpdateVehicleSuccessfully() {
        // Given
        Vehicles vehicle = new Vehicles();
        vehicle.setCategory(testCategory);
        vehicle.setBranch(testBranch);
        vehicle.setLicensePlate("30A-11111");
        vehicle.setModel("Old Model");
        vehicle.setBrand("Old Brand");
        vehicle.setStatus(VehicleStatus.AVAILABLE);
        vehicle = vehicleRepository.save(vehicle);

        VehicleRequest request = new VehicleRequest();
        request.setCategoryId(testCategory.getId());
        request.setBranchId(testBranch.getId());
        request.setLicensePlate("30A-11111");
        request.setModel("New Model");
        request.setBrand("New Brand");
        request.setCapacity(5);
        request.setStatus("AVAILABLE");

        // When
        VehicleResponse result = vehicleService.update(vehicle.getId(), request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getModel()).isEqualTo("New Model");
        assertThat(result.getBrand()).isEqualTo("New Brand");
        assertThat(result.getCapacity()).isEqualTo(5);
    }

    @Test
    void update_withInvalidId_shouldThrowException() {
        // Given
        VehicleRequest request = new VehicleRequest();
        request.setCategoryId(testCategory.getId());
        request.setBranchId(testBranch.getId());
        request.setLicensePlate("30A-99999");

        // When & Then
        assertThatThrownBy(() -> vehicleService.update(99999, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy xe");
    }

    @Test
    void getById_shouldReturnVehicle() {
        // Given
        Vehicles vehicle = new Vehicles();
        vehicle.setCategory(testCategory);
        vehicle.setBranch(testBranch);
        vehicle.setLicensePlate("30A-22222");
        vehicle.setModel("Test Model");
        vehicle.setStatus(VehicleStatus.AVAILABLE);
        vehicle = vehicleRepository.save(vehicle);

        // When
        VehicleResponse result = vehicleService.getById(vehicle.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(vehicle.getId());
        assertThat(result.getLicensePlate()).isEqualTo("30A-22222");
        assertThat(result.getModel()).isEqualTo("Test Model");
    }

    @Test
    void getById_withInvalidId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> vehicleService.getById(99999))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy xe");
    }

    @Test
    void getAll_shouldReturnAllVehicles() {
        // Given
        for (int i = 0; i < 3; i++) {
            Vehicles vehicle = new Vehicles();
            vehicle.setCategory(testCategory);
            vehicle.setBranch(testBranch);
            vehicle.setLicensePlate("30A-0000" + i);
            vehicle.setStatus(VehicleStatus.AVAILABLE);
            vehicleRepository.save(vehicle);
        }

        // When
        List<VehicleResponse> result = vehicleService.getAll();

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(3);
    }

    @Test
    void search_shouldFindVehiclesByLicensePlate() {
        // Given
        Vehicles vehicle1 = new Vehicles();
        vehicle1.setCategory(testCategory);
        vehicle1.setBranch(testBranch);
        vehicle1.setLicensePlate("30A-ABC123");
        vehicle1.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle1);

        Vehicles vehicle2 = new Vehicles();
        vehicle2.setCategory(testCategory);
        vehicle2.setBranch(testBranch);
        vehicle2.setLicensePlate("30B-XYZ789");
        vehicle2.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle2);

        // When
        List<VehicleResponse> result = vehicleService.search("ABC");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
        assertThat(result).anyMatch(v -> v.getLicensePlate().contains("ABC"));
    }

    @Test
    void search_shouldBeCaseInsensitive() {
        // Given
        Vehicles vehicle = new Vehicles();
        vehicle.setCategory(testCategory);
        vehicle.setBranch(testBranch);
        vehicle.setLicensePlate("30A-ABC123");
        vehicle.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle);

        // When
        List<VehicleResponse> result = vehicleService.search("abc");

        // Then
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(v -> v.getLicensePlate().contains("ABC"));
    }

    @Test
    void filter_byCategory_shouldReturnFilteredVehicles() {
        // Given
        VehicleCategoryPricing anotherCategory = new VehicleCategoryPricing();
        anotherCategory.setCategoryName("7 Seater");
        anotherCategory.setSeats(7);
        anotherCategory.setStatus(VehicleCategoryStatus.ACTIVE);
        anotherCategory = categoryRepository.save(anotherCategory);

        Vehicles vehicle1 = new Vehicles();
        vehicle1.setCategory(testCategory);
        vehicle1.setBranch(testBranch);
        vehicle1.setLicensePlate("30A-11111");
        vehicle1.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle1);

        Vehicles vehicle2 = new Vehicles();
        vehicle2.setCategory(anotherCategory);
        vehicle2.setBranch(testBranch);
        vehicle2.setLicensePlate("30A-22222");
        vehicle2.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle2);

        // When
        List<VehicleResponse> result = vehicleService.filter(testCategory.getId(), null, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(v -> v.getLicensePlate().equals("30A-11111"));
        assertThat(result).noneMatch(v -> v.getLicensePlate().equals("30A-22222"));
    }

    @Test
    void filter_byBranch_shouldReturnFilteredVehicles() {
        // Given
        Branches anotherBranch = new Branches();
        anotherBranch.setBranchName("Another Branch");
        anotherBranch.setLocation("Another Location");
        anotherBranch.setStatus(BranchStatus.ACTIVE);
        Branches savedAnotherBranch = branchesRepository.save(anotherBranch);

        Vehicles vehicle1 = new Vehicles();
        vehicle1.setCategory(testCategory);
        vehicle1.setBranch(testBranch);
        vehicle1.setLicensePlate("30A-11111");
        vehicle1.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle1);

        Vehicles vehicle2 = new Vehicles();
        vehicle2.setCategory(testCategory);
        vehicle2.setBranch(savedAnotherBranch);
        vehicle2.setLicensePlate("30A-22222");
        vehicle2.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle2);

        // When
        List<VehicleResponse> result = vehicleService.filter(null, testBranch.getId(), null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(v -> v.getLicensePlate().equals("30A-11111"));
        assertThat(result).noneMatch(v -> v.getLicensePlate().equals("30A-22222"));
    }

    @Test
    void filter_byStatus_shouldReturnFilteredVehicles() {
        // Given
        Vehicles vehicle1 = new Vehicles();
        vehicle1.setCategory(testCategory);
        vehicle1.setBranch(testBranch);
        vehicle1.setLicensePlate("30A-11111");
        vehicle1.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle1);

        Vehicles vehicle2 = new Vehicles();
        vehicle2.setCategory(testCategory);
        vehicle2.setBranch(testBranch);
        vehicle2.setLicensePlate("30A-22222");
        vehicle2.setStatus(VehicleStatus.MAINTENANCE);
        vehicleRepository.save(vehicle2);

        // When
        List<VehicleResponse> result = vehicleService.filter(null, null, "AVAILABLE");

        // Then
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(v -> v.getLicensePlate().equals("30A-11111"));
        assertThat(result).noneMatch(v -> v.getLicensePlate().equals("30A-22222"));
    }

    @Test
    void filter_withMultipleFilters_shouldReturnFilteredVehicles() {
        // Given
        Vehicles vehicle1 = new Vehicles();
        vehicle1.setCategory(testCategory);
        vehicle1.setBranch(testBranch);
        vehicle1.setLicensePlate("30A-11111");
        vehicle1.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle1);

        Vehicles vehicle2 = new Vehicles();
        vehicle2.setCategory(testCategory);
        vehicle2.setBranch(testBranch);
        vehicle2.setLicensePlate("30A-22222");
        vehicle2.setStatus(VehicleStatus.MAINTENANCE);
        vehicleRepository.save(vehicle2);

        // When
        List<VehicleResponse> result = vehicleService.filter(
                testCategory.getId(), testBranch.getId(), "AVAILABLE");

        // Then
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(v -> v.getLicensePlate().equals("30A-11111"));
        assertThat(result).noneMatch(v -> v.getLicensePlate().equals("30A-22222"));
    }

    @Test
    void getAllWithPagination_shouldReturnPagedResults() {
        // Given
        for (int i = 0; i < 15; i++) {
            Vehicles vehicle = new Vehicles();
            vehicle.setCategory(testCategory);
            vehicle.setBranch(testBranch);
            vehicle.setLicensePlate("30A-PAG" + String.format("%03d", i));
            vehicle.setStatus(VehicleStatus.AVAILABLE);
            vehicleRepository.save(vehicle);
        }

        // When
        PageResponse<?> result = vehicleService.getAllWithPagination(
                null, null, null, null, 1, 10, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(15);
        assertThat(result.getPageSize()).isEqualTo(10);
    }

    @Test
    void getAllWithPagination_withFilters_shouldReturnFilteredPagedResults() {
        // Given
        for (int i = 0; i < 5; i++) {
            Vehicles vehicle = new Vehicles();
            vehicle.setCategory(testCategory);
            vehicle.setBranch(testBranch);
            vehicle.setLicensePlate("30A-FIL" + i);
            vehicle.setStatus(VehicleStatus.AVAILABLE);
            vehicleRepository.save(vehicle);
        }

        // When
        PageResponse<?> result = vehicleService.getAllWithPagination(
                null, testCategory.getId(), testBranch.getId(), "AVAILABLE", 1, 10, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(5);
    }

    @Test
    void getAllWithPagination_withSorting_shouldReturnSortedResults() {
        // Given
        for (int i = 0; i < 5; i++) {
            Vehicles vehicle = new Vehicles();
            vehicle.setCategory(testCategory);
            vehicle.setBranch(testBranch);
            vehicle.setLicensePlate("30A-SORT" + i);
            vehicle.setStatus(VehicleStatus.AVAILABLE);
            vehicleRepository.save(vehicle);
        }

        // When
        PageResponse<?> result = vehicleService.getAllWithPagination(
                null, null, null, null, 1, 10, "id:desc");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(5);
    }

    @Test
    void delete_shouldDeleteVehicle() {
        // Given
        Vehicles vehicle = new Vehicles();
        vehicle.setCategory(testCategory);
        vehicle.setBranch(testBranch);
        vehicle.setLicensePlate("30A-DELETE");
        vehicle.setStatus(VehicleStatus.AVAILABLE);
        vehicle = vehicleRepository.save(vehicle);

        // When
        vehicleService.delete(vehicle.getId());

        // Then
        assertThat(vehicleRepository.findById(vehicle.getId())).isEmpty();
    }

    @Test
    void getVehiclesByBranch_shouldReturnVehiclesInBranch() {
        // Given
        Branches anotherBranch = new Branches();
        anotherBranch.setBranchName("Another Branch");
        anotherBranch.setLocation("Another Location");
        anotherBranch.setStatus(BranchStatus.ACTIVE);
        Branches savedAnotherBranch = branchesRepository.save(anotherBranch);

        Vehicles vehicle1 = new Vehicles();
        vehicle1.setCategory(testCategory);
        vehicle1.setBranch(testBranch);
        vehicle1.setLicensePlate("30A-BR1");
        vehicle1.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle1);

        Vehicles vehicle2 = new Vehicles();
        vehicle2.setCategory(testCategory);
        vehicle2.setBranch(savedAnotherBranch);
        vehicle2.setLicensePlate("30A-BR2");
        vehicle2.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle2);

        // When
        List<VehicleResponse> result = vehicleService.getVehiclesByBranch(testBranch.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(v -> v.getLicensePlate().equals("30A-BR1"));
        assertThat(result).noneMatch(v -> v.getLicensePlate().equals("30A-BR2"));
    }

    @Test
    void create_withDefaultStatus_shouldSetToAvailable() {
        // Given
        VehicleRequest request = new VehicleRequest();
        request.setCategoryId(testCategory.getId());
        request.setBranchId(testBranch.getId());
        request.setLicensePlate("30A-DEFAULT");
        // status not set

        // When
        VehicleResponse result = vehicleService.create(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("AVAILABLE");
    }
}

