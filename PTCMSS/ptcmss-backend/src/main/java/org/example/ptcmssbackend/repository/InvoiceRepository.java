package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoices, Integer> {

    /**
     * Lấy danh sách expenses (chi phí) của một vehicle
     * Thông qua: Vehicle -> TripVehicles -> Trips -> Bookings -> Invoices
     * Hoặc: Vehicle -> TripVehicles -> Trips -> Invoices (nếu invoice có bookingId)
     * Lưu ý: Chỉ lấy invoices có bookingId và booking đó có trips được gán cho vehicle
     */
    @Query("SELECT i FROM Invoices i " +
            "WHERE i.type = :type " +
            "AND i.booking IS NOT NULL " +
            "AND i.booking.id IN (" +
            "  SELECT t.booking.id FROM TripVehicles tv " +
            "  JOIN tv.trip t " +
            "  WHERE tv.vehicle.id = :vehicleId" +
            ") " +
            "ORDER BY i.invoiceDate DESC")
    List<Invoices> findExpensesByVehicleId(@Param("vehicleId") Integer vehicleId, @Param("type") InvoiceType type);

    /**
     * Lấy danh sách expenses theo costType (fuel, toll, maintenance)
     */
    @Query("SELECT i FROM Invoices i " +
            "WHERE i.type = :type " +
            "AND i.costType = :costType " +
            "AND i.booking IS NOT NULL " +
            "AND i.booking.id IN (" +
            "  SELECT t.booking.id FROM TripVehicles tv " +
            "  JOIN tv.trip t " +
            "  WHERE tv.vehicle.id = :vehicleId" +
            ") " +
            "ORDER BY i.invoiceDate DESC")
    List<Invoices> findExpensesByVehicleIdAndCostType(
            @Param("vehicleId") Integer vehicleId,
            @Param("type") InvoiceType type,
            @Param("costType") String costType);

    /**
     * Tổng tiền đã thanh toán (INCOME, PAID) theo bookingId
     */
    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoices i " +
            "WHERE i.booking.id = :bookingId AND i.type = :type AND i.paymentStatus = :paymentStatus")
    BigDecimal sumPaidByBookingId(
            @Param("bookingId") Integer bookingId,
            @Param("type") InvoiceType type,
            @Param("paymentStatus") PaymentStatus paymentStatus
    );

    List<Invoices> findByBooking_IdOrderByCreatedAtDesc(Integer bookingId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoices i " +
            "WHERE i.booking.id = :bookingId AND i.type = :type AND i.paymentStatus = :paymentStatus")
    BigDecimal calculatePaidAmountByBookingId(
            @Param("bookingId") Integer bookingId,
            @Param("type") InvoiceType type,
            @Param("paymentStatus") PaymentStatus paymentStatus
    );
}

