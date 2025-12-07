package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.service.InvoiceService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled task để tự động kiểm tra và đánh dấu các invoice quá hạn
 * 
 * 1. checkOverdueInvoices: Chạy mỗi ngày lúc 1:00 AM - check theo dueDate
 * 2. checkOverdueAfter48h: Chạy mỗi giờ - check 48h sau khi trip completed (công nợ)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OverdueInvoiceScheduler {

    private final InvoiceService invoiceService;

    /**
     * Check invoice quá hạn theo dueDate (mỗi ngày lúc 1:00 AM)
     */
    @Scheduled(cron = "0 0 1 * * ?") // Chạy mỗi ngày lúc 1:00 AM
    public void checkOverdueInvoices() {
        log.info("[OverdueInvoiceScheduler] Starting daily overdue invoice check...");
        try {
            invoiceService.checkAndUpdateOverdueInvoices();
            log.info("[OverdueInvoiceScheduler] Daily overdue invoice check completed successfully");
        } catch (Exception e) {
            log.error("[OverdueInvoiceScheduler] Error checking overdue invoices", e);
        }
    }
    
    /**
     * Check invoice quá 48h sau khi trip hoàn thành → vào bảng công nợ
     * Chạy mỗi giờ để đảm bảo không bị miss
     */
    @Scheduled(cron = "0 0 * * * ?") // Chạy mỗi giờ đầu giờ
    public void checkOverdueAfter48h() {
        log.info("[OverdueInvoiceScheduler] Starting 48h overdue check (trip completion)...");
        try {
            invoiceService.checkAndUpdateOverdueInvoicesAfter48h();
            log.info("[OverdueInvoiceScheduler] 48h overdue check completed successfully");
        } catch (Exception e) {
            log.error("[OverdueInvoiceScheduler] Error checking 48h overdue invoices", e);
        }
    }
}

