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
    private String driverPhone;
    private String driverEmail;
    private String driverLicenseNumber;
    private String driverBranchName;
    private String description;
    private String severity;
    private Boolean resolved;
    private Instant createdAt;
    private String resolutionAction;
    private String resolutionNote;
    private Integer resolvedBy;
    private String resolvedByName;
    private Instant resolvedAt;

    public TripIncidentResponse(TripIncidents entity) {
        this.id = entity.getId();
        this.tripId = entity.getTrip().getId();
        this.driverId = entity.getDriver().getId();
        
        // Driver information
        var driver = entity.getDriver();
        var user = driver.getEmployee().getUser();
        this.driverName = user.getFullName();
        this.driverPhone = user.getPhone();
        this.driverEmail = user.getEmail();
        this.driverLicenseNumber = driver.getLicenseNumber();
        this.driverBranchName = driver.getBranch() != null ? driver.getBranch().getBranchName() : null;
        
        this.description = entity.getDescription();
        this.severity = entity.getSeverity();
        this.resolved = entity.getResolved();
        this.createdAt = entity.getCreatedAt();
        this.resolutionAction = entity.getResolutionAction() != null ? entity.getResolutionAction().name() : null;
        this.resolutionNote = entity.getResolutionNote();
        this.resolvedBy = entity.getResolvedBy() != null ? entity.getResolvedBy().getId() : null;
        this.resolvedByName = entity.getResolvedBy() != null ? entity.getResolvedBy().getFullName() : null;
        this.resolvedAt = entity.getResolvedAt();
    }
}

