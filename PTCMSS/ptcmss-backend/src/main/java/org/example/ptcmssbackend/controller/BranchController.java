package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.example.ptcmssbackend.dto.request.Branch.CreateBranchRequest;

import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.service.BranchService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@Tag(name = "Branch Management", description = "Quản lý chi nhánh, thêm - sửa - xem - vô hiệu hóa")
public class BranchController {

    private final BranchService branchService;

    // ======================= CREATE =======================
    @Operation(summary = "Tạo chi nhánh mới", description = "Chỉ Admin được phép thêm chi nhánh mới.")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseData<?> createBranch(@RequestBody CreateBranchRequest request) {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Create branch successfully",
                    branchService.createBranch(request));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }


}
