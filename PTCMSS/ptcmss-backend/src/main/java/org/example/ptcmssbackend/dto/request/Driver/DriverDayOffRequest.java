package org.example.ptcmssbackend.dto.request.Driver;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "Request gửi yêu cầu nghỉ phép cho tài xế")
public class DriverDayOffRequest {

    @Schema(description = "Ngày bắt đầu nghỉ", example = "2025-11-05")
    private LocalDate startDate;

    @Schema(description = "Ngày kết thúc nghỉ", example = "2025-11-07")
    private LocalDate endDate;

    @Schema(description = "Lý do nghỉ phép", example = "Nghỉ ốm, có giấy xác nhận bác sĩ")
    private String reason;
}
