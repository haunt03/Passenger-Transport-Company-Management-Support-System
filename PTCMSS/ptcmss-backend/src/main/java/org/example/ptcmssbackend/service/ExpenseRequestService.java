package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.expense.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.response.expense.ExpenseRequestResponse;

import java.util.List;

public interface ExpenseRequestService {
    ExpenseRequestResponse createExpenseRequest(CreateExpenseRequest request);
    
    List<ExpenseRequestResponse> getByDriverId(Integer driverId);
    
    List<ExpenseRequestResponse> getPendingRequests(Integer branchId);
    
    ExpenseRequestResponse approveRequest(Integer id, String note);
    
    ExpenseRequestResponse rejectRequest(Integer id, String note);
    
    List<ExpenseRequestResponse> getAllRequests(String status, Integer branchId);
}
