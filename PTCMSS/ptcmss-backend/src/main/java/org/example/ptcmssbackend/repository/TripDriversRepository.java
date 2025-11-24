package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.TripDriverId;
import org.example.ptcmssbackend.entity.TripDrivers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TripDriversRepository extends JpaRepository<TripDrivers, TripDriverId> {
    
    List<TripDrivers> findByTrip_Id(Integer tripId);
    
    @Query("SELECT td FROM TripDrivers td WHERE td.trip.id = :tripId AND td.driverRole = 'Main Driver'")
    Optional<TripDrivers> findMainDriverByTripId(@Param("tripId") Integer tripId);
    
    List<TripDrivers> findByDriver_Id(Integer driverId);
}
