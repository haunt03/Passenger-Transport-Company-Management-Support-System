package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.ApprovalHistory;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, Integer> {
    
    // Lấy tất cả pending approvals
    List<ApprovalHistory> findByStatusOrderByRequestedAtDesc(ApprovalStatus status);
    
    // Lấy pending approvals theo chi nhánh
    List<ApprovalHistory> findByBranch_IdAndStatusOrderByRequestedAtDesc(
            Integer branchId, ApprovalStatus status);
    
    // Lấy approval history theo type và entity ID
    List<ApprovalHistory> findByApprovalTypeAndRelatedEntityIdOrderByRequestedAtDesc(
            ApprovalType approvalType, Integer relatedEntityId);
    
    // Lấy approval history của một user
    List<ApprovalHistory> findByRequestedBy_IdOrderByRequestedAtDesc(Integer userId);
    
    // Lấy approval history đã xử lý bởi một user
    List<ApprovalHistory> findByApprovedBy_IdOrderByProcessedAtDesc(Integer userId);
    
    // Tìm approval pending cho một entity cụ thể
    Optional<ApprovalHistory> findByApprovalTypeAndRelatedEntityIdAndStatus(
            ApprovalType approvalType, Integer relatedEntityId, ApprovalStatus status);
    
    // Đếm số pending approvals
    long countByStatus(ApprovalStatus status);
    
    // Đếm theo chi nhánh
    long countByBranch_IdAndStatus(Integer branchId, ApprovalStatus status);
}
