package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.TripIncidents;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripIncidentRepository extends JpaRepository<TripIncidents, Integer> {
    List<TripIncidents> findAllByDriver_Id(Integer driverId);
    List<TripIncidents> findAllByTrip_Id(Integer tripId);
}