package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Branch.CreateBranchRequest;
import org.example.ptcmssbackend.dto.request.Branch.UpdateBranchRequest;
import org.example.ptcmssbackend.dto.response.Branch.BranchResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.service.BranchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@Tag(name = "Branch Management", description = "Quản lý chi nhánh, thêm - sửa - xem - vô hiệu hóa")
public class BranchController {

    private final BranchService branchService;

    // ======================= CREATE =======================
    @Operation(summary = "Tạo chi nhánh mới", description = "Admin và Manager được phép thêm chi nhánh mới.")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<?> createBranch(@RequestBody CreateBranchRequest request) {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Create branch successfully",
                    branchService.createBranch(request));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ======================= UPDATE =======================
    @Operation(summary = "Cập nhật chi nhánh", description = "Cho phép Admin hoặc Manager chỉnh sửa chi nhánh.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<?> updateBranch(
            @Parameter(description = "ID chi nhánh") @PathVariable Integer id,
            @RequestBody UpdateBranchRequest request) {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Update branch successfully",
                    branchService.updateBranch(id, request));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ======================= GET ALL =======================
    @Operation(summary = "Danh sách chi nhánh", description = "Cho phép Admin, Manager và Accountant xem danh sách chi nhánh.")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
    public ResponseData<?> getAllBranches(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy) {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get all branches successfully",
                    branchService.getAllBranches(keyword, page, size, sortBy));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ======================= GET BY ID =======================
    @Operation(summary = "Chi tiết chi nhánh", description = "Cho phép Admin, Manager và Accountant xem chi tiết chi nhánh.")
    @GetMapping("/{id}")
//    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
    public ResponseData<?> getBranchById(
            @Parameter(description = "ID chi nhánh") @PathVariable Integer id) {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get branch by id successfully",
                    branchService.getBranchById(id));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ======================= DELETE =======================
    @Operation(summary = "Vô hiệu hóa chi nhánh", description = "Chỉ Admin có quyền vô hiệu hóa (INACTIVE) chi nhánh.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseData<String> deleteBranch(
            @Parameter(description = "ID chi nhánh") @PathVariable Integer id) {
        try {
            log.info("Delete branch {}", id);
            branchService.deleteBranch(id);
            return new ResponseData<>(HttpStatus.OK.value(), "Delete branch successfully");
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Operation(
            summary = "Lấy chi nhánh theo userId",
            description = "API trả về thông tin chi nhánh mà user đang thuộc về. Mapping dữ liệu: Users -> Employees -> Branches."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lấy chi nhánh thành công",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = BranchResponse.class))),
            @ApiResponse(responseCode = "404", description = "User không có chi nhánh"),
    })
    @GetMapping("/by-user/{userId}")
    public ResponseEntity<BranchResponse> getBranchByUserId(
            @Parameter(description = "ID của User", example = "5")
            @PathVariable Integer userId
    ) {
        try {
            return ResponseEntity.ok(branchService.getBranchByUserId(userId));
        } catch (RuntimeException e) {
            log.warn("User {} does not have a branch: {}", userId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // ======================= GET ALL FOR SELECTION =======================
    @Operation(
            summary = "Lấy danh sách tất cả chi nhánh (không phân trang)",
            description = "API trả về danh sách tất cả chi nhánh đang hoạt động để hiển thị trong dropdown/select. " +
                    "Dùng cho Admin chọn chi nhánh khi tạo Manager hoặc các form khác."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = BranchResponse.class)))
    })
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<?> getAllBranchesForSelection() {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get all branches for selection successfully",
                    branchService.getAllBranchesForSelection());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Operation(
            summary = "Lấy dashboard statistics cho Manager theo chi nhánh",
            description = "API trả về các chỉ số dashboard cho Manager: " +
                    "Thông tin chi nhánh, các chỉ số tài chính (doanh thu, chi phí, lợi nhuận), " +
                    "Thống kê chuyến đi (hoàn thành, hủy, tổng km), " +
                    "Top tài xế hiệu suất cao, Hiệu suất xe (chi phí/km). " +
                    "Ví dụ: GET /api/branches/1/dashboard-stats?period=2025-10"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lấy dashboard stats thành công",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = org.example.ptcmssbackend.dto.response.Branch.ManagerDashboardStatsResponse.class))),
            @ApiResponse(responseCode = "404", description = "Chi nhánh không tồn tại"),
    })
    @GetMapping("/{branchId}/dashboard-stats")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<?> getManagerDashboardStats(
            @Parameter(description = "ID chi nhánh", example = "1")
            @PathVariable Integer branchId,
            @Parameter(description = "Kỳ báo cáo (format: YYYY-MM)", example = "2025-10")
            @RequestParam(defaultValue = "2025-10") String period
    ) {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get dashboard stats successfully",
                    branchService.getManagerDashboardStats(branchId, period));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
