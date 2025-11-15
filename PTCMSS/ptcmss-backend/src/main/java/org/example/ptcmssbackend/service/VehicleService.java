package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Vehicle.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.request.Vehicle.CreateMaintenanceRequest;
import org.example.ptcmssbackend.dto.request.Vehicle.VehicleRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleExpenseResponse;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleMaintenanceResponse;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleResponse;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleTripResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.VehicleStatus;
import java.util.List;

public interface VehicleService {
    VehicleResponse create(VehicleRequest request);
    VehicleResponse update(Integer id, VehicleRequest request);
    VehicleResponse getById(Integer id);
    List<VehicleResponse> getAll();
    List<VehicleResponse> search(String licensePlate);
    List<VehicleResponse> filter(Integer categoryId, Integer branchId, String status);
    PageResponse<?> getAllWithPagination(String licensePlate, Integer categoryId, Integer branchId, String status, int page, int size, String sortBy);
    void delete(Integer id);

    // New methods for vehicle detail tabs
    List<VehicleTripResponse> getVehicleTrips(Integer vehicleId);
    List<VehicleExpenseResponse> getVehicleExpenses(Integer vehicleId);
    List<VehicleMaintenanceResponse> getVehicleMaintenance(Integer vehicleId);

    // Create maintenance and expense
    VehicleMaintenanceResponse createMaintenance(Integer vehicleId, CreateMaintenanceRequest request);
    VehicleExpenseResponse createExpense(Integer vehicleId, CreateExpenseRequest request);
}

