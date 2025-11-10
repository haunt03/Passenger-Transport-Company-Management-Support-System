package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.TripDriverId;
import org.example.ptcmssbackend.entity.TripDrivers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripDriverRepository extends JpaRepository<TripDrivers, TripDriverId> {
    @Query("SELECT td FROM TripDrivers td JOIN FETCH td.trip WHERE td.driver.id = :driverId ORDER BY td.trip.startTime DESC")
    List<TripDrivers> findAllByDriverId(@Param("driverId") Integer driverId);
}