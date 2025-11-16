
package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.response.User.UserResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
    @PreAuthorize("hasRole('ADMIN')") //  Chỉ admin mới được tạo user
    public ResponseData<?> createUser(@RequestBody CreateUserRequest request) {
        return new ResponseData<>(HttpStatus.OK.value(), "Create user successfully", userService.createUser(request));
    }

    @Operation(summary = "Cập nhật người dùng", description = "Cập nhật thông tin người dùng (dành cho Admin hoặc chính người đó).")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id") //  Cho phép admin hoặc chính user đó
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
    public ResponseEntity<ResponseData<String>> uploadAvatar(
            @PathVariable Integer id,
            @Parameter(description = "File ảnh cần upload", required = true)
            @RequestParam("file") MultipartFile file) {

        String imageUrl = userService.updateAvatar(id, file);
        return ResponseEntity.ok(
                new ResponseData<>(HttpStatus.OK.value(), "Avatar updated successfully", imageUrl)
        );
    }


    @Operation(
            summary = "Tìm kiếm và lọc người dùng",
            description = """
                    API cho phép tìm kiếm và lọc user theo nhiều điều kiện:
                    - keyword: tìm theo họ tên, email, số điện thoại
                    - roleId: lọc theo vai trò
                    - branchId: lọc theo chi nhánh  
                    - status: ACTIVE / INACTIVE  
                    Ví dụ:
                    /api/users/search?keyword=an&branchId=1&roleId=4&status=ACTIVE
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "500", description = "Lỗi hệ thống")
    })
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<UserResponse>> searchUsers(

            @Parameter(description = "Từ khóa tìm kiếm (tên, email, số điện thoại)", example = "trong")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo quyền (roleId)", example = "2")
            @RequestParam(required = false) Integer roleId,

            @Parameter(description = "Lọc theo chi nhánh", example = "3")
            @RequestParam(required = false) Integer branchId,

            @Parameter(description = "Lọc theo trạng thái", example = "ACTIVE")
            @RequestParam(required = false) UserStatus status
    ) {
        return ResponseEntity.ok(userService.searchUsers(keyword, roleId, branchId, status));
    }



    @Operation(
            summary = "Lấy danh sách user theo chi nhánh",
            description = """
                API trả về danh sách người dùng thuộc một chi nhánh cụ thể.
                
                Luồng dữ liệu:
                Branch → Employees → Users
                
                Chỉ cần truyền vào branchId là hệ thống tự JOIN Employees → Users để trả về danh sách đúng.
                
                Ví dụ:
                GET /api/users/branch/2
                
                Trả về tất cả Users thuộc chi nhánh có ID = 2.
                """
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
    public ResponseEntity<List<UserResponse>> getUsersByBranch(
            @Parameter(
                    description = "ID chi nhánh cần lọc user",
                    example = "3"
            )
            @PathVariable Integer branchId
    ) {
        return ResponseEntity.ok(userService.getUsersByBranch(branchId));
    }
}

