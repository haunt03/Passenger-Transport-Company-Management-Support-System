package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Debt.SendDebtReminderRequest;
import org.example.ptcmssbackend.dto.request.Debt.UpdateDebtInfoRequest;
import org.example.ptcmssbackend.dto.response.Debt.AgingBucketResponse;
import org.example.ptcmssbackend.dto.response.Debt.DebtReminderHistoryResponse;
import org.example.ptcmssbackend.dto.response.Debt.DebtSummaryResponse;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.service.DebtService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/debts")
@RequiredArgsConstructor
@Tag(name = "Debt Management", description = "APIs for managing debts, aging analysis, and debt reminders")
public class DebtController {

    private final DebtService debtService;

    @Operation(summary = "Danh sách công nợ", description = "Lấy danh sách công nợ với filters. Sắp xếp: OVERDUE trước, sau đó due date tăng dần")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<DebtSummaryResponse>>> getDebts(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Chỉ lấy nợ quá hạn") @RequestParam(required = false) Boolean overdueOnly,
            @Parameter(description = "Số trang") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng mỗi trang") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Trường sắp xếp") @RequestParam(defaultValue = "dueDate") String sortBy,
            @Parameter(description = "Hướng sắp xếp") @RequestParam(defaultValue = "ASC") String sortDir) {

        log.info("[DebtController] Getting debts - branch: {}, overdueOnly: {}", branchId, overdueOnly);

        try {
            Sort sort = sortDir.equalsIgnoreCase("ASC")
                    ? Sort.by(sortBy).ascending()
                    : Sort.by(sortBy).descending();
            Pageable pageable = PageRequest.of(page, size, sort);

            Page<DebtSummaryResponse> response = debtService.getDebts(branchId, overdueOnly, pageable);
            return ResponseEntity.ok(ApiResponse.<Page<DebtSummaryResponse>>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[DebtController] Error getting debts", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Page<DebtSummaryResponse>>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Phân tích aging buckets", description = "Phân loại nợ theo thời gian: 0-30, 31-60, 61-90, >90 ngày")
    @GetMapping("/aging")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<AgingBucketResponse>> getAgingBuckets(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Ngày tính toán (mặc định: hôm nay)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {

        log.info("[DebtController] Getting aging buckets - branch: {}, asOfDate: {}", branchId, asOfDate);

        try {
            AgingBucketResponse response = debtService.getAgingBuckets(branchId, asOfDate);
            return ResponseEntity.ok(ApiResponse.<AgingBucketResponse>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[DebtController] Error getting aging buckets", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<AgingBucketResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Gửi nhắc nợ", description = "Gửi nhắc nợ qua Email/SMS/Phone cho khách hàng")
    @PostMapping("/{invoiceId}/reminder")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> sendReminder(
            @Parameter(description = "ID của invoice", required = true) @PathVariable Integer invoiceId,
            @Valid @RequestBody SendDebtReminderRequest request) {

        log.info("[DebtController] Sending reminder for invoice: {}", invoiceId);

        try {
            debtService.sendDebtReminder(invoiceId, request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Reminder sent successfully")
                    .build());
        } catch (Exception e) {
            log.error("[DebtController] Error sending reminder", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Lịch sử nhắc nợ", description = "Lấy danh sách tất cả các lần nhắc nợ đã gửi cho một invoice")
    @GetMapping("/{invoiceId}/reminders")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<DebtReminderHistoryResponse>>> getReminderHistory(
            @Parameter(description = "ID của invoice", required = true) @PathVariable Integer invoiceId) {

        log.info("[DebtController] Getting reminder history for invoice: {}", invoiceId);

        try {
            List<DebtReminderHistoryResponse> response = debtService.getReminderHistory(invoiceId);
            return ResponseEntity.ok(ApiResponse.<List<DebtReminderHistoryResponse>>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[DebtController] Error getting reminder history", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<List<DebtReminderHistoryResponse>>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Cập nhật thông tin nợ", description = "Cập nhật promise-to-pay date, debt label, hoặc contact note")
    @PutMapping("/{invoiceId}/info")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> updateDebtInfo(
            @Parameter(description = "ID của invoice", required = true) @PathVariable Integer invoiceId,
            @Valid @RequestBody UpdateDebtInfoRequest request) {

        log.info("[DebtController] Updating debt info for invoice: {}", invoiceId);

        try {
            debtService.updateDebtInfo(invoiceId, request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Debt info updated successfully")
                    .build());
        } catch (Exception e) {
            log.error("[DebtController] Error updating debt info", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Đặt hẹn thanh toán", description = "Ghi nhận hẹn thanh toán từ khách hàng")
    @PutMapping("/{invoiceId}/promise-to-pay")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> setPromiseToPay(
            @Parameter(description = "ID của invoice", required = true) @PathVariable Integer invoiceId,
            @Parameter(description = "Ngày hẹn thanh toán", required = true) @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate promiseDate) {

        log.info("[DebtController] Setting promise to pay for invoice: {}, date: {}", invoiceId, promiseDate);

        try {
            debtService.setPromiseToPay(invoiceId, promiseDate);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Promise to pay date set successfully")
                    .build());
        } catch (Exception e) {
            log.error("[DebtController] Error setting promise to pay", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Đặt nhãn nợ", description = "Đặt nhãn cho nợ: VIP, TRANH_CHAP, NORMAL")
    @PutMapping("/{invoiceId}/label")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> setDebtLabel(
            @Parameter(description = "ID của invoice", required = true) @PathVariable Integer invoiceId,
            @Parameter(description = "Nhãn nợ: VIP, TRANH_CHAP, NORMAL", required = true) @RequestParam String label) {

        log.info("[DebtController] Setting debt label for invoice: {}, label: {}", invoiceId, label);

        try {
            debtService.setDebtLabel(invoiceId, label);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Debt label set successfully")
                    .build());
        } catch (Exception e) {
            log.error("[DebtController] Error setting debt label", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }
}

