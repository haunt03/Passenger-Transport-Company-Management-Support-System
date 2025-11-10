package org.example.ptcmssbackend.dto.request.Driver;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Thông tin sự cố do tài xế báo cáo")
public class ReportIncidentRequest {

    @Schema(description = "ID chuyến đi", example = "15")
    private Integer tripId;

    @Schema(description = "ID tài xế", example = "7")
    private Integer driverId;

    @Schema(description = "Mức độ nghiêm trọng", example = "CRITICAL")
    private String severity;

    @Schema(description = "Mô tả sự cố", example = "Xe bị hỏng lốp trên đường cao tốc, đang chờ hỗ trợ.")
    private String description;
}