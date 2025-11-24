package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Debt.SendDebtReminderRequest;
import org.example.ptcmssbackend.dto.request.Debt.UpdateDebtInfoRequest;
import org.example.ptcmssbackend.dto.response.Debt.AgingBucketResponse;
import org.example.ptcmssbackend.dto.response.Debt.DebtReminderHistoryResponse;
import org.example.ptcmssbackend.dto.response.Debt.DebtSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface DebtService {

    // Debt list
    Page<DebtSummaryResponse> getDebts(
            Integer branchId,
            Boolean overdueOnly,
            Pageable pageable);

    // Aging analysis
    AgingBucketResponse getAgingBuckets(Integer branchId, LocalDate asOfDate);

    // Reminders
    void sendDebtReminder(Integer invoiceId, SendDebtReminderRequest request);
    List<DebtReminderHistoryResponse> getReminderHistory(Integer invoiceId);

    // Debt management
    void updateDebtInfo(Integer invoiceId, UpdateDebtInfoRequest request);
    void setPromiseToPay(Integer invoiceId, LocalDate promiseDate);
    void setDebtLabel(Integer invoiceId, String label);
}
