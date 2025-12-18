package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Driver.CreateDriverRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverDayOffRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest;
import org.example.ptcmssbackend.dto.response.Driver.DriverDashboardResponse;
import org.example.ptcmssbackend.dto.response.Driver.DriverDayOffResponse;
import org.example.ptcmssbackend.dto.response.Driver.DriverProfileResponse;
import org.example.ptcmssbackend.dto.response.Driver.DriverResponse;
import org.example.ptcmssbackend.dto.response.Driver.DriverScheduleResponse;
import org.example.ptcmssbackend.dto.response.Driver.TripIncidentResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.dto.response.common.ResponseError;
import org.example.ptcmssbackend.service.DispatchService;
import org.example.ptcmssbackend.service.DriverService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/drivers")
@Tag(name = "Driver Management", description = "Các API dành cho tài xế: dashboard, lịch trình, hồ sơ, báo cáo sự cố, nghỉ phép")
public class DriverController {

    private final DriverService driverService;
    private final DispatchService dispatchService;


    // ======================================================
    //  1️ Dashboard tài xế
    // ======================================================
    @Operation(summary = "Dashboard tài xế", description = "Hiển thị chuyến đi hiện tại và lịch trình sắp tới của tài xế.")
    @GetMapping("/{driverId}/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER','COORDINATOR')")
    public ResponseEntity<ResponseData<DriverDashboardResponse>> getDriverDashboard(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId) {
        try{
            DriverDashboardResponse dashboard = driverService.getDashboard(driverId);
            return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(),
                    "Get driver dashboard successfully",
                    dashboard));
        } catch (RuntimeException e) {
            log.error("Get driver dashboard failed for driverId {}: {}", driverId, e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ResponseData<>(HttpStatus.NOT_FOUND.value(),
                                e.getMessage(),
                                null));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ResponseData<>(HttpStatus.BAD_REQUEST.value(),
                            e.getMessage() != null ? e.getMessage() : "Lỗi khi lấy dashboard tài xế",
                            null));
        } catch (Exception e) {
            log.error("Get driver dashboard failed for driverId {}: {}", driverId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseData<>(HttpStatus.INTERNAL_SERVER_ERROR.value(),
                            "Lỗi hệ thống khi lấy dashboard tài xế",
                            null));
        }
    }

    // ======================================================
    //  2️  Lịch làm việc cá nhân
    // ======================================================
    @Operation(summary = "Lịch làm việc tài xế", description = "Lấy danh sách chuyến đi trong ngày hoặc trong tuần của tài xế. Có thể filter theo startDate và endDate.")
    @GetMapping("/{driverId}/schedule")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER','COORDINATOR')")
    public ResponseData<List<DriverScheduleResponse>> getDriverSchedule(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId,
            @Parameter(description = "Ngày bắt đầu (ISO format: yyyy-MM-ddTHH:mm:ssZ)") @RequestParam(required = false) String startDate,
            @Parameter(description = "Ngày kết thúc (ISO format: yyyy-MM-ddTHH:mm:ssZ)") @RequestParam(required = false) String endDate) {
        try{
            log.info("Get driver schedule for driver {} from {} to {}", driverId, startDate, endDate);
            java.time.Instant start = startDate != null ? java.time.Instant.parse(startDate) : null;
            java.time.Instant end = endDate != null ? java.time.Instant.parse(endDate) : null;
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get driver schedule successfully",
                    driverService.getSchedule(driverId, start, end));
        } catch (Exception e) {
            log.error("Get driver schedule failed", e);
            throw new RuntimeException(e);
        }
    }

    // ======================================================
    //  3️ Hồ sơ cá nhân tài xế
    // ======================================================
    @Operation(summary = "Xem hồ sơ tài xế", description = "Hiển thị thông tin chi tiết cá nhân và nghiệp vụ của tài xế.")
    @GetMapping("/{driverId}/profile")
    @PreAuthorize("hasAnyRole('DRIVER', 'MANAGER', 'ADMIN', 'COORDINATOR')")
    public ResponseData<DriverProfileResponse> getDriverProfile(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId) {
        try{
            log.info("Get driver profile successfully");
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get driver profile successfully",
                    driverService.getProfile(driverId));
        } catch (Exception e) {
            log.error("Get driver profile failed", e);
            throw new RuntimeException(e);
        }
    }

    // Endpoint tra cứu theo userId để FE dễ gọi khi chỉ có userId trong phiên
    @Operation(summary = "Xem hồ sơ theo userId", description = "Dùng khi FE chỉ có userId trong session")
    @GetMapping("/by-user/{userId}/profile")
    @PreAuthorize("hasAnyRole('DRIVER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ResponseData<DriverProfileResponse>> getDriverProfileByUser(
            @Parameter(description = "ID user") @PathVariable Integer userId) {
        try {
            log.info("Get driver profile by userId: {}", userId);
            DriverProfileResponse profile = driverService.getProfileByUserId(userId);
            return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(),
                    "Get driver profile by userId successfully",
                    profile));
        } catch (RuntimeException e) {
            log.error("Get driver profile by userId failed for userId {}: {}", userId, e.getMessage());
            // Trả về 404 nếu không tìm thấy driver
            if (e.getMessage() != null && e.getMessage().contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ResponseData<>(HttpStatus.NOT_FOUND.value(),
                                e.getMessage(),
                                null));
            }
            // Trả về 400 cho các lỗi khác
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ResponseData<>(HttpStatus.BAD_REQUEST.value(),
                            e.getMessage() != null ? e.getMessage() : "Lỗi khi lấy thông tin tài xế",
                            null));
        } catch (Exception e) {
            log.error("Get driver profile by userId failed for userId {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseData<>(HttpStatus.INTERNAL_SERVER_ERROR.value(),
                            "Lỗi hệ thống khi lấy thông tin tài xế",
                            null));
        }
    }

    @Operation(summary = "Cập nhật hồ sơ tài xế", description = "Tài xế có thể chỉnh sửa số điện thoại, địa chỉ hoặc ghi chú.")
    @PutMapping("/{driverId}/profile")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER','COORDINATOR')")
    public ResponseData<DriverProfileResponse> updateDriverProfile(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId,
            @RequestBody DriverProfileUpdateRequest request) {
        try{
            log.info("Update driver profile successfully");
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Update driver profile successfully",
                    driverService.updateProfile(driverId, request));
        } catch (Exception e) {
            log.error("Update driver profile failed", e);
            throw new RuntimeException(e);
        }
    }

    // ======================================================
    //  4️ Nghỉ phép tài xế
    // ======================================================
    @Operation(summary = "Gửi yêu cầu nghỉ phép", description = "Tài xế gửi yêu cầu nghỉ trong khoảng ngày, đợi duyệt từ quản lý chi nhánh.")
    @PostMapping("/{driverId}/dayoff")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseData<DriverDayOffResponse> requestDayOff(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId,
            @RequestBody DriverDayOffRequest request) {
        try{
            log.info("Request day off successfully");
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Request day off successfully",
                    driverService.requestDayOff(driverId, request));
        } catch (Exception e) {
            log.error("Request day off failed", e);
            throw new RuntimeException(e);
        }
    }

    @Operation(summary = "Lịch sử nghỉ phép", description = "Lấy danh sách các yêu cầu nghỉ phép của tài xế (đã gửi, đã duyệt, bị từ chối).")
    @GetMapping("/{driverId}/dayoff")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER','COORDINATOR')")
    public ResponseData<List<DriverDayOffResponse>> getDayOffHistory(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId) {
        try {
            log.info("Get day off history for driver {}", driverId);
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get day off history successfully",
                    driverService.getDayOffHistory(driverId));
        } catch (Exception e) {
            log.error("Get day off history failed", e);
            throw new RuntimeException(e);
        }
    }

    @Operation(summary = "Hủy yêu cầu nghỉ phép", description = "Tài xế hủy yêu cầu nghỉ phép đã gửi (PENDING hoặc APPROVED). Trạng thái tài xế sẽ chuyển về ACTIVE.")
    @DeleteMapping("/{driverId}/dayoff/{dayOffId}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseData<?> cancelDayOffRequest(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId,
            @Parameter(description = "ID yêu cầu nghỉ phép") @PathVariable Integer dayOffId) {
        try {
            log.info("Driver {} cancelling day off request {}", driverId, dayOffId);
            driverService.cancelDayOffRequest(dayOffId, driverId);
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Đã hủy yêu cầu nghỉ phép thành công. Trạng thái của bạn đã chuyển về sẵn sàng.",
                    null);
        } catch (Exception e) {
            log.error("Cancel day off request failed", e);
            return new ResponseData<>(HttpStatus.BAD_REQUEST.value(),
                    e.getMessage(),
                    null);
        }
    }

    // ======================================================
    //  5 Bắt đầu và hoàn thành chuyến đi
    // ======================================================
    @Operation(summary = "Bắt đầu chuyến đi", description = "Tài xế xác nhận bắt đầu một chuyến đã được gán.")
    @PostMapping("/{driverId}/trips/{tripId}/start")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseData<?> startTrip(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId,
            @Parameter(description = "ID chuyến đi") @PathVariable Integer tripId) {
        try{
            log.info("Start trip successfully");
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Start trip successfully", driverService.startTrip(tripId, driverId));
        } catch (Exception e) {
            log.error("Start trip failed", e);
            throw new RuntimeException(e);
        }
    }

    @Operation(summary = "Hoàn thành chuyến đi", description = "Tài xế xác nhận hoàn tất chuyến đi.")
    @PostMapping("/{driverId}/trips/{tripId}/complete")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseData<?> completeTrip(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId,
            @Parameter(description = "ID chuyến đi") @PathVariable Integer tripId) {
        try {
            log.info("[DriverController] Completing trip {} for driver {}", tripId, driverId);
            Integer result = driverService.completeTrip(tripId, driverId);
            log.info("[DriverController] Complete trip successfully: {}", result);
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Complete trip successfully", result);
        } catch (Exception e) {
            log.error("[DriverController] Complete trip failed - tripId: {}, driverId: {}, error: {}",
                    tripId, driverId, e.getMessage(), e);
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Complete trip failed";
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), errorMessage);
        }
    }

    // ======================================================
    //  6️ Báo cáo sự cố
    // ======================================================
    @Operation(summary = "Báo cáo sự cố", description = "Tài xế báo cáo các sự cố trong chuyến đi như hỏng xe, kẹt đường, tai nạn, ...")
    @PostMapping("/report-incident")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseData<TripIncidentResponse> reportIncident(
            @RequestBody ReportIncidentRequest request) {
        try {
            log.info("Report incident successfully");
            return new ResponseData<>(HttpStatus.OK.value(), "Report incident successfully", driverService.reportIncident(request));
        } catch (Exception e) {
            log.error("Report incident failed", e);
            throw new RuntimeException("Report incident failed: " + e.getMessage(), e);
        }
    }


    // ======================================================
    //  7 Tạo mới tài xế
    // ======================================================
    @Operation(summary = "Tạo tài xế mới", description = "Admin hoặc Manager tạo mới tài xế và gán vào chi nhánh.")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseData<DriverResponse> createDriver(@RequestBody CreateDriverRequest request) {
        try{
            log.info("Create driver: ", request);
            return new ResponseData<>(HttpStatus.OK.value(), "Tạo tài xế thành công", driverService.createDriver(request));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // =====================================================================
    // 3) DRIVER ACCEPT TRIP
    // =====================================================================
    @Operation(
            summary = "Driver xác nhận nhận chuyến",
            description = "Chỉ tài xế được phép thao tác này. Khi nhận chuyến: chuyển trạng thái từ SCHEDULED -> ONGOING."
    )
    @PreAuthorize("hasRole('DRIVER')")
    @PostMapping("/accept/{tripId}")
    public ResponseData<?> acceptTrip(@PathVariable Integer tripId) {
        try {
            log.info("[Dispatch] Driver accepts trip {}", tripId);
            dispatchService.driverAcceptTrip(tripId);
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Driver accepted trip successfully", null);
        } catch (Exception e) {
            log.error("[Dispatch] Driver failed to accept trip {}", tripId, e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    //4) lấy danh sách tai xế theo chi nhánh
    // =====================================================================
    @Operation(
            summary = "Danh sách driver theo chi nhánh",
            description = "Danh sách tài xế theo chi nhánh"
    )
    @GetMapping("/branch/{branchId}")
    public ResponseEntity<?> getDriversByBranch(@PathVariable Integer branchId) {
        try {
            List<DriverResponse> drivers = driverService.getDriversByBranchId(branchId);
            return ResponseEntity.ok(drivers);
        } catch (Exception e) {
            log.error("Error getting drivers of branch {}: {}", branchId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}

