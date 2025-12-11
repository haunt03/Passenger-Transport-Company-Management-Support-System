package org.example.ptcmssbackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.expense.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.dto.response.expense.ExpenseRequestResponse;
import org.example.ptcmssbackend.service.ExpenseRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/expense-requests")
@RequiredArgsConstructor
public class ExpenseRequestController {

    private final ExpenseRequestService expenseRequestService;

    /**
     * Tạo yêu cầu thanh toán - Chỉ Tư vấn viên, Tài xế, Điều phối viên được tạo
     * Kế toán chỉ duyệt, không tạo yêu cầu
     * Hỗ trợ upload ảnh chứng từ (multipart/form-data)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','DRIVER','COORDINATOR')")
    public ResponseEntity<ResponseData<ExpenseRequestResponse>> createExpenseRequest(
            @RequestParam("type") String type,
            @RequestParam("amount") String amount,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam("branchId") Integer branchId,
            @RequestParam(value = "requesterUserId", required = false) Integer requesterUserId,
            @RequestParam(value = "vehicleId", required = false) Integer vehicleId,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        log.info("[ExpenseRequest] create - type: {}, amount: {}, branchId: {}, files: {}", 
                type, amount, branchId, files != null ? files.size() : 0);
        
        // Validate required fields
        if (type == null || type.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new ResponseData<>(HttpStatus.BAD_REQUEST.value(), "Loại chi phí không được để trống", null));
        }
        
        if (amount == null || amount.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new ResponseData<>(HttpStatus.BAD_REQUEST.value(), "Số tiền không được để trống", null));
        }
        
        if (branchId == null) {
            return ResponseEntity.badRequest()
                    .body(new ResponseData<>(HttpStatus.BAD_REQUEST.value(), "Chi nhánh không được để trống", null));
        }
        
        // Parse amount with error handling
        java.math.BigDecimal amountDecimal;
        try {
            amountDecimal = new java.math.BigDecimal(amount.trim());
            if (amountDecimal.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                        .body(new ResponseData<>(HttpStatus.BAD_REQUEST.value(), "Số tiền phải lớn hơn 0", null));
            }
        } catch (NumberFormatException e) {
            log.error("[ExpenseRequest] Invalid amount format: {}", amount);
            return ResponseEntity.badRequest()
                    .body(new ResponseData<>(HttpStatus.BAD_REQUEST.value(), "Số tiền không hợp lệ: " + amount, null));
        }
        
        // Build CreateExpenseRequest from form data
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType(type.trim());
        request.setAmount(amountDecimal);
        request.setNote(note != null ? note.trim() : null);
        request.setBranchId(branchId);
        request.setRequesterUserId(requesterUserId);
        request.setVehicleId(vehicleId);
        
        try {
            ExpenseRequestResponse response = expenseRequestService.createExpenseRequest(request, files);
            return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(), "Create expense request successfully", response));
        } catch (RuntimeException e) {
            log.error("[ExpenseRequest] Error creating expense request: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new ResponseData<>(HttpStatus.BAD_REQUEST.value(), e.getMessage(), null));
        } catch (Exception e) {
            log.error("[ExpenseRequest] Unexpected error creating expense request: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseData<>(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Lỗi hệ thống khi tạo yêu cầu chi phí", null));
        }
    }
    
    /**
     * Lấy danh sách yêu cầu thanh toán theo driver ID
     */
    @GetMapping("/driver/{driverId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','COORDINATOR','DRIVER')")
    public ResponseEntity<ResponseData<List<ExpenseRequestResponse>>> getByDriverId(
            @PathVariable Integer driverId
    ) {
        log.info("[ExpenseRequest] get by driver {}", driverId);
        List<ExpenseRequestResponse> list = expenseRequestService.getByDriverId(driverId);
        return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(), "Success", list));
    }
    
    /**
     * Lấy danh sách yêu cầu chờ duyệt - Kế toán và Manager duyệt
     */
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ResponseData<List<ExpenseRequestResponse>>> getPending(
            @RequestParam(required = false) Integer branchId
    ) {
        log.info("[ExpenseRequest] get pending requests - branchId: {}", branchId);
        List<ExpenseRequestResponse> list = expenseRequestService.getPendingRequests(branchId);
        return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(), "Success", list));
    }

    /**
     * Duyệt yêu cầu thanh toán - Kế toán xác nhận
     */
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ResponseData<ExpenseRequestResponse>> approveExpenseRequest(
            @PathVariable Integer id,
            @RequestParam(required = false) String note
    ) {
        log.info("[ExpenseRequest] approve request {} with note: {}", id, note);
        ExpenseRequestResponse response = expenseRequestService.approveRequest(id, note);
        return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(), "Expense request approved", response));
    }

    /**
     * Từ chối yêu cầu thanh toán
     */
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ResponseData<ExpenseRequestResponse>> rejectExpenseRequest(
            @PathVariable Integer id,
            @RequestParam(required = false) String note
    ) {
        log.info("[ExpenseRequest] reject request {} with note: {}", id, note);
        ExpenseRequestResponse response = expenseRequestService.rejectRequest(id, note);
        return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(), "Expense request rejected", response));
    }

    /**
     * Lấy tất cả yêu cầu thanh toán (có filter)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ResponseData<List<ExpenseRequestResponse>>> getAllExpenseRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer branchId
    ) {
        log.info("[ExpenseRequest] get all requests - status: {}, branchId: {}", status, branchId);
        List<ExpenseRequestResponse> list = expenseRequestService.getAllRequests(status, branchId);
        return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(), "Success", list));
    }
}
