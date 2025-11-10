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
        try{
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
         try{
             log.info("Get driver schedule successfully");
             return new ResponseData<>(HttpStatus.OK.value(),
                     "Get driver schedule successfully",
                     driverService.getSchedule(driverId));
         } catch (Exception e) {
             log.error("Get driver schedule failed", e);
             throw new RuntimeException(e);
         }
    }


}
