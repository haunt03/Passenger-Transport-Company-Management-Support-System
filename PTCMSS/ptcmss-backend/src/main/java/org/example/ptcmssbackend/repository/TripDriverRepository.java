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
    @Query("SELECT DISTINCT td FROM TripDrivers td JOIN FETCH td.trip WHERE td.driver.id = :driverId ORDER BY td.trip.startTime DESC")
    List<TripDrivers> findAllByDriverId(@Param("driverId") Integer driverId);

    @Query("SELECT DISTINCT td FROM TripDrivers td JOIN FETCH td.trip " +
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

    @Query("SELECT td FROM TripDrivers td WHERE td.driver.id = :driverId")
    List<TripDrivers> findByDriver(Integer driverId);


    // Kiểm tra driver có được gán vào trip cụ thể không
    boolean existsByTrip_IdAndDriver_Id(Integer tripId, Integer driverId);

    /**
     * Lấy danh sách TripDrivers theo tripId
     */
    List<TripDrivers> findByTrip_Id(Integer tripId);

    /**
     * Tìm các chuyến đi của tài xế trong khoảng thời gian (để kiểm tra conflict với nghỉ phép)
     */
    @Query("SELECT td FROM TripDrivers td JOIN FETCH td.trip t " +
           "WHERE td.driver.id = :driverId " +
           "AND t.startTime >= :startDate " +
           "AND t.startTime < :endDate " +
           "AND t.status NOT IN ('CANCELLED', 'COMPLETED') " +
           "ORDER BY t.startTime ASC")
    List<TripDrivers> findConflictingTrips(
            @Param("driverId") Integer driverId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);


    @Query("SELECT td FROM TripDrivers td WHERE td.trip.id = :tripId AND td.driverRole = 'Main Driver' ORDER BY td.id ASC")
    List<TripDrivers> findMainDriversByTripId(@Param("tripId") Integer tripId);

    @Query(value = "SELECT td.* FROM trip_drivers td WHERE td.trip_id = :tripId AND td.driver_role = 'Main Driver' ORDER BY td.id ASC LIMIT 1", nativeQuery = true)
    TripDrivers findFirstMainDriverByTripId(@Param("tripId") Integer tripId);

    List<TripDrivers> findByDriver_Id(Integer driverId);
}
