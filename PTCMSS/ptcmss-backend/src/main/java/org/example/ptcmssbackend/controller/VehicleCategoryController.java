package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.Vehicle.VehicleCategoryRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleCategoryResponse;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.service.VehicleCategoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicle-categories")
@RequiredArgsConstructor
public class VehicleCategoryController {

    private final VehicleCategoryService categoryService;


    @Operation(summary = "Lấy danh sách loại xe", description = "Lấy danh sách loại xe")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<?>> list() {
        List<VehicleCategoryResponse> data = categoryService.listAll();
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("OK").data(data).build());
    }

    @Operation(summary = "Lấy thông tin loại xe", description = "Lấy thông tin chi tiết của một loại xe")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<?>> get(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("OK").data(categoryService.getById(id)).build());
    }

    @Operation(summary = "Tạo loại xe", description = "Tạo loại xe")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<?>> create(@RequestBody VehicleCategoryRequest req) {
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("Created").data(categoryService.create(req)).build());
    }


    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<?>> update(@PathVariable Integer id, @RequestBody VehicleCategoryRequest req) {
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("Updated").data(categoryService.update(id, req)).build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa loại xe", description = "Xóa loại xe")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Integer id) {
        categoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("Deleted").build());
    }
}
