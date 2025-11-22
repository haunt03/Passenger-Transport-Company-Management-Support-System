package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.dto.response.GraphHopper.DistanceResult;
import org.example.ptcmssbackend.dto.response.GraphHopper.PlaceSuggestion;
import org.example.ptcmssbackend.dto.response.GraphHopper.RouteOption;
import org.example.ptcmssbackend.service.GraphHopperService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/graphhopper")
@RequiredArgsConstructor
@Tag(name = "GraphHopper", description = "GraphHopper Maps API for geocoding and routing")
public class GraphHopperController {

    private final GraphHopperService graphHopperService;

    @GetMapping("/autocomplete")
    @Operation(summary = "Autocomplete địa chỉ", description = "Tìm kiếm địa chỉ theo từ khóa sử dụng GraphHopper Geocoding API")
    public ResponseEntity<ApiResponse<List<PlaceSuggestion>>> autocompletePlaces(
            @RequestParam String query
    ) {
        try {
            List<PlaceSuggestion> suggestions = graphHopperService.autocompletePlaces(query);
            return ResponseEntity.ok(ApiResponse.<List<PlaceSuggestion>>builder()
                    .success(true)
                    .message("Autocomplete suggestions retrieved")
                    .data(suggestions)
                    .build());
        } catch (Exception e) {
            log.error("Autocomplete error", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.<List<PlaceSuggestion>>builder()
                            .success(false)
                            .message("Error: " + e.getMessage())
                            .data(null)
                            .build());
        }
    }

    @GetMapping("/distance")
    @Operation(summary = "Tính khoảng cách", description = "Tính khoảng cách và thời gian giữa 2 địa chỉ")
    public ResponseEntity<ApiResponse<DistanceResult>> calculateDistance(
            @RequestParam String from,
            @RequestParam String to
    ) {
        try {
            DistanceResult result = graphHopperService.calculateDistance(from, to);
            return ResponseEntity.ok(ApiResponse.<DistanceResult>builder()
                    .success(true)
                    .message("Distance calculated successfully")
                    .data(result)
                    .build());
        } catch (Exception e) {
            log.error("Distance calculation error", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.<DistanceResult>builder()
                            .success(false)
                            .message("Error: " + e.getMessage())
                            .data(null)
                            .build());
        }
    }

    @GetMapping("/routes")
    @Operation(summary = "Lấy các tuyến đường thay thế", description = "Lấy nhiều tuyến đường khác nhau giữa 2 địa chỉ để khách chọn")
    public ResponseEntity<ApiResponse<List<RouteOption>>> getAlternativeRoutes(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(defaultValue = "3") Integer maxPaths
    ) {
        try {
            List<RouteOption> routes = graphHopperService.getAlternativeRoutes(from, to, maxPaths);
            return ResponseEntity.ok(ApiResponse.<List<RouteOption>>builder()
                    .success(true)
                    .message("Alternative routes retrieved")
                    .data(routes)
                    .build());
        } catch (Exception e) {
            log.error("Alternative routes error", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.<List<RouteOption>>builder()
                            .success(false)
                            .message("Error: " + e.getMessage())
                            .data(null)
                            .build());
        }
    }
}