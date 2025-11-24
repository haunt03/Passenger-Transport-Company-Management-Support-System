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

    @Query("SELECT ph FROM PaymentHistory ph WHERE ph.invoice.id = :invoiceId ORDER BY ph.paymentDate DESC")
    List<PaymentHistory> findAllByInvoiceId(@Param("invoiceId") Integer invoiceId);
}
