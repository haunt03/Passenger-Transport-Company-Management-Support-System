package org.example.ptcmssbackend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.example.ptcmssbackend.entity.TripIncidents;

@Data
@Schema(description = "Request để xử lý sự cố chuyến đi")
public class ResolveIncidentRequest {

    @NotNull(message = "Hành động xử lý không được để trống")
    @Schema(description = "Loại hành động đã thực hiện", required = true)
    private TripIncidents.ResolutionAction resolutionAction;

    @Schema(description = "Ghi chú giải pháp đã áp dụng")
    private String resolutionNote;
}

