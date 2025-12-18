package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.BookingVehicleDetails;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface BookingVehicleDetailsRepository extends JpaRepository<BookingVehicleDetails, Integer> {

    // Lấy tất cả vehicle details của một booking
    @Query("SELECT bvd FROM BookingVehicleDetails bvd WHERE bvd.booking.id = :bookingId")
    List<BookingVehicleDetails> findByBookingId(@Param("bookingId") Integer bookingId);

    // Xóa tất cả vehicle details của một booking
    void deleteByBooking_Id(Integer bookingId);

    /**
     * Đếm tổng số lượng xe đã được "giữ chỗ" theo booking (booking_vehicle_details)
     * cho 1 chi nhánh + loại xe + khoảng thời gian, với các đơn:
     *  - thuộc các status cho trước (PENDING/CONFIRMED/INPROGRESS)
     *  - CHƯA được gán xe thực tế (không có TripVehicles nào cho booking đó)
     *
     * Dùng để trừ thêm vào availability, tránh case: đơn đã đặt cọc nhưng chưa gán xe
     * vẫn bị tính là còn xe rảnh.
     *
     * Lưu ý: Tính cả các đơn PENDING chưa có tiền cọc (> 0) vì đơn đã ở status PENDING
     * nghĩa là đã được "đặt cọc" và cần được giữ chỗ xe.
     */
    @Query("""
        SELECT COALESCE(SUM(bvd.quantity), 0)
        FROM BookingVehicleDetails bvd
        JOIN bvd.booking b
        JOIN Trips t ON t.booking.id = b.id
        WHERE b.branch.id = :branchId
          AND bvd.vehicleCategory.id = :categoryId
          AND b.status IN :statuses
          AND t.startTime < :endTime
          AND t.endTime > :startTime
          AND NOT EXISTS (
            SELECT tv.id FROM TripVehicles tv
            WHERE tv.trip.booking.id = b.id
          )
    """)
    Integer countReservedQuantityWithoutAssignedVehicles(
            @Param("branchId") Integer branchId,
            @Param("categoryId") Integer categoryId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime,
            @Param("statuses") List<BookingStatus> statuses
    );

    /**
     * Đếm tổng số lượng xe đã được "giữ chỗ" theo booking (booking_vehicle_details)
     * cho các đơn đã đặt cọc (có paidAmount > 0) nhưng CHƯA được gán xe thực tế.
     *
     * Dùng để trừ thêm vào availability, đảm bảo các đơn đã đặt cọc được giữ xe
     * bất kể status là gì (trừ CANCELLED).
     *
     * Logic: Tính tổng amount từ PaymentHistory có confirmationStatus = 'CONFIRMED'
     * cho booking đó, nếu tổng > 0 thì booking đó có deposit.
     */
    @Query("""
        SELECT COALESCE(SUM(bvd.quantity), 0)
        FROM BookingVehicleDetails bvd
        JOIN bvd.booking b
        JOIN Trips t ON t.booking.id = b.id
        WHERE b.branch.id = :branchId
          AND bvd.vehicleCategory.id = :categoryId
          AND b.status != 'CANCELLED'
          AND t.startTime < :endTime
          AND t.endTime > :startTime
          AND NOT EXISTS (
            SELECT tv.id FROM TripVehicles tv
            WHERE tv.trip.booking.id = b.id
          )
          AND (
            SELECT COALESCE(SUM(ph.amount), 0)
            FROM PaymentHistory ph
            JOIN Invoices inv ON ph.invoice.id = inv.id
            WHERE inv.booking.id = b.id
              AND ph.confirmationStatus = org.example.ptcmssbackend.enums.PaymentConfirmationStatus.CONFIRMED
          ) > 0
    """)
    Integer countReservedQuantityByDepositWithoutAssignedVehicles(
            @Param("branchId") Integer branchId,
            @Param("categoryId") Integer categoryId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime
    );
}

