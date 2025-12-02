package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.Vehicle.VehicleCategoryRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleCategoryResponse;
import org.example.ptcmssbackend.entity.VehicleCategoryPricing;
import org.example.ptcmssbackend.enums.VehicleCategoryStatus;
import org.example.ptcmssbackend.repository.VehicleCategoryPricingRepository;
import org.example.ptcmssbackend.repository.VehicleRepository;
import org.example.ptcmssbackend.service.VehicleCategoryService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleCategoryServiceImpl implements VehicleCategoryService {

    private final VehicleCategoryPricingRepository categoryRepository;
    private final VehicleRepository vehicleRepository;

    @Override
    public List<VehicleCategoryResponse> listAll() {
        return categoryRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public VehicleCategoryResponse getById(Integer id) {
        VehicleCategoryPricing c = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy loại xe"));
        return toResponse(c);
    }

    @Override
    public VehicleCategoryResponse create(VehicleCategoryRequest req) {
        VehicleCategoryPricing c = new VehicleCategoryPricing();
        apply(c, req);
        return toResponse(categoryRepository.save(c));
    }

    @Override
    public VehicleCategoryResponse update(Integer id, VehicleCategoryRequest req) {
        VehicleCategoryPricing c = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy loại xe"));
        apply(c, req);
        return toResponse(categoryRepository.save(c));
    }

    @Override
    public void delete(Integer id) {
        categoryRepository.deleteById(id);
    }

    private void apply(VehicleCategoryPricing c, VehicleCategoryRequest req) {
        c.setCategoryName(req.getCategoryName());
        c.setSeats(req.getSeats());
        c.setDescription(req.getDescription());
        c.setBaseFare(req.getBaseFare());
        c.setPricePerKm(req.getPricePerKm());
        c.setHighwayFee(req.getHighwayFee());
        c.setFixedCosts(req.getFixedCosts());
        c.setSameDayFixedPrice(req.getSameDayFixedPrice());
        c.setIsPremium(req.getIsPremium());
        c.setPremiumSurcharge(req.getPremiumSurcharge());
        c.setEffectiveDate(req.getEffectiveDate());
        if (req.getStatus() != null) {
            c.setStatus(VehicleCategoryStatus.valueOf(req.getStatus().toUpperCase()));
        }
    }

    private VehicleCategoryResponse toResponse(VehicleCategoryPricing c) {
        long vehiclesCount = vehicleRepository.countByCategoryId(c.getId());

        return VehicleCategoryResponse.builder()
                .id(c.getId())
                .categoryName(c.getCategoryName())
                .seats(c.getSeats())
                .vehiclesCount((int) vehiclesCount)
                .description(c.getDescription())
                .baseFare(c.getBaseFare())
                .pricePerKm(c.getPricePerKm())
                .highwayFee(c.getHighwayFee())
                .fixedCosts(c.getFixedCosts())
                .sameDayFixedPrice(c.getSameDayFixedPrice())
                .isPremium(c.getIsPremium())
                .premiumSurcharge(c.getPremiumSurcharge())
                .effectiveDate(c.getEffectiveDate())
                .status(c.getStatus())
                .build();
    }
}

