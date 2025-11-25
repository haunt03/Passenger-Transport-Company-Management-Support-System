package org.example.ptcmssbackend.dto.response.Branch;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Dashboard statistics cho Manager theo chi nhánh")
public class ManagerDashboardStatsResponse {

    @Schema(description = "Thông tin chi nhánh")
    private BranchInfo branchInfo;

    @Schema(description = "Các chỉ số tài chính")
    private FinancialMetrics financialMetrics;

    @Schema(description = "Thống kê chuyến đi")
    private TripMetrics tripMetrics;

    @Schema(description = "Top tài xế hiệu suất cao")
    private List<DriverPerformance> topDrivers;

    @Schema(description = "Hiệu suất xe")
    private List<VehicleEfficiency> vehicleEfficiency;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BranchInfo {
        @Schema(description = "ID chi nhánh", example = "1")
        private Integer branchId;

        @Schema(description = "Tên chi nhánh", example = "Hà Nội")
        private String branchName;

        @Schema(description = "Địa chỉ", example = "123 Đường ABC, Hà Nội")
        private String location;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinancialMetrics {
        @Schema(description = "Tổng doanh thu", example = "45000000000")
        private BigDecimal revenue;

        @Schema(description = "Tổng chi phí", example = "31000000000")
        private BigDecimal expense;

        @Schema(description = "Lợi nhuận (revenue - expense)", example = "14000000000")
        private BigDecimal profit;

        @Schema(description = "% thay đổi doanh thu so với kỳ trước", example = "4.2")
        private Double changeRevenuePct;

        @Schema(description = "% thay đổi chi phí so với kỳ trước", example = "1.1")
        private Double changeExpensePct;

        @Schema(description = "% thay đổi lợi nhuận so với kỳ trước", example = "6.0")
        private Double changeProfitPct;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TripMetrics {
        @Schema(description = "Số chuyến hoàn thành", example = "420")
        private Long completed;

        @Schema(description = "Số chuyến bị hủy", example = "18")
        private Long cancelled;

        @Schema(description = "Tổng km đã chạy", example = "82500")
        private BigDecimal totalKm;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DriverPerformance {
        @Schema(description = "ID tài xế", example = "101")
        private Integer driverId;

        @Schema(description = "Tên tài xế", example = "Nguyễn Văn A")
        private String driverName;

        @Schema(description = "Số chuyến đã hoàn thành", example = "62")
        private Long trips;

        @Schema(description = "Tổng km đã chạy", example = "11200")
        private BigDecimal km;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleEfficiency {
        @Schema(description = "Biển số xe", example = "29A-123.45")
        private String licensePlate;

        @Schema(description = "Chi phí trên km", example = "2800")
        private BigDecimal costPerKm;

        @Schema(description = "Tổng km đã chạy", example = "5200")
        private BigDecimal totalKm;
    }
}