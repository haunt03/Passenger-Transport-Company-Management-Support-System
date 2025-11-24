package org.example.ptcmssbackend.dto.response.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDashboardResponse {
    private List<AlertResponse> alerts;
    private List<ApprovalItemResponse> pendingApprovals;
    private NotificationStats stats;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationStats {
        private long totalAlerts;
        private long criticalAlerts;
        private long highAlerts;
        private long totalPendingApprovals;
        private long driverDayOffRequests;
        private long expenseRequests;
        private long discountRequests;
    }
}
