package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.TripVehicles;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TripVehicleRepository extends JpaRepository<TripVehicles, Integer> {

    /**
     * Lấy danh sách trips của một vehicle
     */
    @Query("SELECT tv FROM TripVehicles tv " +
            "JOIN FETCH tv.trip t " +
            "JOIN FETCH t.booking b " +
            "WHERE tv.vehicle.id = :vehicleId " +
            "ORDER BY t.startTime DESC")
    List<TripVehicles> findAllByVehicleId(@Param("vehicleId") Integer vehicleId);

    // Tìm TripVehicles theo tripId
    @Query("SELECT tv FROM TripVehicles tv JOIN FETCH tv.vehicle JOIN FETCH tv.trip WHERE tv.trip.id = :tripId")
    List<TripVehicles> findByTripId(@Param("tripId") Integer tripId);

    // Xóa mapping theo tripId (dọn sạch gán cũ)
    void deleteByTrip_Id(Integer tripId);

    // Xóa mapping cụ thể theo (tripId, vehicleId) để tránh trùng unique
    void deleteByTrip_IdAndVehicle_Id(Integer tripId, Integer vehicleId);

    // Kiểm tra tồn tại mapping (tripId, vehicleId)
    boolean existsByTrip_IdAndVehicle_Id(Integer tripId, Integer vehicleId);

    // Danh sách vehicleId đang bận trong khoảng thời gian (overlap) theo branch/category
    @Query("SELECT DISTINCT tv.vehicle.id FROM TripVehicles tv JOIN tv.trip t " +
            "WHERE (:branchId IS NULL OR tv.vehicle.branch.id = :branchId) " +
            "AND (:categoryId IS NULL OR tv.vehicle.category.id = :categoryId) " +
            "AND (t.status IN (org.example.ptcmssbackend.enums.TripStatus.SCHEDULED, org.example.ptcmssbackend.enums.TripStatus.ONGOING)) " +
            "AND (:start IS NULL OR t.endTime > :start) " +
            "AND (:end IS NULL OR t.startTime < :end)")
    List<Integer> findBusyVehicleIds(
            @Param("branchId") Integer branchId,
            @Param("categoryId") Integer categoryId,
            @Param("start") java.time.Instant start,
            @Param("end") java.time.Instant end
    );


    @Query("""
        SELECT tv FROM TripVehicles tv
        WHERE tv.vehicle.id = :vehicleId
    """)
    List<TripVehicles> findByVehicle(Integer vehicleId);


    // Lấy tất cả TripVehicles của 1 vehicle trong 1 khoảng thời gian để check trùng lịch
    @Query("""
           SELECT tv FROM TripVehicles tv
           WHERE tv.vehicle.id = :vehicleId
             AND tv.trip.startTime < :endTime
             AND tv.trip.endTime > :startTime
           """)
    List<TripVehicles> findOverlapsForVehicle(Integer vehicleId, Instant startTime, Instant endTime);
}

