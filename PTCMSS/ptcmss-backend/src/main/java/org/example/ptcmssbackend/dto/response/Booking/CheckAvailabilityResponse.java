package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CheckAvailabilityResponse {
    private boolean ok;
    private int availableCount;
    private int needed;
    private int totalCandidates;
    private int busyCount;
}
