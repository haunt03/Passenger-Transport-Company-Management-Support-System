package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Booking.CreateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.request.Booking.AssignRequest;
import org.example.ptcmssbackend.dto.request.Booking.CheckAvailabilityRequest;
import org.example.ptcmssbackend.dto.request.Booking.UpdateBookingRequest;
import org.example.ptcmssbackend.dto.response.Booking.BookingListResponse;
import org.example.ptcmssbackend.dto.response.Booking.BookingResponse;
import org.example.ptcmssbackend.dto.response.Booking.ConsultantDashboardResponse;
import org.example.ptcmssbackend.dto.response.Booking.PaymentResponse;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.service.BookingService;
import org.example.ptcmssbackend.service.PaymentService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Booking Management", description = "APIs for managing bookings and quotations")
public class BookingController {

    private final BookingService bookingService;
    private final PaymentService paymentService;
    private final EmployeeRepository employeeRepository;

    /**
     * Lấy dashboard cho consultant
     */
    @Operation(summary = "Consultant Dashboard", description = "Lấy dữ liệu dashboard cho tư vấn viên")
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<ConsultantDashboardResponse>> getDashboard(
            @Parameter(description = "ID chi nhánh (optional, Admin có thể chọn)") @RequestParam(required = false) Integer branchId
    ) {
        try {
            Integer consultantEmployeeId = getCurrentConsultantEmployeeId();
            ConsultantDashboardResponse dashboard = bookingService.getConsultantDashboard(consultantEmployeeId, branchId);
            return ResponseEntity.ok(ApiResponse.<ConsultantDashboardResponse>builder()
                    .success(true)
                    .message("Lấy dashboard thành công")
                    .data(dashboard)
                    .build());
        } catch (Exception e) {
            log.error("Get dashboard failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<ConsultantDashboardResponse>builder()
                    .success(false)
                    .message("Lỗi khi lấy dashboard: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Tạo booking mới
     */
    @Operation(summary = "Tạo đơn hàng mới", description = "Tạo đơn hàng/báo giá mới. Tự động tạo customer nếu chưa có (tìm theo phone).")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<BookingResponse>> create(
            @Valid @RequestBody CreateBookingRequest request
    ) {
        try {
            Integer consultantEmployeeId = getCurrentConsultantEmployeeId();
            BookingResponse response = bookingService.create(request, consultantEmployeeId);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<BookingResponse>builder()
                    .success(true)
                    .message("Tạo đơn hàng thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Create booking failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<BookingResponse>builder()
                    .success(false)
                    .message("Lỗi khi tạo đơn hàng: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Tính giá tự động
     */
    @Operation(summary = "Tính giá tự động", description = "Tính giá ước tính dựa trên loại xe, số lượng, khoảng cách và cao tốc")
    @PostMapping("/calculate-price")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<java.math.BigDecimal>> calculatePrice(
            @Parameter(description = "Danh sách ID loại xe") @RequestParam List<Integer> vehicleCategoryIds,
            @Parameter(description = "Danh sách số lượng tương ứng") @RequestParam List<Integer> quantities,
            @Parameter(description = "Khoảng cách (km)") @RequestParam Double distance,
            @Parameter(description = "Có đi cao tốc không") @RequestParam(required = false, defaultValue = "false") Boolean useHighway
    ) {
        try {
            java.math.BigDecimal price = bookingService.calculatePrice(
                    vehicleCategoryIds, quantities, distance, useHighway
            );
            return ResponseEntity.ok(ApiResponse.<java.math.BigDecimal>builder()
                    .success(true)
                    .message("Tính giá thành công")
                    .data(price)
                    .build());
        } catch (Exception e) {
            log.error("Calculate price failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<java.math.BigDecimal>builder()
                    .success(false)
                    .message("Lỗi khi tính giá: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Helper method: Lấy employeeId của consultant hiện tại
     */
    private Integer getCurrentConsultantEmployeeId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Users) {
            Users user = (Users) authentication.getPrincipal();
            Employees employee = employeeRepository.findByUserId(user.getId()).orElse(null);
            return employee != null ? employee.getEmployeeId() : null;
        }
        return null;
    }
}
