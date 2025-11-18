package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Trips;
import org.example.ptcmssbackend.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trips, Integer> {
    List<Trips> findByStatusIn(List<TripStatus> statuses);

    // Tìm trips theo bookingId
    List<Trips> findByBooking_Id(Integer bookingId);


    // Lấy các chuyến thuộc chi nhánh đang chờ gán
    // Lấy chuyến chờ gán theo chi nhánh
    @Query("""
    SELECT t FROM Trips t
    WHERE t.booking.branch.id = :branchId
    AND t.status = 'SCHEDULED'
""")
    List<Trips> findPendingTrips(Integer branchId);



    // Dùng cho Pending Queue: chi nhánh + status + khoảng thời gian
    List<Trips> findByBooking_Branch_IdAndStatusAndStartTimeBetween(
            Integer branchId,
            TripStatus status,
            Instant startTime,
            Instant endTime
    );
}