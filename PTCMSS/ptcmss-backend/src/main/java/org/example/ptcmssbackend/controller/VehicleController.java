package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Vehicle.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.request.Vehicle.CreateMaintenanceRequest;
import org.example.ptcmssbackend.dto.request.Vehicle.VehicleRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleExpenseResponse;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleMaintenanceResponse;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleResponse;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.service.VehicleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@Slf4j(topic = "VEHICLE_CONTROLLER")
public class VehicleController {

    private final VehicleService vehicleService;

    @Operation(summary = "Tạo mới phương tiện")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<?>> create(@RequestBody VehicleRequest request) {
        try {
            VehicleResponse response = vehicleService.create(request);
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Tạo phương tiện thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi tạo phương tiện: " + e.getMessage())
                    .build());
        }
    }

    @Operation(
            summary = "Lấy danh sách phương tiện (hỗ trợ tìm kiếm/lọc và pagination)",
            description = "Lấy danh sách phương tiện với các tùy chọn: tìm kiếm theo biển số, lọc theo loại xe/chi nhánh/trạng thái, và phân trang. " +
                    "Nếu không có pagination params (page=0, size=20, sortBy=null), sẽ trả về danh sách đầy đủ."
    )
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
    public ResponseEntity<ApiResponse<?>> getAll(
            @Parameter(description = "Tìm kiếm theo biển số (không phân biệt hoa thường)") @RequestParam(required = false) String licensePlate,
            @Parameter(description = "Lọc theo ID loại xe") @RequestParam(required = false) Integer categoryId,
            @Parameter(description = "Lọc theo ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Lọc theo trạng thái (Available, InUse, Maintenance, Inactive)") @RequestParam(required = false) String status,
            @Parameter(description = "Số trang (bắt đầu từ 1, mặc định 0 = không pagination)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang (mặc định 20)") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sắp xếp (format: field:asc hoặc field:desc, ví dụ: id:desc)") @RequestParam(required = false) String sortBy
    ) {
        try {
            // Nếu có pagination params, sử dụng pagination
            if (page > 0 || size != 20 || sortBy != null) {
                PageResponse<?> pageResponse = vehicleService.getAllWithPagination(
                        licensePlate, categoryId, branchId, status, page, size, sortBy);
                return ResponseEntity.ok(ApiResponse.builder()
                        .success(true)
                        .message("Lấy danh sách phương tiện thành công")
                        .data(pageResponse)
                        .build());
            }

            // Nếu không có pagination, trả về list như cũ (backward compatible)
            List<VehicleResponse> list;
            if (licensePlate != null && !licensePlate.isBlank()) {
                list = vehicleService.search(licensePlate);
            } else if (categoryId != null || branchId != null || (status != null && !status.isBlank())) {
                list = vehicleService.filter(categoryId, branchId, status);
            } else {
                list = vehicleService.getAll();
            }
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Lấy danh sách phương tiện thành công")
                    .data(list)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi lấy danh sách: " + e.getMessage())
                    .build());
        }
    }

    @Operation(summary = "Chi tiết phương tiện theo ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT','COORDINATOR')")
    public ResponseEntity<ApiResponse<?>> getById(@PathVariable Integer id) {
        try {
            VehicleResponse response = vehicleService.getById(id);
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Lấy chi tiết xe thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.builder()
                    .success(false)
                    .message("Không tìm thấy xe: " + e.getMessage())
                    .build());
        }
    }

    @Operation(summary = "Cập nhật thông tin xe")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','COORDINATOR')")
    public ResponseEntity<ApiResponse<?>> update(@PathVariable Integer id, @RequestBody VehicleRequest request) {
        try {
            VehicleResponse response = vehicleService.update(id, request);
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Cập nhật xe thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi cập nhật xe: " + e.getMessage())
                    .build());
        }
    }

    @Operation(summary = "Xóa phương tiện")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Integer id) {
        try {
            vehicleService.delete(id);
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Xóa phương tiện thành công")
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi xóa xe: " + e.getMessage())
                    .build());
        }
    }

    // ==================== Vehicle Detail Tabs ====================

    @Operation(summary = "Lịch sử chuyến đi của phương tiện", description = "Tab 3 trong Vehicle Detail")
    @GetMapping("/{id}/trips")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT','COORDINATOR')")
    public ResponseEntity<ApiResponse<?>> getVehicleTrips(
            @Parameter(description = "ID phương tiện") @PathVariable Integer id) {
        try {
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Lấy lịch sử chuyến đi thành công")
                    .data(vehicleService.getVehicleTrips(id))
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi lấy lịch sử chuyến đi: " + e.getMessage())
                    .build());
        }
    }

    @Operation(summary = "Lịch sử chi phí vận hành của phương tiện", description = "Tab 2 trong Vehicle Detail (xăng dầu, cầu đường, sửa chữa)")
    @GetMapping("/{id}/expenses")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','COORDINATOR')")
    public ResponseEntity<ApiResponse<?>> getVehicleExpenses(
            @Parameter(description = "ID phương tiện") @PathVariable Integer id) {
        try {
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Lấy lịch sử chi phí thành công")
                    .data(vehicleService.getVehicleExpenses(id))
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi lấy lịch sử chi phí: " + e.getMessage())
                    .build());
        }
    }

    @Operation(summary = "Lịch sử bảo trì và đăng kiểm của phương tiện", description = "Tab 1 trong Vehicle Detail")
    @GetMapping("/{id}/maintenance")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','COORDINATOR')")
    public ResponseEntity<ApiResponse<?>> getVehicleMaintenance(
            @Parameter(description = "ID phương tiện") @PathVariable Integer id) {
        try {
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Lấy lịch sử bảo trì thành công")
                    .data(vehicleService.getVehicleMaintenance(id))
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi lấy lịch sử bảo trì: " + e.getMessage())
                    .build());
        }
    }

    @Operation(summary = "Thêm nhật ký bảo trì", description = "Tạo mới một bản ghi bảo trì cho phương tiện")
    @PostMapping("/{id}/maintenance")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<?>> createMaintenance(
            @Parameter(description = "ID phương tiện") @PathVariable Integer id,
            @Parameter(description = "Thông tin bảo trì") @RequestBody CreateMaintenanceRequest request) {
        try {
            VehicleMaintenanceResponse response = vehicleService.createMaintenance(id, request);
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Thêm nhật ký bảo trì thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi thêm nhật ký bảo trì: " + e.getMessage())
                    .build());
        }
    }

    @Operation(summary = "Thêm chi phí vận hành", description = "Tạo mới một bản ghi chi phí (xăng dầu, cầu đường, sửa chữa) cho phương tiện")
    @PostMapping("/{id}/expenses")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<?>> createExpense(
            @Parameter(description = "ID phương tiện") @PathVariable Integer id,
            @Parameter(description = "Thông tin chi phí (costType: fuel, toll, repair)") @RequestBody CreateExpenseRequest request) {
        try {
            VehicleExpenseResponse response = vehicleService.createExpense(id, request);
            return ResponseEntity.ok(ApiResponse.builder()
                    .success(true)
                    .message("Thêm chi phí thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi thêm chi phí: " + e.getMessage())
                    .build());
        }
    }

    @Operation(summary = "Lọc xe theo chi nhánh", description = "Lấy danh sách xe theo chi nhánh")
    @GetMapping("/branch/{branchId}")
    public ResponseEntity<?> getVehiclesByBranch(@PathVariable Integer branchId) {
        try {
            List<VehicleResponse> vehicles = vehicleService.getVehiclesByBranch(branchId);
            return ResponseEntity.ok(vehicles);
        } catch (Exception ex) {
            log.error("[Vehicle] Error get vehicles for branch {}: {}", branchId, ex.getMessage());
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
