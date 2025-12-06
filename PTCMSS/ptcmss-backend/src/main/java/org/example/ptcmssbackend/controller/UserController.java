package org.example.ptcmssbackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.User.ChangePasswordRequest;
import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateProfileRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.response.User.UserResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    /**
     * Danh sách user (Admin/Manager dùng)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<List<UserResponse>> listUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer roleId,
            @RequestParam(required = false) UserStatus status
    ) {
        List<UserResponse> users = userService.getAllUsers(keyword, roleId, status);
        return new ResponseData<>(HttpStatus.OK.value(), "Get users successfully", users);
    }

    /**
     * Danh sách user theo chi nhánh
     */
    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<List<UserResponse>> listUsersByBranch(@PathVariable Integer branchId) {
        List<UserResponse> users = userService.getUsersByBranch(branchId);
        return new ResponseData<>(HttpStatus.OK.value(), "Get users by branch successfully", users);
    }

    /**
     * Chi tiết user theo ID
     * Dùng cho:
     *  - Trang quản trị (Admin/Manager)
     *  - Trang /me/profile: FE gửi đúng userId hiện tại
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR','DRIVER','ACCOUNTANT')")
    public ResponseData<UserResponse> getUserById(@PathVariable Integer id, Principal principal) {
        // Optional: có thể chặn user thường xem profile người khác, nhưng hiện tại FE dùng đúng id của mình
        UserResponse user = userService.getUserById(id);
        return new ResponseData<>(HttpStatus.OK.value(), "Get user successfully", user);
    }

    /**
     * Tạo user mới (Admin)
     */
    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseData<Integer> createUser(@RequestBody CreateUserRequest request) {
        Integer id = userService.createUser(request);
        return new ResponseData<>(HttpStatus.OK.value(), "Create user successfully", id);
    }

    /**
     * Cập nhật user (Admin)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseData<Integer> updateUser(
            @PathVariable Integer id,
            @RequestBody UpdateUserRequest request
    ) {
        Integer updatedId = userService.updateUser(id, request);
        return new ResponseData<>(HttpStatus.OK.value(), "Update user successfully", updatedId);
    }

    /**
     * Toggle trạng thái user (Admin)
     */
    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseData<Void> toggleStatus(@PathVariable Integer id) {
        userService.toggleUserStatus(id);
        return new ResponseData<>(HttpStatus.OK.value(), "Cập nhật trạng thái thành công");
    }

    /**
     * User tự cập nhật profile của mình (phone, address)
     */
    @PatchMapping("/{id}/profile")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR','DRIVER','ACCOUNTANT')")
    public ResponseData<Integer> updateProfile(
            @PathVariable Integer id,
            @RequestBody UpdateProfileRequest request
    ) {
        Integer updatedId = userService.updateProfile(id, request);
        return new ResponseData<>(HttpStatus.OK.value(), "Cập nhật hồ sơ thành công", updatedId);
    }

    /**
     * Upload avatar user
     */
    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR','DRIVER','ACCOUNTANT')")
    public ResponseData<String> uploadAvatar(
            @PathVariable Integer id,
            @RequestPart("file") MultipartFile file
    ) {
        String url = userService.updateAvatar(id, file);
        return new ResponseData<>(HttpStatus.OK.value(), "Cập nhật ảnh đại diện thành công", url);
    }

    /**
     * User tự đổi mật khẩu
     */
    @PostMapping("/{id}/change-password")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR','DRIVER','ACCOUNTANT')")
    public ResponseData<Void> changePassword(
            @PathVariable Integer id,
            @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(id, request);
        return new ResponseData<>(HttpStatus.OK.value(), "Đổi mật khẩu thành công");
    }
}


