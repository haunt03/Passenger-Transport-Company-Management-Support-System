package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.SystemAlerts;
import org.example.ptcmssbackend.enums.AlertSeverity;
import org.example.ptcmssbackend.enums.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SystemAlertsRepository extends JpaRepository<SystemAlerts, Integer> {
    
    // Lấy tất cả alerts chưa acknowledge
    List<SystemAlerts> findByIsAcknowledgedFalseOrderByCreatedAtDesc();
    
    // Lấy alerts theo chi nhánh
    List<SystemAlerts> findByBranch_IdAndIsAcknowledgedFalseOrderByCreatedAtDesc(Integer branchId);
    
    // Lấy alerts theo severity
    List<SystemAlerts> findBySeverityAndIsAcknowledgedFalseOrderByCreatedAtDesc(AlertSeverity severity);
    
    // Lấy alerts theo type
    List<SystemAlerts> findByAlertTypeAndIsAcknowledgedFalseOrderByCreatedAtDesc(AlertType alertType);
    
    // Lấy alerts theo entity
    List<SystemAlerts> findByRelatedEntityTypeAndRelatedEntityIdAndIsAcknowledgedFalse(
            String entityType, Integer entityId);
    
    // Đếm số alerts chưa acknowledge
    long countByIsAcknowledgedFalse();
    
    // Đếm theo chi nhánh
    long countByBranch_IdAndIsAcknowledgedFalse(Integer branchId);
    
    // Xóa alerts đã hết hạn
    @Query("DELETE FROM SystemAlerts a WHERE a.expiresAt < :now")
    void deleteExpiredAlerts(Instant now);
}
