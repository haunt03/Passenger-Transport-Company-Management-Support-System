package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.SystemSetting.SystemSettingRequest;
import org.example.ptcmssbackend.dto.response.SystemSetting.SystemSettingResponse;
import org.example.ptcmssbackend.service.SystemSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/system-settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class SystemSettingController {

    private final SystemSettingService repo;

    @Operation(summary = "Lấy danh sách system settings")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<List<SystemSettingResponse>> getAll() {
        return ResponseEntity.ok(repo.getAll());
    }

    @Operation(summary = "Lấy chi tiết system setting")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<SystemSettingResponse> getById(
            @Parameter(description = "ID setting") @PathVariable Integer id) {
        return ResponseEntity.ok(repo.getById(id));
    }

    @Operation(summary = "Tạo mới system setting")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemSettingResponse> create(@Validated @RequestBody SystemSettingRequest request) {
        return ResponseEntity.ok(repo.create(request));
    }

    @Operation(summary = "Cập nhật system setting")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemSettingResponse> update(
            @Parameter(description = "ID setting") @PathVariable Integer id,
            @Validated @RequestBody SystemSettingRequest request) {
        return ResponseEntity.ok(repo.update(id, request));
    }

    @Operation(summary = "Xóa system setting")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@Parameter(description = "ID setting") @PathVariable Integer id) {
        repo.delete(id);
        return ResponseEntity.noContent().build();
    }
}
