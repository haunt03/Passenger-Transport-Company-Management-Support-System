package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.entity.ApprovalHistory;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.repository.ApprovalHistoryRepository;
import org.example.ptcmssbackend.service.impl.ApprovalServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApprovalServiceImplTest {

    @Mock
    private ApprovalHistoryRepository approvalHistoryRepository;

    @InjectMocks
    private ApprovalServiceImpl approvalService;

    // ==================== createApprovalRequest() Tests ====================

    @Test
    void createApprovalRequest_whenValidRequest_shouldCreateAndSave() {
        // Given
        ApprovalType approvalType = ApprovalType.EXPENSE_REQUEST;
        Integer relatedEntityId = 100;
        String requestReason = "Chi phí nhiên liệu cho chuyến đi";
        
        Users requestedBy = new Users();
        requestedBy.setId(1);
        requestedBy.setFullName("Nguyễn Văn A");
        
        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");
        
        ApprovalHistory savedHistory = ApprovalHistory.builder()
                .id(1)
                .approvalType(approvalType)
                .relatedEntityId(relatedEntityId)
                .status(ApprovalStatus.PENDING)
                .requestedBy(requestedBy)
                .requestReason(requestReason)
                .branch(branch)
                .build();
        
        when(approvalHistoryRepository.save(any(ApprovalHistory.class))).thenReturn(savedHistory);

        // When
        ApprovalHistory result = approvalService.createApprovalRequest(
                approvalType, relatedEntityId, requestedBy, requestReason, branch);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1);
        assertThat(result.getApprovalType()).isEqualTo(approvalType);
        assertThat(result.getRelatedEntityId()).isEqualTo(relatedEntityId);
        assertThat(result.getStatus()).isEqualTo(ApprovalStatus.PENDING);
        assertThat(result.getRequestedBy()).isEqualTo(requestedBy);
        assertThat(result.getRequestReason()).isEqualTo(requestReason);
        assertThat(result.getBranch()).isEqualTo(branch);
        
        ArgumentCaptor<ApprovalHistory> captor = ArgumentCaptor.forClass(ApprovalHistory.class);
        verify(approvalHistoryRepository).save(captor.capture());
        
        ApprovalHistory captured = captor.getValue();
        assertThat(captured.getApprovalType()).isEqualTo(approvalType);
        assertThat(captured.getRelatedEntityId()).isEqualTo(relatedEntityId);
        assertThat(captured.getStatus()).isEqualTo(ApprovalStatus.PENDING);
        assertThat(captured.getRequestedBy()).isEqualTo(requestedBy);
        assertThat(captured.getRequestReason()).isEqualTo(requestReason);
        assertThat(captured.getBranch()).isEqualTo(branch);
    }

    @Test
    void createApprovalRequest_whenVehicleApproval_shouldCreateWithCorrectType() {
        // Given
        ApprovalType approvalType = ApprovalType.VEHICLE_REPAIR;
        Integer relatedEntityId = 50;
        String requestReason = "Yêu cầu sửa chữa xe";
        
        Users requestedBy = new Users();
        requestedBy.setId(2);
        
        Branches branch = new Branches();
        branch.setId(2);
        
        ApprovalHistory savedHistory = ApprovalHistory.builder()
                .id(2)
                .approvalType(approvalType)
                .relatedEntityId(relatedEntityId)
                .status(ApprovalStatus.PENDING)
                .requestedBy(requestedBy)
                .requestReason(requestReason)
                .branch(branch)
                .build();
        
        when(approvalHistoryRepository.save(any(ApprovalHistory.class))).thenReturn(savedHistory);

        // When
        ApprovalHistory result = approvalService.createApprovalRequest(
                approvalType, relatedEntityId, requestedBy, requestReason, branch);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getApprovalType()).isEqualTo(ApprovalType.VEHICLE_REPAIR);
        verify(approvalHistoryRepository).save(any(ApprovalHistory.class));
    }

    @Test
    void createApprovalRequest_whenNullRequestReason_shouldStillCreate() {
        // Given
        ApprovalType approvalType = ApprovalType.EXPENSE_REQUEST;
        Integer relatedEntityId = 100;
        String requestReason = null;
        
        Users requestedBy = new Users();
        requestedBy.setId(1);
        
        Branches branch = new Branches();
        branch.setId(1);
        
        ApprovalHistory savedHistory = ApprovalHistory.builder()
                .id(3)
                .approvalType(approvalType)
                .relatedEntityId(relatedEntityId)
                .status(ApprovalStatus.PENDING)
                .requestedBy(requestedBy)
                .requestReason(requestReason)
                .branch(branch)
                .build();
        
        when(approvalHistoryRepository.save(any(ApprovalHistory.class))).thenReturn(savedHistory);

        // When
        ApprovalHistory result = approvalService.createApprovalRequest(
                approvalType, relatedEntityId, requestedBy, requestReason, branch);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getRequestReason()).isNull();
        verify(approvalHistoryRepository).save(any(ApprovalHistory.class));
    }

    @Test
    void createApprovalRequest_shouldAlwaysSetStatusToPending() {
        // Given
        ApprovalType approvalType = ApprovalType.EXPENSE_REQUEST;
        Integer relatedEntityId = 100;
        String requestReason = "Test reason";
        
        Users requestedBy = new Users();
        requestedBy.setId(1);
        
        Branches branch = new Branches();
        branch.setId(1);
        
        ApprovalHistory savedHistory = ApprovalHistory.builder()
                .id(4)
                .approvalType(approvalType)
                .relatedEntityId(relatedEntityId)
                .status(ApprovalStatus.PENDING)
                .requestedBy(requestedBy)
                .requestReason(requestReason)
                .branch(branch)
                .build();
        
        when(approvalHistoryRepository.save(any(ApprovalHistory.class))).thenReturn(savedHistory);

        // When
        ApprovalHistory result = approvalService.createApprovalRequest(
                approvalType, relatedEntityId, requestedBy, requestReason, branch);

        // Then
        assertThat(result.getStatus()).isEqualTo(ApprovalStatus.PENDING);
        
        ArgumentCaptor<ApprovalHistory> captor = ArgumentCaptor.forClass(ApprovalHistory.class);
        verify(approvalHistoryRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ApprovalStatus.PENDING);
    }
}

