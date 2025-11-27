package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.response.User.UserResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.dto.response.common.ResponseError;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j(topic = "USER-CONTROLLERF")
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
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')") //  Admin và Manager được tạo user
    public ResponseData<?> createUser(@Valid @RequestBody CreateUserRequest request) {
        try{
            log.info("createUser: {}", request);
            return new ResponseData<>(HttpStatus.OK.value(), "Create user successfully", userService.createUser(request));
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Cập nhật người dùng", description = "Cập nhật thông tin người dùng (chỉ dành cho Admin).")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')") //  Chỉ Admin mới được cập nhật thông tin user
    public ResponseData<?> updateUser(
            @Parameter(description = "ID người dùng") @PathVariable Integer id,
            @Valid @RequestBody UpdateUserRequest request) {
        try{
            log.info("updateUser: {}", request);
            return new ResponseData<>(HttpStatus.OK.value(), "Update user successfully", userService.updateUser(id, request));
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Cập nhật thông tin cá nhân", description = "Người dùng tự cập nhật số điện thoại và địa chỉ của mình.")
    @PatchMapping("/{id}/profile")
    @PreAuthorize("#id == authentication.principal.id") //  Chỉ cho phép user tự cập nhật profile của mình
    public ResponseData<?> updateProfile(
            @Parameter(description = "ID người dùng") @PathVariable Integer id,
            @Valid @RequestBody org.example.ptcmssbackend.dto.request.User.UpdateProfileRequest request) {
        try{
            log.info("updateProfile: {}", request);
            return new ResponseData<>(HttpStatus.OK.value(), "Update profile successfully", userService.updateProfile(id, request));
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Lấy danh sách người dùng", description = "Lọc theo từ khóa, vai trò, trạng thái.")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseData<List<UserResponse>> getAllUsers(
            @Parameter(description = "Từ khóa tìm kiếm (tên hoặc email)") @RequestParam(required = false) String keyword,
            @Parameter(description = "ID vai trò") @RequestParam(required = false) Integer roleId,
            @Parameter(description = "Trạng thái người dùng") @RequestParam(required = false) UserStatus status) {
        try{
            log.info("getAllUsers: {}", keyword, roleId, status);
            return new ResponseData<>(HttpStatus.OK.value(), "Get all users successfully", userService.getAllUsers(keyword, roleId, status));
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Xem chi tiết người dùng", description = "Lấy thông tin chi tiết của 1 người dùng.")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id") /// Admin hoặc chính người đó
    public ResponseData<?> getUserById(
            @Parameter(description = "ID người dùng") @PathVariable Integer id) {
        try {
            log.info("getUserById: {}", id);
            return new ResponseData<>(HttpStatus.OK.value(), "Get user by id successfully", userService.getUserById(id));
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Kích hoạt / Vô hiệu hóa tài khoản", description = "Đổi trạng thái người dùng ACTIVE ↔ INACTIVE.")
    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseData<String> toggleStatus(
            @Parameter(description = "ID người dùng") @PathVariable Integer id) {
        try{
            log.info("toggleStatus: {}", id);
            userService.toggleUserStatus(id);
            return new ResponseData<>(HttpStatus.OK.value(), "Toggle user status successfully", null);
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    // ------------------- Upload Avatar -------------------

    @Operation(
            summary = "Cập nhật ảnh đại diện người dùng",
            description = "Người dùng hoặc Admin có thể tải lên ảnh đại diện mới",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Cập nhật ảnh thành công"),
                    @ApiResponse(responseCode = "404", description = "Không tìm thấy người dùng")
            }
    )
    @PostMapping(
            value = "/{id}/avatar",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public ResponseData<?> uploadAvatar(
            @PathVariable Integer id,
            @Parameter(description = "File ảnh cần upload", required = true)
            @RequestParam("file") MultipartFile file)
    {

        try{
            log.info("uploadAvatar: {}", id);
            return new ResponseData<>(HttpStatus.OK.value(), "update avartar", userService.updateAvatar(id, file));
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }


    @Operation(
            summary = "Tìm kiếm và lọc người dùng",
            description = "API cho phép tìm kiếm và lọc user theo nhiều điều kiện: keyword (tìm theo họ tên, email, số điện thoại), roleId, branchId, status (ACTIVE/INACTIVE)"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "500", description = "Lỗi hệ thống")
    })
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseData<List<UserResponse>> searchUsers(

            @Parameter(description = "Từ khóa tìm kiếm (tên, email, số điện thoại)", example = "trong")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo quyền (roleId)", example = "2")
            @RequestParam(required = false) Integer roleId,

            @Parameter(description = "Lọc theo chi nhánh", example = "3")
            @RequestParam(required = false) Integer branchId,

            @Parameter(description = "Lọc theo trạng thái", example = "ACTIVE")
            @RequestParam(required = false) UserStatus status
    ) {
        try{
            log.info("searchUsers: {}", keyword);
            return new ResponseData<>(HttpStatus.OK.value(), "search users successfully", userService.searchUsers(keyword, roleId, branchId, status));
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }



    @Operation(
            summary = "Lấy danh sách user theo chi nhánh",
            description = "API trả về danh sách người dùng thuộc một chi nhánh cụ thể. Luồng dữ liệu: Branch -> Employees -> Users. Hệ thống tự JOIN Employees -> Users để trả về danh sách đúng."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lấy danh sách user thành công",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = UserResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Không tìm thấy chi nhánh"
            ),
            @ApiResponse(
                    responseCode = "500",
                    description = "Lỗi hệ thống"
            )
    })
    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseData<?> getUsersByBranch(
            @Parameter(
                    description = "ID chi nhánh cần lọc user",
                    example = "3"
            )
            @PathVariable Integer branchId
    ) {
        try {
            log.info("getUsersByBranch: {}", branchId);
            return new ResponseData<>(HttpStatus.OK.value(), "get users successfully", userService.getUsersByBranch(branchId));
        } catch (Exception e) {
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }
}

