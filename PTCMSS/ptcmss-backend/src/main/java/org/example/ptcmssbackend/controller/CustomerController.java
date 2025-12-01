package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.response.Booking.CustomerResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.dto.response.common.ResponseError;
import org.example.ptcmssbackend.service.CustomerService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Tag(name = "Customer", description = "API quản lý khách hàng")
public class CustomerController {

    private final CustomerService customerService;

    @Operation(summary = "Lấy danh sách khách hàng", description = "Danh sách khách hàng với filter theo keyword, chi nhánh, thời gian tạo. Manager chỉ xem khách hàng của chi nhánh mình quản lý.")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CONSULTANT', 'COORDINATOR', 'ACCOUNTANT')")
    public ResponseData<?> listCustomers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Integer userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            log.info("[Customer] List customers - keyword={}, branchId={}, userId={}, from={}, to={}, page={}, size={}",
                    keyword, branchId, userId, fromDate, toDate, page, size);

            Page<CustomerResponse> result = customerService.listCustomers(keyword, branchId, userId, fromDate, toDate, page, size);

            return new ResponseData<>(HttpStatus.OK.value(), "Success", Map.of(
                    "content", result.getContent(),
                    "totalElements", result.getTotalElements(),
                    "totalPages", result.getTotalPages(),
                    "page", result.getNumber(),
                    "size", result.getSize()
            ));
        } catch (Exception e) {
            log.error("[Customer] Failed to list customers: {}", e.getMessage(), e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

}
