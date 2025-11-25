package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.service.InvoiceService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled task để tự động kiểm tra và đánh dấu các invoice quá hạn
 * Chạy mỗi ngày lúc 1:00 AM
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OverdueInvoiceScheduler {

    private final InvoiceService invoiceService;

    @Scheduled(cron = "0 0 1 * * ?") // Chạy mỗi ngày lúc 1:00 AM
    public void checkOverdueInvoices() {
        log.info("[OverdueInvoiceScheduler] Starting overdue invoice check...");
        try {
            invoiceService.checkAndUpdateOverdueInvoices();
            log.info("[OverdueInvoiceScheduler] Overdue invoice check completed successfully");
        } catch (Exception e) {
            log.error("[OverdueInvoiceScheduler] Error checking overdue invoices", e);
        }
    }
}
