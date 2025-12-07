package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

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
    
    /**
     * Tính tổng tiền đã thu (CONFIRMED) từ payment_history cho booking
     */
    @Query("SELECT COALESCE(SUM(ph.amount), 0) FROM PaymentHistory ph " +
            "JOIN ph.invoice i " +
            "WHERE i.booking.id = :bookingId " +
            "AND ph.confirmationStatus = org.example.ptcmssbackend.enums.PaymentConfirmationStatus.CONFIRMED")
    BigDecimal calculateConfirmedPaidAmountByBookingId(@Param("bookingId") Integer bookingId);
    
    /**
     * Tính tổng tiền đã thu (CONFIRMED payments) cho một consultant trong khoảng thời gian,
     * có thể lọc theo chi nhánh (branchId).
     *
     * Bao gồm cả tiền cọc và thanh toán còn lại, miễn là payment đã được kế toán xác nhận.
     */
    @Query("SELECT COALESCE(SUM(ph.amount), 0) FROM PaymentHistory ph " +
            "JOIN ph.invoice i " +
            "LEFT JOIN i.booking b " +
            "LEFT JOIN b.consultant c " +
            "WHERE ph.confirmationStatus = org.example.ptcmssbackend.enums.PaymentConfirmationStatus.CONFIRMED " +
            "AND ph.paymentDate >= :startDate " +
            "AND ph.paymentDate <= :endDate " +
            "AND (:branchId IS NULL OR i.branch.id = :branchId) " +
            "AND (:consultantEmployeeId IS NULL OR c.employeeId = :consultantEmployeeId)")
    BigDecimal sumConfirmedPaymentsForConsultantAndBranchAndDateRange(
            @Param("branchId") Integer branchId,
            @Param("consultantEmployeeId") Integer consultantEmployeeId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );
    
    /**
     * Tính tổng amount theo branchId, type và khoảng thời gian
     */
    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoices i " +
            "WHERE (:branchId IS NULL OR i.branch.id = :branchId) " +
            "AND i.type = :type " +
            "AND i.invoiceDate >= :startDate " +
            "AND i.invoiceDate <= :endDate")
    BigDecimal sumAmountByBranchAndTypeAndDateRange(
            @Param("branchId") Integer branchId,
            @Param("type") InvoiceType type,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );
    
    /**
     * Tính tổng chi phí của một trip
     * (Lấy tất cả expense invoices liên quan đến booking của trip đó)
     */
    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoices i " +
            "JOIN Trips t ON t.booking.id = i.booking.id " +
            "WHERE i.type = 'EXPENSE' " +
            "AND t.id = :tripId")
    BigDecimal sumExpensesByTrip(@Param("tripId") Integer tripId);
    
    // Module 6: Additional queries
    Optional<Invoices> findByInvoiceNumber(String invoiceNumber);
    
    List<Invoices> findByBranch_IdAndTypeAndStatusOrderByInvoiceDateDesc(
            Integer branchId, InvoiceType type, InvoiceStatus status);
    
    @Query("SELECT DISTINCT i FROM Invoices i " +
            "JOIN FETCH i.branch " +
            "LEFT JOIN FETCH i.customer " +
            "LEFT JOIN FETCH i.booking " +
            "WHERE (:branchId IS NULL OR i.branch.id = :branchId) " +
            "AND (:type IS NULL OR i.type = :type) " +
            "AND (:status IS NULL OR i.status = :status) " +
            "AND (:startDate IS NULL OR i.invoiceDate >= :startDate) " +
            "AND (:endDate IS NULL OR i.invoiceDate <= :endDate) " +
            "AND (:customerId IS NULL OR i.customer.id = :customerId) " +
            "AND (:paymentStatus IS NULL OR i.paymentStatus = :paymentStatus) " +
            "ORDER BY i.invoiceDate DESC")
    List<Invoices> findInvoicesWithFilters(
            @Param("branchId") Integer branchId,
            @Param("type") InvoiceType type,
            @Param("status") InvoiceStatus status,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate,
            @Param("customerId") Integer customerId,
            @Param("paymentStatus") PaymentStatus paymentStatus);
    
    @Query("SELECT i FROM Invoices i WHERE i.type = 'INCOME' " +
            "AND i.paymentStatus IN ('UNPAID', 'OVERDUE') " +
            "AND (:branchId IS NULL OR i.branch.id = :branchId) " +
            "ORDER BY " +
            "CASE WHEN i.paymentStatus = 'OVERDUE' THEN 0 ELSE 1 END, " +
            "i.dueDate ASC")
    List<Invoices> findUnpaidInvoices(@Param("branchId") Integer branchId);
    
    @Query("SELECT i FROM Invoices i WHERE i.type = 'INCOME' " +
            "AND i.paymentStatus = 'OVERDUE' " +
            "AND (:branchId IS NULL OR i.branch.id = :branchId)")
    List<Invoices> findOverdueInvoices(@Param("branchId") Integer branchId);
    
    @Query("SELECT i FROM Invoices i WHERE i.type = 'INCOME' " +
            "AND i.paymentStatus = 'UNPAID' " +
            "AND i.dueDate BETWEEN :startDate AND :endDate " +
            "AND (:branchId IS NULL OR i.branch.id = :branchId)")
    List<Invoices> findInvoicesDueInRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("branchId") Integer branchId);
    
    @Query("SELECT i FROM Invoices i WHERE i.type = 'INCOME' " +
            "AND i.status = 'ACTIVE' " +
            "AND i.paymentStatus = 'UNPAID' " +
            "AND i.dueDate < :asOfDate " +
            "AND (:branchId IS NULL OR i.branch.id = :branchId)")
    List<Invoices> findUnpaidInvoicesBeforeDate(
            @Param("asOfDate") LocalDate asOfDate,
            @Param("branchId") Integer branchId);
    
    @Query("SELECT MAX(CAST(SUBSTRING(i.invoiceNumber, LENGTH(i.invoiceNumber) - 3) AS INTEGER)) " +
            "FROM Invoices i WHERE i.branch.id = :branchId " +
            "AND i.invoiceNumber LIKE :pattern")
    Integer findMaxSequenceNumber(
            @Param("branchId") Integer branchId,
            @Param("pattern") String pattern);
    
    /**
     * Tìm invoices chưa thanh toán đủ mà trip đã hoàn thành quá 48h
     * Logic: invoice có booking, booking có trip COMPLETED, trip.endTime + 48h < now
     */
    @Query("SELECT DISTINCT i FROM Invoices i " +
            "JOIN i.booking b " +
            "JOIN Trips t ON t.booking.id = b.id " +
            "WHERE i.type = org.example.ptcmssbackend.enums.InvoiceType.INCOME " +
            "AND i.status = org.example.ptcmssbackend.enums.InvoiceStatus.ACTIVE " +
            "AND i.paymentStatus = org.example.ptcmssbackend.enums.PaymentStatus.UNPAID " +
            "AND t.status = org.example.ptcmssbackend.enums.TripStatus.COMPLETED " +
            "AND t.endTime IS NOT NULL " +
            "AND t.endTime < :cutoffTime " +
            "AND (:branchId IS NULL OR i.branch.id = :branchId)")
    List<Invoices> findUnpaidInvoicesWithCompletedTripsOlderThan(
            @Param("cutoffTime") Instant cutoffTime,
            @Param("branchId") Integer branchId);
}

