package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.DriverPerformanceResponse;
import org.example.ptcmssbackend.dto.RatingRequest;
import org.example.ptcmssbackend.dto.RatingResponse;
import org.example.ptcmssbackend.dto.TripForRatingResponse;

import java.util.List;

public interface RatingService {
    RatingResponse createRating(RatingRequest request, Integer userId);
    RatingResponse getRatingByTrip(Integer tripId);
    List<RatingResponse> getDriverRatings(Integer driverId, Integer limit);
    DriverPerformanceResponse getDriverPerformance(Integer driverId, Integer days);
    List<TripForRatingResponse> getCompletedTripsForRating(Integer branchId);
}
