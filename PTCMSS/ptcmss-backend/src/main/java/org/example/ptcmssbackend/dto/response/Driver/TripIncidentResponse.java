package org.example.ptcmssbackend.dto.response.Driver;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.entity.TripIncidents;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Phản hồi thông tin sự cố của chuyến đi")
public class TripIncidentResponse {

    private Integer id;
    private Integer tripId;
    private Integer driverId;
    private String driverName;
    private String description;
    private String severity;
    private Boolean resolved;
    private Instant createdAt;

    public TripIncidentResponse(TripIncidents entity) {
        this.id = entity.getId();
        this.tripId = entity.getTrip().getId();
        this.driverId = entity.getDriver().getId();
        this.driverName = entity.getDriver().getEmployee().getUser().getFullName();
        this.description = entity.getDescription();
        this.severity = entity.getSeverity();
        this.resolved = entity.getResolved();
        this.createdAt = entity.getCreatedAt();
    }
}