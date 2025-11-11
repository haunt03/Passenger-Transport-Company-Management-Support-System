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
import org.example.ptcmssbackend.dto.response.*;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.dto.response.common.ResponseError;
import org.example.ptcmssbackend.service.DriverService;
import org.springframework.http.HttpStatus;
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


    // ======================================================
    //  1️ Dashboard tài xế
    // ======================================================
    @Operation(summary = "Dashboard tài xế", description = "Hiển thị chuyến đi hiện tại và lịch trình sắp tới của tài xế.")
    @GetMapping("/{driverId}/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER')")
    public ResponseData<DriverDashboardResponse> getDriverDashboard(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId) {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get driver dashboard successfully",
                    driverService.getDashboard(driverId));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ======================================================
    //  2️  Lịch làm việc cá nhân
    // ======================================================
    @Operation(summary = "Lịch làm việc tài xế", description = "Lấy danh sách chuyến đi trong ngày hoặc trong tuần của tài xế.")
    @GetMapping("/{driverId}/schedule")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER')")
    public ResponseData<List<DriverScheduleResponse>> getDriverSchedule(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId) {
        try {
            log.info("Get driver schedule successfully");
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get driver schedule successfully",
                    driverService.getSchedule(driverId));
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
    @PreAuthorize("hasAnyRole('DRIVER', 'MANAGER', 'ADMIN')")
    public ResponseData<DriverProfileResponse> getDriverProfile(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId) {
        try {
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
    public ResponseData<DriverProfileResponse> getDriverProfileByUser(
            @Parameter(description = "ID user") @PathVariable Integer userId) {
        try {
            log.info("Get driver profile by userId successfully");
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get driver profile by userId successfully",
                    driverService.getProfileByUserId(userId));
        } catch (Exception e) {
            log.error("Get driver profile by userId failed", e);
            throw new RuntimeException(e);
        }
    }

    @Operation(summary = "Cập nhật hồ sơ tài xế", description = "Tài xế có thể chỉnh sửa số điện thoại, địa chỉ hoặc ghi chú.")
    @PutMapping("/{driverId}/profile")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER')")
    public ResponseData<DriverProfileResponse> updateDriverProfile(
            @Parameter(description = "ID tài xế") @PathVariable Integer driverId,
            @RequestBody DriverProfileUpdateRequest request) {
        try {
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
        try {
            log.info("Request day off successfully");
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Request day off successfully",
                    driverService.requestDayOff(driverId, request));
        } catch (Exception e) {
            log.error("Request day off failed", e);
            throw new RuntimeException(e);
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
        try {
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
            log.info("Complete trip successfully");
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Complete trip successfully", driverService.completeTrip(tripId, driverId));
        } catch (Exception e) {
            log.error("Complete trip failed", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), "Complete trip failed");
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
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), "Report incident failed");
        }
    }
}
