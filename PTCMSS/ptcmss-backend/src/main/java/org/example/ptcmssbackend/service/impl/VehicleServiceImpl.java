package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.Vehicle.VehicleRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.VehicleCategoryPricing;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.VehicleCategoryPricingRepository;
import org.example.ptcmssbackend.repository.VehicleRepository;
import org.example.ptcmssbackend.service.VehicleService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;
    private final BranchesRepository branchRepository;
    private final VehicleCategoryPricingRepository categoryRepository;

    @Override
    public VehicleResponse create(VehicleRequest request) {
        Vehicles vehicle = mapToEntity(request);
        vehicleRepository.save(vehicle);
        return mapToResponse(vehicle);
    }

    @Override
    public VehicleResponse update(Integer id, VehicleRequest request) {
        Vehicles vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + id));
        Vehicles updated = updateEntity(vehicle, request);
        vehicleRepository.save(updated);
        return mapToResponse(updated);
    }

    @Override
    public VehicleResponse getById(Integer id) {
        Vehicles vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + id));
        return mapToResponse(vehicle);
    }

    @Override
    public List<VehicleResponse> getAll() {
        return vehicleRepository.findAll()
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<VehicleResponse> search(String licensePlate) {
        return vehicleRepository.findByLicensePlateContainingIgnoreCase(licensePlate)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<VehicleResponse> filter(Integer categoryId, Integer branchId, String status) {
        VehicleStatus statusEnum = null;
        if (status != null) statusEnum = VehicleStatus.valueOf(status.toUpperCase());
        return vehicleRepository.filterVehicles(categoryId, branchId, statusEnum)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public void delete(Integer id) {
        vehicleRepository.deleteById(id);
    }

    // -------------------- Private helpers --------------------
    private Vehicles mapToEntity(VehicleRequest req) {
        Vehicles v = new Vehicles();
        v.setLicensePlate(req.getLicensePlate());
        v.setModel(req.getModel());
        v.setBrand(req.getBrand());
        v.setCapacity(req.getCapacity());
        v.setProductionYear(req.getProductionYear());
        v.setRegistrationDate(req.getRegistrationDate());
        v.setInspectionExpiry(req.getInspectionExpiry());
        v.setInsuranceExpiry(req.getInsuranceExpiry());
        v.setOdometer(req.getOdometer());
        v.setStatus(req.getStatus() != null ?
                VehicleStatus.valueOf(req.getStatus().toUpperCase()) :
                VehicleStatus.AVAILABLE);
        v.setBranch(branchRepository.findById(req.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found")));
        v.setCategory(categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found")));
        return v;
    }

    private Vehicles updateEntity(Vehicles existing, VehicleRequest req) {
        existing.setLicensePlate(req.getLicensePlate());
        existing.setModel(req.getModel());
        existing.setBrand(req.getBrand());
        existing.setCapacity(req.getCapacity());
        existing.setProductionYear(req.getProductionYear());
        existing.setRegistrationDate(req.getRegistrationDate());
        existing.setInspectionExpiry(req.getInspectionExpiry());
        existing.setInsuranceExpiry(req.getInsuranceExpiry());
        existing.setOdometer(req.getOdometer());
        existing.setStatus(VehicleStatus.valueOf(req.getStatus().toUpperCase()));
        existing.setBranch(branchRepository.findById(req.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found")));
        existing.setCategory(categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found")));
        return existing;
    }

    private VehicleResponse mapToResponse(Vehicles v) {
        return VehicleResponse.builder()
                .id(v.getId())
                .licensePlate(v.getLicensePlate())
                .model(v.getModel())
                .brand(v.getBrand())
                .capacity(v.getCapacity())
                .productionYear(v.getProductionYear())
                .registrationDate(v.getRegistrationDate())
                .inspectionExpiry(v.getInspectionExpiry())
                .insuranceExpiry(v.getInsuranceExpiry())
                .odometer(v.getOdometer())
                .status(v.getStatus().name())
                .branchName(v.getBranch().getBranchName())
                .branchId(v.getBranch().getId())
                .categoryName(v.getCategory().getCategoryName())
                .categoryId(v.getCategory().getId())
                .build();
    }
}