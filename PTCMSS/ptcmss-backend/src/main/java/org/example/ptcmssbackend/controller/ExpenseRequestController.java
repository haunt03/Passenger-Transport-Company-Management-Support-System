package org.example.ptcmssbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.expense.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.dto.response.expense.ExpenseRequestResponse;
import org.example.ptcmssbackend.service.ExpenseRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/expense-requests")
@RequiredArgsConstructor
public class ExpenseRequestController {

    private final ExpenseRequestService expenseRequestService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseData<ExpenseRequestResponse>> createExpenseRequest(
            @Valid @ModelAttribute CreateExpenseRequest request,
            @RequestParam(value = "files", required = false) List<MultipartFile> files
    ) {
        log.info("[ExpenseRequest] create payload {}", request);
        ExpenseRequestResponse response = expenseRequestService.createExpenseRequest(request, files);
        return ResponseEntity.ok(new ResponseData<>(HttpStatus.OK.value(), "Create expense request successfully", response));
    }
}
