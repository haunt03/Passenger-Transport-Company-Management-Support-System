package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Trips;
import org.example.ptcmssbackend.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trips, Integer> {
    
    List<Trips> findByStatus(TripStatus status);
    
    @Query("SELECT t FROM Trips t WHERE t.status = :status ORDER BY t.endTime DESC")
    List<Trips> findByStatusOrderByEndTimeDesc(@Param("status") TripStatus status);
    
    // Methods needed by DispatchServiceImpl
    List<Trips> findByBooking_Id(Integer bookingId);
    
    List<Trips> findByBooking_Branch_IdAndStatusAndStartTimeBetween(
        Integer branchId, 
        TripStatus status, 
        Instant startTime, 
        Instant endTime
    );
    
    List<Trips> findByBooking_Branch_IdAndStartTimeBetween(
        Integer branchId,
        Instant startTime,
        Instant endTime
    );
    
    List<Trips> findByStatusAndStartTimeBetween(
        TripStatus status,
        Instant startTime,
        Instant endTime
    );


}
