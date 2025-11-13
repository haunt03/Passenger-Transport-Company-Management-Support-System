package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Vehicle.VehicleCategoryRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleCategoryResponse;

import java.util.List;

public interface VehicleCategoryService {
    List<VehicleCategoryResponse> listAll();
    VehicleCategoryResponse getById(Integer id);
    VehicleCategoryResponse create(VehicleCategoryRequest req);
    VehicleCategoryResponse update(Integer id, VehicleCategoryRequest req);
    void delete(Integer id);
}

