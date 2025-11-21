package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Trip.TripSearchRequest;
import org.example.ptcmssbackend.dto.request.dispatch.AssignRequest;
import org.example.ptcmssbackend.dto.response.Trip.TripDetailResponse;
import org.example.ptcmssbackend.dto.response.Trip.TripListItemResponse;
import org.example.ptcmssbackend.dto.response.dispatch.AssignRespone;
import org.example.ptcmssbackend.dto.response.dispatch.DispatchDashboardResponse;
import org.example.ptcmssbackend.dto.response.dispatch.PendingTripResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public interface DispatchService {

    List<PendingTripResponse> getPendingTrips(Integer branchId);

    List<PendingTripResponse> getPendingTrips(Integer branchId, Instant from, Instant to);

    DispatchDashboardResponse getDashboard(Integer branchId, LocalDate date);

    AssignRespone assign(AssignRequest request);

    void unassign(Integer tripId);

    AssignRespone reassign(AssignRequest request);

    void driverAcceptTrip(Integer tripId);

    TripDetailResponse getTripDetail(Integer tripId);

    List<TripListItemResponse> searchTrips(TripSearchRequest request);

}
