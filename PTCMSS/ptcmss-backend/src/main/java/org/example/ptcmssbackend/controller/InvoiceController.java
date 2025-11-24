package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.RecordPaymentRequest;
import org.example.ptcmssbackend.dto.request.Invoice.SendInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.VoidInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.dto.response.Invoice.PaymentHistoryResponse;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.service.InvoiceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
@Tag(name = "Invoice Management", description = "APIs for managing invoices, payments, and invoice operations")
public class InvoiceController {

    private final InvoiceService invoiceService;

    @Operation(summary = "Tạo hóa đơn mới", description = "Tạo hóa đơn (Income hoặc Expense) với đầy đủ thông tin")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> createInvoice(
            @Valid @RequestBody CreateInvoiceRequest request) {
        log.info("[InvoiceController] Creating invoice for branch: {}", request.getBranchId());
        try {
            InvoiceResponse response = invoiceService.createInvoice(request);
            return ResponseEntity.ok(ApiResponse.<InvoiceResponse>builder()
                    .success(true)
                    .message("Invoice created successfully")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error creating invoice", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<InvoiceResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Lấy chi tiết hóa đơn", description = "Lấy thông tin chi tiết của một hóa đơn theo ID")
    @GetMapping("/{invoiceId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoice(
            @Parameter(description = "ID của hóa đơn") @PathVariable Integer invoiceId) {
        log.info("[InvoiceController] Getting invoice: {}", invoiceId);
        try {
            InvoiceResponse response = invoiceService.getInvoiceById(invoiceId);
            return ResponseEntity.ok(ApiResponse.<InvoiceResponse>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error getting invoice", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<InvoiceResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Danh sách hóa đơn", description = "Lấy danh sách hóa đơn với các bộ lọc: branch, type, status, paymentStatus, date range, customer")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
    public ResponseEntity<ApiResponse<Page<InvoiceListResponse>>> getInvoices(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Loại hóa đơn: INCOME, EXPENSE") @RequestParam(required = false) String type,
            @Parameter(description = "Trạng thái: ACTIVE, CANCELLED") @RequestParam(required = false) String status,
            @Parameter(description = "Trạng thái thanh toán: UNPAID, PAID, OVERDUE, REFUNDED") @RequestParam(required = false) String paymentStatus,
            @Parameter(description = "Ngày bắt đầu (YYYY-MM-DD)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc (YYYY-MM-DD)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "ID khách hàng") @RequestParam(required = false) Integer customerId,
            @Parameter(description = "Số trang (bắt đầu từ 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng mỗi trang") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Trường sắp xếp") @RequestParam(defaultValue = "invoiceDate") String sortBy,
            @Parameter(description = "Hướng sắp xếp: ASC, DESC") @RequestParam(defaultValue = "DESC") String sortDir) {

        log.info("[InvoiceController] Getting invoices - branch: {}, type: {}, status: {}",
                branchId, type, status);

        try {
            Sort sort = sortDir.equalsIgnoreCase("ASC")
                    ? Sort.by(sortBy).ascending()
                    : Sort.by(sortBy).descending();
            Pageable pageable = PageRequest.of(page, size, sort);

            Page<InvoiceListResponse> response = invoiceService.getInvoices(
                    branchId, type, status, paymentStatus,
                    startDate, endDate, customerId, pageable);

            return ResponseEntity.ok(ApiResponse.<Page<InvoiceListResponse>>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error getting invoices", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Page<InvoiceListResponse>>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Cập nhật hóa đơn", description = "Cập nhật thông tin hóa đơn (không thể cập nhật hóa đơn đã thanh toán)")
    @PutMapping("/{invoiceId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> updateInvoice(
            @Parameter(description = "ID của hóa đơn") @PathVariable Integer invoiceId,
            @Valid @RequestBody CreateInvoiceRequest request) {
        log.info("[InvoiceController] Updating invoice: {}", invoiceId);
        try {
            InvoiceResponse response = invoiceService.updateInvoice(invoiceId, request);
            return ResponseEntity.ok(ApiResponse.<InvoiceResponse>builder()
                    .success(true)
                    .message("Invoice updated successfully")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error updating invoice", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<InvoiceResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Hủy hóa đơn", description = "Hủy hóa đơn với lý do (cần cung cấp cancellationReason)")
    @PostMapping("/{invoiceId}/void")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> voidInvoice(
            @Parameter(description = "ID của hóa đơn") @PathVariable Integer invoiceId,
            @Valid @RequestBody VoidInvoiceRequest request) {
        log.info("[InvoiceController] Voiding invoice: {}", invoiceId);
        try {
            invoiceService.voidInvoice(invoiceId, request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Invoice voided successfully")
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error voiding invoice", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Gửi hóa đơn qua email", description = "Gửi hóa đơn đến email khách hàng")
    @PostMapping("/{invoiceId}/send")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> sendInvoice(
            @Parameter(description = "ID của hóa đơn") @PathVariable Integer invoiceId,
            @Valid @RequestBody SendInvoiceRequest request) {
        log.info("[InvoiceController] Sending invoice: {} to {}", invoiceId, request.getEmail());
        try {
            invoiceService.sendInvoice(invoiceId, request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Invoice sent successfully")
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error sending invoice", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Ghi nhận thanh toán", description = "Ghi nhận một khoản thanh toán cho hóa đơn (có thể thanh toán nhiều lần)")
    @PostMapping("/{invoiceId}/payments")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PaymentHistoryResponse>> recordPayment(
            @Parameter(description = "ID của hóa đơn") @PathVariable Integer invoiceId,
            @Valid @RequestBody RecordPaymentRequest request) {
        log.info("[InvoiceController] Recording payment for invoice: {}, amount: {}",
                invoiceId, request.getAmount());
        try {
            PaymentHistoryResponse response = invoiceService.recordPayment(invoiceId, request);
            return ResponseEntity.ok(ApiResponse.<PaymentHistoryResponse>builder()
                    .success(true)
                    .message("Payment recorded successfully")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error recording payment", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<PaymentHistoryResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Lịch sử thanh toán", description = "Lấy danh sách tất cả các khoản thanh toán của một hóa đơn")
    @GetMapping("/{invoiceId}/payments")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
    public ResponseEntity<ApiResponse<List<PaymentHistoryResponse>>> getPaymentHistory(
            @Parameter(description = "ID của hóa đơn") @PathVariable Integer invoiceId) {
        log.info("[InvoiceController] Getting payment history for invoice: {}", invoiceId);
        try {
            List<PaymentHistoryResponse> response = invoiceService.getPaymentHistory(invoiceId);
            return ResponseEntity.ok(ApiResponse.<List<PaymentHistoryResponse>>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error getting payment history", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<List<PaymentHistoryResponse>>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Tính số dư còn lại", description = "Tính số tiền còn lại cần thanh toán của hóa đơn")
    @GetMapping("/{invoiceId}/balance")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
    public ResponseEntity<ApiResponse<BigDecimal>> getBalance(
            @Parameter(description = "ID của hóa đơn") @PathVariable Integer invoiceId) {
        log.info("[InvoiceController] Getting balance for invoice: {}", invoiceId);
        try {
            BigDecimal balance = invoiceService.calculateBalance(invoiceId);
            return ResponseEntity.ok(ApiResponse.<BigDecimal>builder()
                    .success(true)
                    .data(balance)
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error getting balance", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BigDecimal>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Đánh dấu đã thanh toán", description = "Đánh dấu hóa đơn là đã thanh toán đầy đủ")
    @PostMapping("/{invoiceId}/mark-paid")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> markAsPaid(
            @Parameter(description = "ID của hóa đơn") @PathVariable Integer invoiceId) {
        log.info("[InvoiceController] Marking invoice as paid: {}", invoiceId);
        try {
            invoiceService.markAsPaid(invoiceId);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Invoice marked as paid")
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error marking invoice as paid", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Tạo số hóa đơn", description = "Tạo số hóa đơn tự động theo format: INV-{BRANCH}-{YYYY}-{SEQ}")
    @GetMapping("/generate-number")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<String>> generateInvoiceNumber(
            @Parameter(description = "ID chi nhánh", required = true) @RequestParam Integer branchId,
            @Parameter(description = "Ngày hóa đơn (mặc định: hôm nay)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate invoiceDate) {
        log.info("[InvoiceController] Generating invoice number for branch: {}", branchId);
        try {
            LocalDate date = invoiceDate != null ? invoiceDate : LocalDate.now();
            String invoiceNumber = invoiceService.generateInvoiceNumber(branchId, date);
            return ResponseEntity.ok(ApiResponse.<String>builder()
                    .success(true)
                    .data(invoiceNumber)
                    .build());
        } catch (Exception e) {
            log.error("[InvoiceController] Error generating invoice number", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }
}
