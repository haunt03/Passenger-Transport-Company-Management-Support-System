package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.response.GraphHopper.DistanceResult;
import org.example.ptcmssbackend.dto.response.GraphHopper.PlaceSuggestion;
import org.example.ptcmssbackend.dto.response.GraphHopper.RouteOption;
import org.example.ptcmssbackend.service.GraphHopperService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GraphHopperServiceImpl implements GraphHopperService {

    @Value("${graphhopper.api-key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String GEOCODE_URL = "https://graphhopper.com/api/1/geocode";
    private static final String MATRIX_URL = "https://graphhopper.com/api/1/matrix";
    private static final String ROUTE_URL = "https://graphhopper.com/api/1/route";

    @Override
    public List<PlaceSuggestion> autocompletePlaces(String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromHttpUrl(GEOCODE_URL)
                .queryParam("q", query)
                .queryParam("locale", "en")
                .queryParam("limit", 10)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null || !response.containsKey("hits")) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> hits = (List<Map<String, Object>>) response.get("hits");

            return hits.stream().map(hit -> {
                Map<String, Object> point = (Map<String, Object>) hit.get("point");
                String name = (String) hit.getOrDefault("name", "");
                String street = (String) hit.getOrDefault("street", "");
                String city = (String) hit.getOrDefault("city", "");
                String state = (String) hit.getOrDefault("state", "");
                String country = (String) hit.getOrDefault("country", "");

                // Build full address
                StringBuilder fullAddress = new StringBuilder();
                if (!name.isEmpty()) fullAddress.append(name);
                if (!street.isEmpty()) {
                    if (fullAddress.length() > 0) fullAddress.append(", ");
                    fullAddress.append(street);
                }
                if (!city.isEmpty()) {
                    if (fullAddress.length() > 0) fullAddress.append(", ");
                    fullAddress.append(city);
                }
                if (!state.isEmpty()) {
                    if (fullAddress.length() > 0) fullAddress.append(", ");
                    fullAddress.append(state);
                }
                if (!country.isEmpty()) {
                    if (fullAddress.length() > 0) fullAddress.append(", ");
                    fullAddress.append(country);
                }

                return PlaceSuggestion.builder()
                        .description(name)
                        .fullAddress(fullAddress.toString())
                        .placeId(hit.getOrDefault("osm_id", "").toString())
                        .latitude(point != null ? ((Number) point.get("lat")).doubleValue() : null)
                        .longitude(point != null ? ((Number) point.get("lng")).doubleValue() : null)
                        .city(city)
                        .state(state)
                        .country(country)
                        .build();
            }).collect(Collectors.toList());

        } catch (Exception e) {
            log.error("GraphHopper geocoding error for query: {}", query, e);
            return Collections.emptyList();
        }
    }

    @Override
    public DistanceResult calculateDistance(String from, String to) {
        // Step 1: Geocode addresses
        List<PlaceSuggestion> fromResults = autocompletePlaces(from);
        List<PlaceSuggestion> toResults = autocompletePlaces(to);

        if (fromResults.isEmpty()) {
            throw new RuntimeException("Không tìm thấy địa chỉ điểm đi: " + from);
        }
        if (toResults.isEmpty()) {
            throw new RuntimeException("Không tìm thấy địa chỉ điểm đến: " + to);
        }

        PlaceSuggestion fromPlace = fromResults.get(0);
        PlaceSuggestion toPlace = toResults.get(0);

        // Step 2: Calculate distance using Routing API for accurate road distance
        Map<String, Object> requestBody = Map.of(
                "points", List.of(
                        List.of(fromPlace.getLongitude(), fromPlace.getLatitude()), // [lon, lat]
                        List.of(toPlace.getLongitude(), toPlace.getLatitude())
                ),
                "profile", "car",
                "instructions", false,
                "calc_points", false
        );

        String url = ROUTE_URL + "?key=" + apiKey;

        try {
            Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
            if (response == null || !response.containsKey("paths")) {
                throw new RuntimeException("GraphHopper Routing API returned null or no paths");
            }

            List<Map<String, Object>> paths = (List<Map<String, Object>>) response.get("paths");
            if (paths == null || paths.isEmpty()) {
                throw new RuntimeException("No route found between the two addresses");
            }

            // Get the first (best) route
            Map<String, Object> firstPath = paths.get(0);
            double distanceMeters = ((Number) firstPath.get("distance")).doubleValue();
            long timeMillis = ((Number) firstPath.get("time")).longValue();

            return DistanceResult.builder()
                    .distanceKm(distanceMeters / 1000.0)
                    .durationMinutes(timeMillis / 60000.0)
                    .from(fromPlace.getFullAddress())
                    .to(toPlace.getFullAddress())
                    .build();

        } catch (Exception e) {
            log.error("GraphHopper distance calculation error", e);
            throw new RuntimeException("Lỗi khi tính khoảng cách: " + e.getMessage());
        }
    }

    @Override
    public List<RouteOption> getAlternativeRoutes(String from, String to, Integer maxPaths) {
        if (maxPaths == null || maxPaths < 1) {
            maxPaths = 3;
        }

        // Step 1: Geocode
        List<PlaceSuggestion> fromResults = autocompletePlaces(from);
        List<PlaceSuggestion> toResults = autocompletePlaces(to);

        if (fromResults.isEmpty() || toResults.isEmpty()) {
            throw new RuntimeException("Không tìm thấy địa chỉ");
        }

        PlaceSuggestion fromPlace = fromResults.get(0);
        PlaceSuggestion toPlace = toResults.get(0);

        // Step 2: Get alternative routes
        Map<String, Object> requestBody = Map.of(
                "points", List.of(
                        List.of(fromPlace.getLongitude(), fromPlace.getLatitude()),
                        List.of(toPlace.getLongitude(), toPlace.getLatitude())
                ),
                "profile", "car",
                "algorithm", "alternative_route",
                "alternative_route.max_paths", maxPaths,
                "ch.disable", true,
                "instructions", true,
                "locale", "vi"
        );

        String url = ROUTE_URL + "?key=" + apiKey;

        try {
            Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
            if (response == null || !response.containsKey("paths")) {
                throw new RuntimeException("No routes returned");
            }

            List<Map<String, Object>> paths = (List<Map<String, Object>>) response.get("paths");

            return paths.stream().map(path -> {
                double distanceMeters = ((Number) path.get("distance")).doubleValue();
                long timeMillis = ((Number) path.get("time")).longValue();

                List<Map<String, Object>> instructions = (List<Map<String, Object>>) path.get("instructions");
                List<RouteOption.RouteInstruction> routeInstructions = instructions != null
                        ? instructions.stream().map(inst -> RouteOption.RouteInstruction.builder()
                                .text((String) inst.get("text"))
                                .distance(((Number) inst.getOrDefault("distance", 0)).doubleValue())
                                .time(((Number) inst.getOrDefault("time", 0)).intValue())
                                .build())
                        .collect(Collectors.toList())
                        : Collections.emptyList();

                return RouteOption.builder()
                        .distanceKm(distanceMeters / 1000.0)
                        .durationMinutes(timeMillis / 60000.0)
                        .description(generateRouteDescription(distanceMeters, timeMillis))
                        .instructions(routeInstructions)
                        .build();
            }).collect(Collectors.toList());

        } catch (Exception e) {
            log.error("GraphHopper alternative routes error", e);
            throw new RuntimeException("Lỗi khi tìm tuyến đường: " + e.getMessage());
        }
    }

    private String generateRouteDescription(double distanceMeters, long timeMillis) {
        double distanceKm = distanceMeters / 1000.0;
        double durationMin = timeMillis / 60000.0;

        if (durationMin < 30) {
            return "Tuyến nhanh nhất";
        } else if (distanceKm < 20) {
            return "Tuyến ngắn nhất";
        } else {
            return "Tuyến thay thế";
        }
    }
}