package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.example.ptcmssbackend.repository.ApprovalHistoryRepository;
import org.example.ptcmssbackend.repository.DriverDayOffRepository;
import org.example.ptcmssbackend.repository.DriverRepository;
import org.example.ptcmssbackend.repository.ExpenseRequestRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * ApprovalSyncService - Tự động sync approval history từ các bảng khác
 * 
 * Chạy định kỳ để tạo ApprovalHistory cho:
 * - DriverDayOff với status PENDING
 * - ExpenseRequests với status PENDING
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ApprovalSyncServiceImpl {
    
    private final DriverDayOffRepository driverDayOffRepository;
    private final ExpenseRequestRepository expenseRequestRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final DriverRepository driverRepository;
    
    /**
     * Sync approval history từ DriverDayOff
     * Chạy mỗi 5 phút
     */
    @Scheduled(fixedRate = 300000) // 5 phút
    public void syncDriverDayOffApprovals() {
        log.info("[ApprovalSync] Syncing driver day-off approvals...");
        
        try {
            List<DriverDayOff> pendingDayOffs = driverDayOffRepository.findByStatus(DriverDayOffStatus.PENDING);
            
            for (DriverDayOff dayOff : pendingDayOffs) {
                // Kiểm tra xem đã có approval history chưa
                boolean exists = approvalHistoryRepository
                        .findByApprovalTypeAndRelatedEntityIdAndStatus(
                                ApprovalType.DRIVER_DAY_OFF,
                                dayOff.getId(),
                                ApprovalStatus.PENDING
                        )
                        .isPresent();
                
                if (!exists) {
                    // Tạo approval history mới
                    Drivers driver = dayOff.getDriver();
                    Users requestedBy = driver.getEmployee() != null && driver.getEmployee().getUser() != null
                            ? driver.getEmployee().getUser()
                            : null;
                    
                    if (requestedBy != null) {
                        ApprovalHistory history = ApprovalHistory.builder()
                                .approvalType(ApprovalType.DRIVER_DAY_OFF)
                                .relatedEntityId(dayOff.getId())
                                .status(ApprovalStatus.PENDING)
                                .requestedBy(requestedBy)
                                .requestReason(dayOff.getReason())
                                .branch(driver.getBranch())
                                .build();
                        
                        approvalHistoryRepository.save(history);
                        log.info("[ApprovalSync] Created approval history for day-off {}", dayOff.getId());
                    }
                }
            }
            
            log.info("[ApprovalSync] Synced {} driver day-off approvals", pendingDayOffs.size());
        } catch (Exception e) {
            log.error("[ApprovalSync] Failed to sync driver day-off approvals", e);
        }
    }
    
    /**
     * Sync approval history từ ExpenseRequests
     * Chạy mỗi 5 phút
     */
    @Scheduled(fixedRate = 300000) // 5 phút
    public void syncExpenseRequestApprovals() {
        log.info("[ApprovalSync] Syncing expense request approvals...");
        
        try {
            List<ExpenseRequests> pendingExpenses = expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING);
            
            for (ExpenseRequests expense : pendingExpenses) {
                // Kiểm tra xem đã có approval history chưa
                boolean exists = approvalHistoryRepository
                        .findByApprovalTypeAndRelatedEntityIdAndStatus(
                                ApprovalType.EXPENSE_REQUEST,
                                expense.getId(),
                                ApprovalStatus.PENDING
                        )
                        .isPresent();
                
                if (!exists) {
                    // Tạo approval history mới
                    Users requestedBy = expense.getRequester();
                    
                    if (requestedBy != null) {
                        String reason = String.format("Yêu cầu tạm ứng: %s - %s VNĐ",
                                expense.getType(),
                                expense.getAmount());
                        
                        ApprovalHistory history = ApprovalHistory.builder()
                                .approvalType(ApprovalType.EXPENSE_REQUEST)
                                .relatedEntityId(expense.getId())
                                .status(ApprovalStatus.PENDING)
                                .requestedBy(requestedBy)
                                .requestReason(reason)
                                .branch(expense.getBranch())
                                .build();
                        
                        approvalHistoryRepository.save(history);
                        log.info("[ApprovalSync] Created approval history for expense {}", expense.getId());
                    }
                }
            }
            
            log.info("[ApprovalSync] Synced {} expense request approvals", pendingExpenses.size());
        } catch (Exception e) {
            log.error("[ApprovalSync] Failed to sync expense request approvals", e);
        }
    }
    
    /**
     * Manual trigger để sync tất cả
     */
    public void syncAll() {
        log.info("[ApprovalSync] Manual sync triggered");
        syncDriverDayOffApprovals();
        syncExpenseRequestApprovals();
    }
}
