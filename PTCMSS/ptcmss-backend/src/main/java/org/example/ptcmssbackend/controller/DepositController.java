package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.service.DepositService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/deposits")
@RequiredArgsConstructor
@Tag(name = "Deposit Management", description = "APIs for managing deposits and payments for bookings")
public class DepositController {

    private final DepositService depositService;

    @Operation(summary = "Tạo cọc cho booking", description = "Tạo một khoản cọc/thanh toán cho booking. Tự động tạo receipt number nếu paymentMethod = CASH")
    @PostMapping("/bookings/{bookingId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT','DRIVER')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> createDeposit(
            @Parameter(description = "ID của booking", required = true) @PathVariable Integer bookingId,
            @Valid @RequestBody CreateInvoiceRequest request) {
        log.info("[DepositController] Creating deposit for booking: {}", bookingId);
        try {
            InvoiceResponse response = depositService.createDeposit(bookingId, request);
            return ResponseEntity.ok(ApiResponse.<InvoiceResponse>builder()
                    .success(true)
                    .message("Deposit created successfully")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[DepositController] Error creating deposit", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<InvoiceResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Danh sách cọc của booking", description = "Lấy tất cả các khoản cọc/thanh toán của một booking")
    @GetMapping("/bookings/{bookingId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT','COORDINATOR','DRIVER')")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getDepositsByBooking(
            @Parameter(description = "ID của booking", required = true) @PathVariable Integer bookingId) {
        log.info("[DepositController] Getting deposits for booking: {}", bookingId);
        try {
            List<InvoiceResponse> deposits = depositService.getDepositsByBooking(bookingId);
            return ResponseEntity.ok(ApiResponse.<List<InvoiceResponse>>builder()
                    .success(true)
                    .data(deposits)
                    .build());
        } catch (Exception e) {
            log.error("[DepositController] Error getting deposits", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<List<InvoiceResponse>>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Tổng cọc đã thu", description = "Tính tổng số tiền cọc đã thu của một booking")
    @GetMapping("/bookings/{bookingId}/total-paid")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT','COORDINATOR','DRIVER')")
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalDepositPaid(
            @Parameter(description = "ID của booking", required = true) @PathVariable Integer bookingId) {
        log.info("[DepositController] Getting total deposit paid for booking: {}", bookingId);
        try {
            BigDecimal total = depositService.getTotalDepositPaid(bookingId);
            return ResponseEntity.ok(ApiResponse.<BigDecimal>builder()
                    .success(true)
                    .data(total)
                    .build());
        } catch (Exception e) {
            log.error("[DepositController] Error getting total deposit paid", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BigDecimal>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Số tiền còn lại", description = "Tính số tiền còn lại cần thu của một booking (totalCost - totalPaid)")
    @GetMapping("/bookings/{bookingId}/remaining")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT','COORDINATOR','DRIVER')")
    public ResponseEntity<ApiResponse<BigDecimal>> getRemainingAmount(
            @Parameter(description = "ID của booking", required = true) @PathVariable Integer bookingId) {
        log.info("[DepositController] Getting remaining amount for booking: {}", bookingId);
        try {
            BigDecimal remaining = depositService.getRemainingAmount(bookingId);
            return ResponseEntity.ok(ApiResponse.<BigDecimal>builder()
                    .success(true)
                    .data(remaining)
                    .build());
        } catch (Exception e) {
            log.error("[DepositController] Error getting remaining amount", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BigDecimal>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Hủy cọc", description = "Hủy một khoản cọc với lý do")
    @PostMapping("/{depositId}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> cancelDeposit(
            @Parameter(description = "ID của deposit", required = true) @PathVariable Integer depositId,
            @Parameter(description = "Lý do hủy", required = true) @RequestParam String reason) {
        log.info("[DepositController] Cancelling deposit: {}", depositId);
        try {
            depositService.cancelDeposit(depositId, reason);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Deposit cancelled successfully")
                    .build());
        } catch (Exception e) {
            log.error("[DepositController] Error cancelling deposit", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Tạo số phiếu thu", description = "Tạo số phiếu thu tự động theo format: REC-{YYYYMMDD}-{SEQ}")
    @GetMapping("/generate-receipt-number")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT','COORDINATOR','DRIVER')")
    public ResponseEntity<ApiResponse<String>> generateReceiptNumber(
            @Parameter(description = "ID chi nhánh", required = true) @RequestParam Integer branchId) {
        log.info("[DepositController] Generating receipt number for branch: {}", branchId);
        try {
            String receiptNumber = depositService.generateReceiptNumber(branchId);
            return ResponseEntity.ok(ApiResponse.<String>builder()
                    .success(true)
                    .data(receiptNumber)
                    .build());
        } catch (Exception e) {
            log.error("[DepositController] Error generating receipt number", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }
}

