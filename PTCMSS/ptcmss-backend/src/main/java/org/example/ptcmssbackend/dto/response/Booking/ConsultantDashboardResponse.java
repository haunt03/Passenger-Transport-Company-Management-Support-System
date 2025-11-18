package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class ConsultantDashboardResponse {
    // Danh sách đơn hàng
    private List<BookingListResponse> pendingBookings; // Chờ báo giá
    private List<BookingListResponse> sentQuotations; // Đã gửi báo giá (chờ khách xác nhận)
    private List<BookingListResponse> confirmedBookings; // Đã xác nhận (chờ điều phối)

    // Thống kê
    private Long totalPendingCount;
    private Long totalSentCount;
    private Long totalConfirmedCount;

    // Biểu đồ nhanh
    private BigDecimal monthlyRevenue; // Doanh số trong tháng
    private Double conversionRate; // Tỷ lệ chuyển đổi (Confirmed / Total)

    // Thống kê theo tháng
    private List<MonthlyStatistic> monthlyStatistics;

    @Data
    @Builder
    public static class MonthlyStatistic {
        private String month; // "2025-11"
        private Long totalBookings;
        private Long confirmedBookings;
        private BigDecimal revenue;
        private Double conversionRate;
    }
}
