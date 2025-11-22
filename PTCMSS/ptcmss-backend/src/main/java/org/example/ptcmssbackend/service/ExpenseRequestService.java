package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.expense.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.response.expense.ExpenseRequestResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ExpenseRequestService {
    ExpenseRequestResponse createExpenseRequest(CreateExpenseRequest request, List<MultipartFile> attachments);
}
