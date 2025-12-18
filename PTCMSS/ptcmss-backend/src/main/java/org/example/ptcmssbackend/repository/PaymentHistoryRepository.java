package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.PaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, Integer> {
    
    List<PaymentHistory> findByInvoice_IdOrderByPaymentDateDesc(Integer invoiceId);
    
    @Query("SELECT COALESCE(SUM(ph.amount), 0) FROM PaymentHistory ph WHERE ph.invoice.id = :invoiceId")
    BigDecimal sumByInvoiceId(@Param("invoiceId") Integer invoiceId);
    
    /**
     * Tính tổng thanh toán đã được xác nhận (chỉ tính các payment có confirmationStatus = CONFIRMED)
     */
    @Query("SELECT COALESCE(SUM(ph.amount), 0) FROM PaymentHistory ph WHERE ph.invoice.id = :invoiceId AND ph.confirmationStatus = 'CONFIRMED'")
    BigDecimal sumConfirmedByInvoiceId(@Param("invoiceId") Integer invoiceId);
    
    @Query("SELECT ph FROM PaymentHistory ph WHERE ph.invoice.id = :invoiceId ORDER BY ph.paymentDate DESC")
    List<PaymentHistory> findAllByInvoiceId(@Param("invoiceId") Integer invoiceId);
    
    /**
     * Lấy tất cả payment requests đang chờ xác nhận (PENDING)
     * Dùng cho kế toán để xác nhận thanh toán từ tài xế/tư vấn viên
     */
    @Query("SELECT ph FROM PaymentHistory ph " +
           "WHERE ph.confirmationStatus = org.example.ptcmssbackend.enums.PaymentConfirmationStatus.PENDING " +
           "AND (:branchId IS NULL OR ph.invoice.branch.id = :branchId) " +
           "ORDER BY ph.paymentDate ASC")
    List<PaymentHistory> findPendingPayments(@Param("branchId") Integer branchId);
    
    /**
     * Đếm số payment requests đang chờ xác nhận theo branch
     */
    @Query("SELECT COUNT(ph) FROM PaymentHistory ph " +
           "WHERE ph.confirmationStatus = org.example.ptcmssbackend.enums.PaymentConfirmationStatus.PENDING " +
           "AND (:branchId IS NULL OR ph.invoice.branch.id = :branchId)")
    Long countPendingPayments(@Param("branchId") Integer branchId);
    
    /**
     * Đếm số payment requests đang chờ xác nhận cho một invoice cụ thể
     */
    @Query("SELECT COUNT(ph) FROM PaymentHistory ph " +
           "WHERE ph.invoice.id = :invoiceId " +
           "AND ph.confirmationStatus = org.example.ptcmssbackend.enums.PaymentConfirmationStatus.PENDING")
    Integer countPendingPaymentsByInvoiceId(@Param("invoiceId") Integer invoiceId);
}

