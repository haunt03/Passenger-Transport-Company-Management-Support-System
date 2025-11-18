package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.BookingVehicleDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingVehicleDetailsRepository extends JpaRepository<BookingVehicleDetails, Integer> {

    // Lấy tất cả vehicle details của một booking
    @Query("SELECT bvd FROM BookingVehicleDetails bvd WHERE bvd.booking.id = :bookingId")
    List<BookingVehicleDetails> findByBookingId(@Param("bookingId") Integer bookingId);

    // Xóa tất cả vehicle details của một booking
    void deleteByBooking_Id(Integer bookingId);
}
