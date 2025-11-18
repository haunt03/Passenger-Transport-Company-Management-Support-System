package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.TripDriverId;
import org.example.ptcmssbackend.entity.TripDrivers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TripDriverRepository extends JpaRepository<TripDrivers, TripDriverId> {
    @Query("SELECT td FROM TripDrivers td JOIN FETCH td.trip WHERE td.driver.id = :driverId ORDER BY td.trip.startTime DESC")
    List<TripDrivers> findAllByDriverId(@Param("driverId") Integer driverId);

    @Query("SELECT td FROM TripDrivers td JOIN FETCH td.trip " +
            "WHERE td.driver.id = :driverId " +
            "AND (:startDate IS NULL OR td.trip.startTime >= :startDate) " +
            "AND (:endDate IS NULL OR td.trip.startTime <= :endDate) " +
            "ORDER BY td.trip.startTime DESC")
    List<TripDrivers> findAllByDriverIdAndDateRange(
            @Param("driverId") Integer driverId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    // Tìm TripDrivers theo tripId
    @Query("SELECT td FROM TripDrivers td JOIN FETCH td.driver JOIN FETCH td.trip WHERE td.trip.id = :tripId")
    List<TripDrivers> findByTripId(@Param("tripId") Integer tripId);

    // Xóa mapping theo tripId (dọn sạch gán tài xế trước khi xóa Trips)
    void deleteByTrip_Id(Integer tripId);

    @Query("""
        SELECT td FROM TripDrivers td
        WHERE td.driver.id = :driverId
    """)
    List<TripDrivers> findByDriver(Integer driverId);


    // Kiểm tra driver có được gán vào trip cụ thể không
    boolean existsByTrip_IdAndDriver_Id(Integer tripId, Integer driverId);
}