package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.Role.CreateRoleRequest;
import org.example.ptcmssbackend.dto.request.Role.UpdateRoleRequest;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@Tag(name = "Role Management", description = "Quản lý vai trò trong hệ thống (Admin, Manager, Staff, ...)")
public class RoleController {

    private final RoleService roleService;

    @Operation(summary = "Tạo vai trò mới", description = "Thêm vai trò mới cho hệ thống.")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Roles> createRole(@RequestBody CreateRoleRequest request) {
        return ResponseEntity.ok(roleService.createRole(request));
    }

    @Operation(summary = "Cập nhật vai trò", description = "Sửa tên hoặc mô tả vai trò.")
    @PutMapping("/{id}")
    public ResponseEntity<Roles> updateRole(
            @Parameter(description = "ID vai trò") @PathVariable Integer id,
            @RequestBody UpdateRoleRequest request) {
        return ResponseEntity.ok(roleService.updateRole(id, request));
    }

    @Operation(summary = "Danh sách vai trò", description = "Lấy danh sách tất cả các vai trò trong hệ thống.")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Roles>> getAllRoles(
            @Parameter(description = "Từ khóa tìm kiếm") @RequestParam(required = false) String keyword,
            @Parameter(description = "Trạng thái vai trò") @RequestParam(required = false) UserStatus status) {
        return ResponseEntity.ok(roleService.getAllRoles(keyword, status));
    }

    @Operation(summary = "Chi tiết vai trò", description = "Xem thông tin chi tiết của một vai trò.")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Roles> getRoleById(@Parameter(description = "ID vai trò") @PathVariable Integer id) {
        return ResponseEntity.ok(roleService.getRoleById(id));
    }

    @Operation(summary = "Vô hiệu hóa vai trò", description = "Đánh dấu vai trò là INACTIVE.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteRole(@Parameter(description = "ID vai trò") @PathVariable Integer id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok("Role disabled successfully");
    }
}