package org.example.ptcmssbackend.dto.response.Driver;



import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.entity.DriverDayOff;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;

import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Phản hồi thông tin yêu cầu nghỉ phép của tài xế")
public class DriverDayOffResponse {

    @Schema(description = "ID yêu cầu nghỉ phép", example = "10")
    private Integer id;

    @Schema(description = "ID tài xế", example = "5")
    private Integer driverId;

    @Schema(description = "Tên tài xế", example = "Nguyễn Văn A")
    private String driverName;

    @Schema(description = "Chi nhánh làm việc", example = "Chi nhánh Cần Thơ")
    private String branchName;

    @Schema(description = "Ngày bắt đầu nghỉ", example = "2025-11-10")
    private LocalDate startDate;

    @Schema(description = "Ngày kết thúc nghỉ", example = "2025-11-12")
    private LocalDate endDate;

    @Schema(description = "Lý do nghỉ phép", example = "Nghỉ ốm có xác nhận bác sĩ")
    private String reason;

    @Schema(description = "Trạng thái duyệt nghỉ phép", example = "Pending")
    private DriverDayOffStatus status;

    @Schema(description = "Người duyệt (nếu có)", example = "Trần Thị B - Quản lý chi nhánh")
    private String approvedBy;

    @Schema(description = "Ngày tạo yêu cầu", example = "2025-11-03T07:25:00Z")
    private Instant createdAt;

    public DriverDayOffResponse(DriverDayOff entity) {
        this.id = entity.getId();
        this.driverId = entity.getDriver().getId();
        this.driverName = entity.getDriver().getEmployee().getUser().getFullName();
        this.branchName = entity.getDriver().getBranch().getBranchName();
        this.startDate = entity.getStartDate();
        this.endDate = entity.getEndDate();
        this.reason = entity.getReason();
        this.status = entity.getStatus();
        this.createdAt = entity.getCreatedAt();
        this.approvedBy = (entity.getApprovedBy() != null)
                ? entity.getApprovedBy().getUser().getFullName()
                : "Chưa phê duyệt";
    }
}

