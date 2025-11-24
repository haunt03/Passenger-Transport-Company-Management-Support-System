package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;

import java.math.BigDecimal;
import java.util.List;

/**
 * DepositService - Quản lý cọc và thanh toán
 * 
 * Note: Deposit được quản lý thông qua Invoices với isDeposit = true
 * Service này cung cấp các methods tiện ích cho deposit management
 */
public interface DepositService {
    
    /**
     * Tạo deposit cho booking
     */
    InvoiceResponse createDeposit(Integer bookingId, CreateInvoiceRequest request);
    
    /**
     * Lấy danh sách deposits của một booking
     */
    List<InvoiceResponse> getDepositsByBooking(Integer bookingId);
    
    /**
     * Tính tổng deposit đã thu
     */
    BigDecimal getTotalDepositPaid(Integer bookingId);
    
    /**
     * Tính số tiền còn lại cần thu
     */
    BigDecimal getRemainingAmount(Integer bookingId);
    
    /**
     * Hủy deposit
     */
    void cancelDeposit(Integer depositId, String reason);
    
    /**
     * Tạo receipt number cho deposit
     */
    String generateReceiptNumber(Integer branchId);
}

