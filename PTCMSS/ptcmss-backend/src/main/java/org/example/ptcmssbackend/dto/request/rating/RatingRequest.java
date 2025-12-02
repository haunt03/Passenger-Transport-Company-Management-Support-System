package org.example.ptcmssbackend.dto.request.rating;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RatingRequest {

    @NotNull(message = "Trip ID is required")
    private Integer tripId;

    @NotNull(message = "Punctuality rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer punctualityRating; // Đúng giờ

    @NotNull(message = "Attitude rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer attitudeRating; // Thái độ

    @NotNull(message = "Safety rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer safetyRating; // An toàn

    @NotNull(message = "Compliance rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer complianceRating; // Tuân thủ quy trình

    @Size(max = 1000, message = "Comment must not exceed 1000 characters")
    private String comment;
}
