package org.example.ptcmssbackend.controller;

import jakarta.validation.Valid;
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
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','DRIVER','COORDINATOR')")
    public ResponseEntity<ResponseData<ExpenseRequestResponse>> createExpenseRequest(
            @Valid @RequestBody CreateExpenseRequest request
    ) {
        log.info("[ExpenseRequest] create payload {}", request);
        ExpenseRequestResponse response = expenseRequestService.createExpenseRequest(request);
        return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(), "Create expense request successfully", response));
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
