package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.RecordPaymentRequest;
import org.example.ptcmssbackend.dto.request.Invoice.SendInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.VoidInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.dto.response.Invoice.PaymentHistoryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface InvoiceService {

    // CRUD
    InvoiceResponse createInvoice(CreateInvoiceRequest request);
    InvoiceResponse getInvoiceById(Integer invoiceId);
    Page<InvoiceListResponse> getInvoices(
            Integer branchId,
            String type,
            String status,
            String paymentStatus,
            LocalDate startDate,
            LocalDate endDate,
            Integer customerId,
            String keyword,
            Pageable pageable
    );
    InvoiceResponse updateInvoice(Integer invoiceId, CreateInvoiceRequest request);
    void voidInvoice(Integer invoiceId, VoidInvoiceRequest request);

    // Invoice number generation
    String generateInvoiceNumber(Integer branchId, LocalDate invoiceDate);

    // Payment
    PaymentHistoryResponse recordPayment(Integer invoiceId, RecordPaymentRequest request);
    List<PaymentHistoryResponse> getPaymentHistory(Integer invoiceId);
    BigDecimal calculateBalance(Integer invoiceId);
    void markAsPaid(Integer invoiceId);
    void markAsOverdue(Integer invoiceId);

    // Sending
    void sendInvoice(Integer invoiceId, SendInvoiceRequest request);

    // Utilities
    boolean isOverdue(Integer invoiceId);
    void checkAndUpdateOverdueInvoices();

    // Payment confirmation
    PaymentHistoryResponse confirmPayment(Integer paymentId, String status);

    // Delete payment (only PENDING)
    void deletePayment(Integer paymentId);

    // Get pending payment requests (for accountant to confirm)
    List<PaymentHistoryResponse> getPendingPayments(Integer branchId);
    Long countPendingPayments(Integer branchId);

    // Check invoices with completed trips > 48h and mark as overdue (công nợ)
    void checkAndUpdateOverdueInvoicesAfter48h();
}

