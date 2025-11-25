package org.example.ptcmssbackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.DriverPerformanceResponse;
import org.example.ptcmssbackend.dto.RatingRequest;
import org.example.ptcmssbackend.dto.RatingResponse;
import org.example.ptcmssbackend.dto.TripForRatingResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.service.RatingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    @PostMapping
    public ResponseEntity<ResponseData<RatingResponse>> createRating(
            @RequestBody RatingRequest request,
            Authentication authentication) {
        try {
            Integer userId = getUserIdFromAuth(authentication);
            RatingResponse response = ratingService.createRating(request, userId);
            return ResponseEntity.ok(new ResponseData<>(200, "Rating created successfully", response));
        } catch (Exception e) {
            log.error("Error creating rating", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ResponseData<>(400, e.getMessage()));
        }
    }

    @GetMapping("/trip/{tripId}")
    public ResponseEntity<ResponseData<RatingResponse>> getRatingByTrip(@PathVariable Integer tripId) {
        try {
            RatingResponse response = ratingService.getRatingByTrip(tripId);
            if (response == null) {
                return ResponseEntity.ok(new ResponseData<>(200, "No rating found for this trip", null));
            }
            return ResponseEntity.ok(new ResponseData<>(200, "Success", response));
        } catch (Exception e) {
            log.error("Error getting rating for trip {}", tripId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseData<>(500, e.getMessage()));
        }
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<ResponseData<List<RatingResponse>>> getDriverRatings(
            @PathVariable Integer driverId,
            @RequestParam(required = false) Integer limit) {
        try {
            List<RatingResponse> ratings = ratingService.getDriverRatings(driverId, limit);
            return ResponseEntity.ok(new ResponseData<>(200, "Success", ratings));
        } catch (Exception e) {
            log.error("Error getting ratings for driver {}", driverId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseData<>(500, e.getMessage()));
        }
    }

    @GetMapping("/driver/{driverId}/performance")
    public ResponseEntity<ResponseData<DriverPerformanceResponse>> getDriverPerformance(
            @PathVariable Integer driverId,
            @RequestParam(defaultValue = "30") Integer days) {
        try {
            DriverPerformanceResponse performance = ratingService.getDriverPerformance(driverId, days);
            return ResponseEntity.ok(new ResponseData<>(200, "Success", performance));
        } catch (Exception e) {
            log.error("Error getting performance for driver {}", driverId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseData<>(500, e.getMessage()));
        }
    }

    @GetMapping("/trips/completed")
    public ResponseEntity<ResponseData<List<TripForRatingResponse>>> getCompletedTrips() {
        try {
            List<TripForRatingResponse> trips = ratingService.getCompletedTripsForRating();
            return ResponseEntity.ok(new ResponseData<>(200, "Success", trips));
        } catch (Exception e) {
            log.error("Error getting completed trips", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseData<>(500, e.getMessage()));
        }
    }

    private Integer getUserIdFromAuth(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
            String username = ((org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal()).getUsername();
            // Parse userId from username if needed, or implement proper user lookup
            try {
                return Integer.parseInt(username);
            } catch (NumberFormatException e) {
                return 1; // Default fallback
            }
        }
        return 1; // Default fallback
    }
}
