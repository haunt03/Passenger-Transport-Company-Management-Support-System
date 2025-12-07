package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Vehicle.VehicleCategoryRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleCategoryResponse;
import org.example.ptcmssbackend.entity.VehicleCategoryPricing;
import org.example.ptcmssbackend.enums.VehicleCategoryStatus;
import org.example.ptcmssbackend.repository.VehicleCategoryPricingRepository;
import org.example.ptcmssbackend.repository.VehicleRepository;
import org.example.ptcmssbackend.service.impl.VehicleCategoryServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VehicleCategoryServiceImplTest {

    @Mock
    private VehicleCategoryPricingRepository categoryRepository;
    @Mock
    private VehicleRepository vehicleRepository;

    @InjectMocks
    private VehicleCategoryServiceImpl vehicleCategoryService;

    // ==================== listAll() Tests ====================

    @Test
    void listAll_whenCategoriesExist_shouldReturnAll() {
        // Given
        VehicleCategoryPricing category1 = createTestCategory(1, "Xe 4 chỗ");
        VehicleCategoryPricing category2 = createTestCategory(2, "Xe 7 chỗ");
        List<VehicleCategoryPricing> categories = List.of(category1, category2);

        when(categoryRepository.findAll()).thenReturn(categories);
        when(vehicleRepository.countByCategoryId(anyInt())).thenReturn(5L);

        // When
        List<VehicleCategoryResponse> result = vehicleCategoryService.listAll();

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(categoryRepository).findAll();
    }

    @Test
    void listAll_whenNoCategories_shouldReturnEmptyList() {
        // Given
        when(categoryRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        List<VehicleCategoryResponse> result = vehicleCategoryService.listAll();

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ==================== getById() Tests ====================

    @Test
    void getById_whenCategoryExists_shouldReturnCategory() {
        // Given
        Integer categoryId = 1;
        VehicleCategoryPricing category = createTestCategory(categoryId, "Xe 4 chỗ");

        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(vehicleRepository.countByCategoryId(categoryId)).thenReturn(10L);

        // When
        VehicleCategoryResponse result = vehicleCategoryService.getById(categoryId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(categoryId);
        assertThat(result.getCategoryName()).isEqualTo("Xe 4 chỗ");
        assertThat(result.getVehiclesCount()).isEqualTo(10);
    }

    @Test
    void getById_whenCategoryNotFound_shouldThrowException() {
        // Given
        Integer categoryId = 999;

        when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> vehicleCategoryService.getById(categoryId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy loại xe");
    }

    // ==================== create() Tests ====================

    @Test
    void create_whenValidRequest_shouldCreateSuccessfully() {
        // Given
        VehicleCategoryRequest request = new VehicleCategoryRequest();
        request.setCategoryName("Xe 16 chỗ");
        request.setSeats(16);
        request.setDescription("Xe khách 16 chỗ");
        request.setBaseFare(new BigDecimal("500000"));
        request.setPricePerKm(new BigDecimal("5000"));
        request.setStatus("ACTIVE");

        when(categoryRepository.save(any())).thenAnswer(inv -> {
            VehicleCategoryPricing c = inv.getArgument(0);
            c.setId(1);
            return c;
        });
        when(vehicleRepository.countByCategoryId(1)).thenReturn(0L);

        // When
        VehicleCategoryResponse result = vehicleCategoryService.create(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1);
        assertThat(result.getCategoryName()).isEqualTo("Xe 16 chỗ");
        assertThat(result.getSeats()).isEqualTo(16);
        verify(categoryRepository).save(any());
    }

    // ==================== update() Tests ====================

    @Test
    void update_whenValidRequest_shouldUpdateSuccessfully() {
        // Given
        Integer categoryId = 1;
        VehicleCategoryRequest request = new VehicleCategoryRequest();
        request.setCategoryName("Xe 4 chỗ Premium");
        request.setSeats(4);
        request.setBaseFare(new BigDecimal("600000"));
        request.setStatus("ACTIVE");

        VehicleCategoryPricing category = createTestCategory(categoryId, "Xe 4 chỗ");

        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(categoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(vehicleRepository.countByCategoryId(categoryId)).thenReturn(5L);

        // When
        VehicleCategoryResponse result = vehicleCategoryService.update(categoryId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCategoryName()).isEqualTo("Xe 4 chỗ Premium");
        assertThat(result.getSeats()).isEqualTo(4);
        verify(categoryRepository).save(any());
    }

    @Test
    void update_whenCategoryNotFound_shouldThrowException() {
        // Given
        Integer categoryId = 999;
        VehicleCategoryRequest request = new VehicleCategoryRequest();

        when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> vehicleCategoryService.update(categoryId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy loại xe");
    }

    // ==================== delete() Tests ====================

    @Test
    void delete_whenValidCategory_shouldDeleteSuccessfully() {
        // Given
        Integer categoryId = 1;
        doNothing().when(categoryRepository).deleteById(categoryId);

        // When
        vehicleCategoryService.delete(categoryId);

        // Then
        verify(categoryRepository).deleteById(categoryId);
    }

    // ==================== Helper Methods ====================

    private VehicleCategoryPricing createTestCategory(Integer id, String categoryName) {
        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setId(id);
        category.setCategoryName(categoryName);
        category.setSeats(4);
        category.setDescription("Mô tả " + categoryName);
        category.setBaseFare(new BigDecimal("500000"));
        category.setPricePerKm(new BigDecimal("5000"));
        category.setHighwayFee(new BigDecimal("10000"));
        category.setFixedCosts(new BigDecimal("200000"));
        category.setSameDayFixedPrice(new BigDecimal("800000"));
        category.setIsPremium(false);
        category.setPremiumSurcharge(BigDecimal.ZERO);
        category.setEffectiveDate(LocalDate.now());
        category.setStatus(VehicleCategoryStatus.ACTIVE);
        return category;
    }
}

