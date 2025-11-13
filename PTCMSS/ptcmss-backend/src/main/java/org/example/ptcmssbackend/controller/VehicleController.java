package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
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
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
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
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
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


}
