
package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.response.UserResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Quản lý người dùng, tạo - sửa - khóa - kích hoạt tài khoản")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Tạo người dùng mới", description = "Tạo tài khoản cho nhân viên. Sau này sẽ gửi email thiết lập mật khẩu.")
    @ApiResponse(responseCode = "200", description = "Tạo thành công",
            content = @Content(schema = @Schema(implementation = Users.class)))
    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')") // ✅ Chỉ admin mới được tạo user
    public ResponseData<?> createUser(@RequestBody CreateUserRequest request) {
        return new ResponseData<>(HttpStatus.OK.value(), "Create user successfully", userService.createUser(request));
    }

    @Operation(summary = "Cập nhật người dùng", description = "Cập nhật thông tin người dùng (dành cho Admin hoặc chính người đó).")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id") // ✅ Cho phép admin hoặc chính user đó
    public ResponseData<?> updateUser(
            @Parameter(description = "ID người dùng") @PathVariable Integer id,
            @RequestBody UpdateUserRequest request) {
        return new ResponseData<>(HttpStatus.OK.value(), "Update user successfully", userService.updateUser(id, request));
    }

    @Operation(summary = "Lấy danh sách người dùng", description = "Lọc theo từ khóa, vai trò, trạng thái.")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseData<List<UserResponse>> getAllUsers(
            @Parameter(description = "Từ khóa tìm kiếm (tên hoặc email)") @RequestParam(required = false) String keyword,
            @Parameter(description = "ID vai trò") @RequestParam(required = false) Integer roleId,
            @Parameter(description = "Trạng thái người dùng") @RequestParam(required = false) UserStatus status) {
        return new ResponseData<>(HttpStatus.OK.value(), "Get all users successfully",
                userService.getAllUsers(keyword, roleId, status));
    }

    @Operation(summary = "Xem chi tiết người dùng", description = "Lấy thông tin chi tiết của 1 người dùng.")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id") // ✅ Admin hoặc chính người đó
    public ResponseData<?> getUserById(
            @Parameter(description = "ID người dùng") @PathVariable Integer id) {
        return new ResponseData<>(HttpStatus.OK.value(), "Get user by id successfully",
                userService.getUserById(id));
    }

    @Operation(summary = "Kích hoạt / Vô hiệu hóa tài khoản", description = "Đổi trạng thái người dùng ACTIVE ↔ INACTIVE.")
    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> toggleStatus(
            @Parameter(description = "ID người dùng") @PathVariable Integer id) {
        userService.toggleUserStatus(id);
        return ResponseEntity.ok("User status updated successfully");
    }
}

