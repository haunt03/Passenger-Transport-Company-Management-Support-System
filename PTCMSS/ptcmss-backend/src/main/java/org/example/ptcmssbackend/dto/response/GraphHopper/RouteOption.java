package org.example.ptcmssbackend.dto.response.GraphHopper;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteOption {
    private Double distanceKm;
    private Double durationMinutes;
    private String description;
    private List<RouteInstruction> instructions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RouteInstruction {
        private String text;
        private Double distance;
        private Integer time;
    }
}