package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Trips;
import org.example.ptcmssbackend.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trips, Integer> {
    List<Trips> findByStatusIn(List<TripStatus> statuses);
}