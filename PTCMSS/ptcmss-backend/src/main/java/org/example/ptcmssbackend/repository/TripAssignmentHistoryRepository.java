package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.TripAssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripAssignmentHistoryRepository extends JpaRepository<TripAssignmentHistory, Integer> {

    List<TripAssignmentHistory> findByTrip_IdOrderByCreatedAtAsc(Integer tripId);
    List<TripAssignmentHistory> findByTrip_IdOrderByCreatedAtDesc(Integer tripId);
}