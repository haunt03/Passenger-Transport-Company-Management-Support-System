package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Bookings;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Bookings, Integer> {

    // Tìm booking theo status
    List<Bookings> findByStatus(BookingStatus status);

    // Tìm booking theo consultant
    List<Bookings> findByConsultant_EmployeeId(Integer consultantId);

    // Tìm booking theo branch
    List<Bookings> findByBranch_Id(Integer branchId);

    // Tìm booking theo customer phone
    @Query("SELECT b FROM Bookings b WHERE b.customer.phone = :phone")
    List<Bookings> findByCustomerPhone(@Param("phone") String phone);
    // Tìm booking theo customer ID với phân trang
    @Query("SELECT b FROM Bookings b WHERE b.customer.id = :customerId ORDER BY b.createdAt DESC")
    Page<Bookings> findByCustomerId(@Param("customerId") Integer customerId, Pageable pageable);
    // Tìm booking theo customer ID (không phân trang)
    List<Bookings> findByCustomer_IdOrderByCreatedAtDesc(Integer customerId);

    // Tìm booking theo bookingId hoặc customer phone (search)
    @Query("SELECT b FROM Bookings b WHERE " +
            "CAST(b.id AS string) LIKE %:keyword% OR " +
            "b.customer.phone LIKE %:keyword% OR " +
            "b.customer.fullName LIKE %:keyword%")
    Page<Bookings> searchBookings(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Filter bookings với nhiều điều kiện.
     *
     * Ghi chú về filter ngày:
     * - Trước đây filter theo bookingDate (ngày tạo đơn), dẫn tới không đúng với kỳ vọng
     *   "lọc theo ngày khởi hành" ở các màn hình điều phối.
     * - Hiện tại, filter ngày dựa trên thời gian khởi hành của trips (Trips.startTime).
     *   + startDate  => tìm các booking có ít nhất 1 trip có startTime >= startDate
     *   + endDate    => tìm các booking có ít nhất 1 trip có startTime <= endDate
     * - Nếu một booking chưa có trip thì điều kiện ngày sẽ không áp dụng (booking đó
     *   chỉ xuất hiện khi không truyền startDate/endDate).
     */
    @Query("SELECT b FROM Bookings b WHERE " +
            "(:status IS NULL OR b.status = :status) AND " +
            "(:branchId IS NULL OR b.branch.id = :branchId) AND " +
            "(:consultantId IS NULL OR b.consultant.employeeId = :consultantId) AND " +
            "(:startDate IS NULL OR EXISTS (" +
            "   SELECT 1 FROM Trips t WHERE t.booking = b AND t.startTime >= :startDate" +
            ")) AND " +
            "(:endDate IS NULL OR EXISTS (" +
            "   SELECT 1 FROM Trips t2 WHERE t2.booking = b AND t2.startTime <= :endDate" +
            ")) AND " +
            "(:keyword IS NULL OR " +
            "  CAST(b.id AS string) LIKE %:keyword% OR " +
            "  b.customer.phone LIKE %:keyword% OR " +
            "  b.customer.fullName LIKE %:keyword%)")
    Page<Bookings> filterBookings(
            @Param("status") BookingStatus status,
            @Param("branchId") Integer branchId,
            @Param("consultantId") Integer consultantId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    // Lấy bookings theo status cho dashboard
    @Query("SELECT COUNT(b) FROM Bookings b WHERE b.status = :status " +
            "AND (:branchId IS NULL OR b.branch.id = :branchId) " +
            "AND (:consultantId IS NULL OR b.consultant.employeeId = :consultantId)")
    Long countByStatus(
            @Param("status") BookingStatus status,
            @Param("branchId") Integer branchId,
            @Param("consultantId") Integer consultantId
    );

    // Lấy bookings chờ báo giá (PENDING)
    @Query("SELECT b FROM Bookings b WHERE b.status = 'PENDING' " +
            "AND (:branchId IS NULL OR b.branch.id = :branchId) " +
            "AND (:consultantId IS NULL OR b.consultant.employeeId = :consultantId) " +
            "ORDER BY b.createdAt DESC")
    List<Bookings> findPendingBookings(
            @Param("branchId") Integer branchId,
            @Param("consultantId") Integer consultantId
    );

    // Lấy bookings đã gửi báo giá (CONFIRMED - khách đã đồng ý)
    @Query("SELECT b FROM Bookings b WHERE b.status = 'CONFIRMED' " +
            "AND (:branchId IS NULL OR b.branch.id = :branchId) " +
            "AND (:consultantId IS NULL OR b.consultant.employeeId = :consultantId) " +
            "ORDER BY b.createdAt DESC")
    List<Bookings> findConfirmedBookings(
            @Param("branchId") Integer branchId,
            @Param("consultantId") Integer consultantId
    );
}
