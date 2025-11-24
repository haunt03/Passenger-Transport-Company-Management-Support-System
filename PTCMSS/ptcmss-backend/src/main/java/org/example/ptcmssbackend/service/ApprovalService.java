package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.entity.ApprovalHistory;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.ApprovalType;

/**
 * ApprovalService - Helper service để tạo approval history
 * 
 * Sử dụng khi tạo yêu cầu mới cần phê duyệt:
 * - Driver day-off request
 * - Expense request
 * - Discount request
 * - etc.
 */
public interface ApprovalService {
    
    /**
     * Tạo approval history cho yêu cầu mới
     * 
     * @param approvalType Loại yêu cầu (DRIVER_DAY_OFF, EXPENSE_REQUEST, etc.)
     * @param relatedEntityId ID của entity cần approve
     * @param requestedBy User tạo yêu cầu
     * @param requestReason Lý do yêu cầu
     * @param branch Chi nhánh
     * @return ApprovalHistory đã tạo
     */
    ApprovalHistory createApprovalRequest(
            ApprovalType approvalType,
            Integer relatedEntityId,
            Users requestedBy,
            String requestReason,
            Branches branch
    );
}
