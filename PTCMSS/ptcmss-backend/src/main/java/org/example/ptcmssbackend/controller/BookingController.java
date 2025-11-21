package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Booking.CreateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.CreateDepositRequest;
import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.request.Booking.AssignRequest;
import org.example.ptcmssbackend.dto.request.Booking.CheckAvailabilityRequest;
import org.example.ptcmssbackend.dto.request.Booking.UpdateBookingRequest;
import org.example.ptcmssbackend.dto.response.Booking.BookingListResponse;
import org.example.ptcmssbackend.dto.response.Booking.BookingResponse;
import org.example.ptcmssbackend.dto.response.Booking.ConsultantDashboardResponse;
import org.example.ptcmssbackend.dto.response.Booking.PaymentResponse;
import org.example.ptcmssbackend.dto.response.Booking.QRCodeResponse;
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
     * Cập nhật booking
     */
    @Operation(summary = "Cập nhật đơn hàng", description = "Cập nhật thông tin đơn hàng. Chỉ cho phép khi status là PENDING hoặc CONFIRMED.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<BookingResponse>> update(
            @Parameter(description = "ID đơn hàng") @PathVariable Integer id,
            @Valid @RequestBody UpdateBookingRequest request
    ) {
        try {
            BookingResponse response = bookingService.update(id, request);
            return ResponseEntity.ok(ApiResponse.<BookingResponse>builder()
                    .success(true)
                    .message("Cập nhật đơn hàng thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Update booking failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<BookingResponse>builder()
                    .success(false)
                    .message("Lỗi khi cập nhật đơn hàng: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Lấy danh sách bookings với filter và pagination
     */
    @Operation(summary = "Lấy danh sách đơn hàng", description = "Lấy danh sách đơn hàng với filter (status, branch, consultant, date, keyword) và pagination")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<?>> getAll(
            @Parameter(description = "Lọc theo trạng thái (PENDING, QUOTATION_SENT, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED)") @RequestParam(required = false) String status,
            @Parameter(description = "Lọc theo ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Lọc theo ID tư vấn viên") @RequestParam(required = false) Integer consultantId,
            @Parameter(description = "Ngày bắt đầu (ISO format)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @Parameter(description = "Ngày kết thúc (ISO format)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @Parameter(description = "Tìm kiếm theo mã đơn, SĐT, tên KH") @RequestParam(required = false) String keyword,
            @Parameter(description = "Số trang (bắt đầu từ 1, mặc định 0 = không pagination)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang (mặc định 20)") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sắp xếp (format: field:asc hoặc field:desc)") @RequestParam(required = false) String sortBy
    ) {
        try {
            // Nếu có pagination params, sử dụng pagination
            if (page > 0 || size != 20 || sortBy != null) {
                PageResponse<?> pageResponse = bookingService.getAll(
                        status, branchId, consultantId, startDate, endDate, keyword, page, size, sortBy
                );
                return ResponseEntity.ok(ApiResponse.builder()
                        .success(true)
                        .message("Lấy danh sách đơn hàng thành công")
                        .data(pageResponse)
                        .build());
            } else {
                // Không pagination, trả về list đơn giản
                List<BookingListResponse> list = bookingService.getBookingList(status, branchId, consultantId);
                return ResponseEntity.ok(ApiResponse.builder()
                        .success(true)
                        .message("Lấy danh sách đơn hàng thành công")
                        .data(list)
                        .build());
            }
        } catch (Exception e) {
            log.error("Get bookings failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.builder()
                    .success(false)
                    .message("Lỗi khi lấy danh sách đơn hàng: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Lấy chi tiết booking
     */
    @Operation(summary = "Lấy chi tiết đơn hàng", description = "Lấy thông tin chi tiết của một đơn hàng (bao gồm trips, vehicles, payments)")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<BookingResponse>> getById(
            @Parameter(description = "ID đơn hàng") @PathVariable Integer id
    ) {
        try {
            BookingResponse response = bookingService.getById(id);
            return ResponseEntity.ok(ApiResponse.<BookingResponse>builder()
                    .success(true)
                    .message("Lấy chi tiết đơn hàng thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Get booking by id failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<BookingResponse>builder()
                    .success(false)
                    .message("Lỗi khi lấy chi tiết đơn hàng: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Xóa booking (soft delete - chuyển status sang CANCELLED)
     */
    @Operation(summary = "Hủy đơn hàng", description = "Hủy đơn hàng (chuyển status sang CANCELLED)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @Parameter(description = "ID đơn hàng") @PathVariable Integer id
    ) {
        try {
            bookingService.delete(id);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Hủy đơn hàng thành công")
                    .build());
        } catch (Exception e) {
            log.error("Delete booking failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<Void>builder()
                    .success(false)
                    .message("Lỗi khi hủy đơn hàng: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Ghi nhận thanh toán/đặt cọc cho booking
     */
    @Operation(summary = "Ghi nhận thanh toán", description = "Tạo thu (INCOME) đã thanh toán cho đơn hàng. Trả về booking đã cập nhật totals.")
    @PostMapping("/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<BookingResponse>> addPayment(
            @Parameter(description = "ID đơn hàng") @PathVariable Integer id,
            @Valid @RequestBody CreatePaymentRequest request
    ) {
        try {
            Integer consultantEmployeeId = getCurrentConsultantEmployeeId();
            BookingResponse response = bookingService.addPayment(id, request, consultantEmployeeId);
            return ResponseEntity.ok(ApiResponse.<BookingResponse>builder()
                    .success(true)
                    .message("Ghi nhận thanh toán thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Add payment failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<BookingResponse>builder()
                    .success(false)
                    .message("Lỗi khi ghi nhận thanh toán: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/{id}/payments/qr")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<org.example.ptcmssbackend.dto.response.Booking.PaymentResponse>> createQrPayment(
            @Parameter(description = "ID đơn hàng") @PathVariable Integer id,
            @Valid @RequestBody CreatePaymentRequest request
    ) {
        try {
            Integer consultantEmployeeId = getCurrentConsultantEmployeeId();
            var response = paymentService.generateQRCode(id, request.getAmount(), request.getNote(), request.getDeposit(), consultantEmployeeId);
            return ResponseEntity.ok(ApiResponse.<org.example.ptcmssbackend.dto.response.Booking.PaymentResponse>builder()
                    .success(true)
                    .message("Đã tạo yêu cầu thanh toán QR")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Create QR payment failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<org.example.ptcmssbackend.dto.response.Booking.PaymentResponse>builder()
                    .success(false)
                    .message("Lỗi khi tạo QR thanh toán: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/{id}/payments/deposit")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PaymentResponse>> createDeposit(
            @PathVariable Integer id,
            @Valid @RequestBody CreatePaymentRequest request
    ) {
        try {
            Integer consultantEmployeeId = getCurrentConsultantEmployeeId();
            PaymentResponse response = paymentService.createDeposit(id, request, consultantEmployeeId);
            return ResponseEntity.ok(ApiResponse.<PaymentResponse>builder()
                    .success(true)
                    .message("Đã ghi nhận thanh toán")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Create deposit failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<PaymentResponse>builder()
                    .success(false)
                    .message("Lỗi khi ghi nhận thanh toán: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<java.util.List<PaymentResponse>>> listPayments(
            @PathVariable Integer id
    ) {
        try {
            var payments = paymentService.getPaymentHistory(id);
            return ResponseEntity.ok(ApiResponse.<java.util.List<PaymentResponse>>builder()
                    .success(true)
                    .message("OK")
                    .data(payments)
                    .build());
        } catch (Exception e) {
            log.error("Get payment history failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<java.util.List<PaymentResponse>>builder()
                    .success(false)
                    .message("Lỗi khi lấy lịch sử thanh toán: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Check availability vehicles by branch/category/time
     */
    @Operation(summary = "Kiểm tra khả dụng xe", description = "Kiểm tra số lượng xe khả dụng theo chi nhánh, loại xe và khoảng thời gian")
    @PostMapping("/check-availability")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<org.example.ptcmssbackend.dto.response.Booking.CheckAvailabilityResponse>> checkAvailability(
            @Valid @RequestBody CheckAvailabilityRequest request
    ) {
        try {
            var result = bookingService.checkAvailability(request);
            return ResponseEntity.ok(ApiResponse.<org.example.ptcmssbackend.dto.response.Booking.CheckAvailabilityResponse>builder()
                    .success(true)
                    .message("OK")
                    .data(result)
                    .build());
        } catch (Exception e) {
            log.error("Check availability failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<org.example.ptcmssbackend.dto.response.Booking.CheckAvailabilityResponse>builder()
                    .success(false)
                    .message("Lỗi khi kiểm tra khả dụng: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Gán tài xế / xe cho các chuyến của booking
     */
    @Operation(summary = "Gán tài xế/xe", description = "Gán tài xế và/hoặc xe cho các trip của booking. Nếu không truyền tripIds thì áp dụng cho tất cả trips của booking")
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT')")
    public ResponseEntity<ApiResponse<BookingResponse>> assign(
            @Parameter(description = "ID đơn hàng") @PathVariable Integer id,
            @Valid @RequestBody AssignRequest request
    ) {
        try {
            BookingResponse response = bookingService.assign(id, request);
            return ResponseEntity.ok(ApiResponse.<BookingResponse>builder()
                    .success(true)
                    .message("Gán tài xế/xe thành công")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Assign driver/vehicle failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.<BookingResponse>builder()
                    .success(false)
                    .message("Lỗi khi gán tài xế/xe: " + e.getMessage())
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
