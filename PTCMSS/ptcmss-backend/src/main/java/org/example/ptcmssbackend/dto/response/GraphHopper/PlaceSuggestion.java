package org.example.ptcmssbackend.dto.response.GraphHopper;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceSuggestion {
    private String description;      // Tên địa điểm chính
    private String fullAddress;      // Địa chỉ đầy đủ
    private String placeId;          // OSM ID
    private Double latitude;
    private Double longitude;
    private String city;
    private String state;
    private String country;
}