package org.example.ptcmssbackend.dto.response;

import lombok.Data;

@Data
public class RatingRequest {
    private Integer tripId;
    private Integer punctualityRating; // 1-5
    private Integer attitudeRating;    // 1-5
    private Integer safetyRating;      // 1-5
    private Integer complianceRating;  // 1-5
    private String comment;
}
