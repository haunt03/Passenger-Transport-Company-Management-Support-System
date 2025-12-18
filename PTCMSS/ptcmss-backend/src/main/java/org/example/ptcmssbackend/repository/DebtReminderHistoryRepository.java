package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.DebtReminderHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DebtReminderHistoryRepository extends JpaRepository<DebtReminderHistory, Integer> {


    @Query("SELECT drh FROM DebtReminderHistory drh WHERE drh.invoice.id = :invoiceId ORDER BY drh.reminderDate DESC")
    List<DebtReminderHistory> findAllByInvoiceId(@Param("invoiceId") Integer invoiceId);

    @Query("SELECT drh FROM DebtReminderHistory drh WHERE drh.invoice.id = :invoiceId ORDER BY drh.reminderDate DESC LIMIT 1")
    Optional<DebtReminderHistory> findLatestByInvoiceId(@Param("invoiceId") Integer invoiceId);
}
