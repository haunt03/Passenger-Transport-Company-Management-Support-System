package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.entity.ApprovalHistory;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.repository.ApprovalHistoryRepository;
import org.example.ptcmssbackend.service.ApprovalService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ApprovalServiceImpl implements ApprovalService {
    
    private final ApprovalHistoryRepository approvalHistoryRepository;
    
    @Override
    public ApprovalHistory createApprovalRequest(
            ApprovalType approvalType,
            Integer relatedEntityId,
            Users requestedBy,
            String requestReason,
            Branches branch) {
        
        log.info("[Approval] Creating approval request: type={}, entityId={}, requestedBy={}", 
                approvalType, relatedEntityId, requestedBy.getId());
        
        ApprovalHistory history = ApprovalHistory.builder()
                .approvalType(approvalType)
                .relatedEntityId(relatedEntityId)
                .status(ApprovalStatus.PENDING)
                .requestedBy(requestedBy)
                .requestReason(requestReason)
                .branch(branch)
                .build();
        
        return approvalHistoryRepository.save(history);
    }
}
