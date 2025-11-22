package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.response.GraphHopper.DistanceResult;
import org.example.ptcmssbackend.dto.response.GraphHopper.PlaceSuggestion;
import org.example.ptcmssbackend.dto.response.GraphHopper.RouteOption;

import java.util.List;

public interface GraphHopperService {

    /**
     * Autocomplete địa chỉ (Geocoding)
     */
    List<PlaceSuggestion> autocompletePlaces(String query);

    /**
     * Tính khoảng cách giữa 2 địa chỉ
     */
    DistanceResult calculateDistance(String from, String to);

    /**
     * Lấy nhiều tuyến đường thay thế
     */
    List<RouteOption> getAlternativeRoutes(String from, String to, Integer maxPaths);
}