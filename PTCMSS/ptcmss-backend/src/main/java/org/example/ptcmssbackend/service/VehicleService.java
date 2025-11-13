package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Vehicle.VehicleRequest;

import org.example.ptcmssbackend.dto.response.Vehicle.VehicleResponse;
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
    void delete(Integer id);
}
