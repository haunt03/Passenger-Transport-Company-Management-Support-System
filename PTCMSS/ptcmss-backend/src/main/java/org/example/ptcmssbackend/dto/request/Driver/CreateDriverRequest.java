package org.example.ptcmssbackend.dto.request.Driver;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "Yêu cầu tạo mới tài xế")
public class CreateDriverRequest {

    @Schema(description = "ID nhân viên liên kết (nếu đã có)", example = "12")
    private Integer employeeId;

    @Schema(description = "ID chi nhánh", example = "3")
    private Integer branchId;

    @Schema(description = "Số giấy phép lái xe", example = "B123456789")
    private String licenseNumber;

    @Schema(description = "Hạng giấy phép", example = "C")
    private String licenseClass;

    @Schema(description = "Ngày hết hạn giấy phép", example = "2026-05-30")
    private LocalDate licenseExpiry;

    @Schema(description = "Ngày khám sức khỏe gần nhất", example = "2025-10-15")
    private LocalDate healthCheckDate;

    @Schema(description = "Mức ưu tiên điều phối", example = "1")
    private Integer priorityLevel = 1;

    @Schema(description = "Ghi chú thêm")
    private String note;
}