package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Booking.CreateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.request.Booking.UpdateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.AssignRequest;
import org.example.ptcmssbackend.dto.request.Booking.CheckAvailabilityRequest;
import org.example.ptcmssbackend.dto.response.Booking.BookingListResponse;
import org.example.ptcmssbackend.dto.response.Booking.BookingResponse;
import org.example.ptcmssbackend.dto.response.Booking.CheckAvailabilityResponse;
import org.example.ptcmssbackend.dto.response.Booking.ConsultantDashboardResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;

import java.time.Instant;
import java.util.List;

public interface BookingService {
    /**
     * Tạo booking mới
     */
    BookingResponse create(CreateBookingRequest request, Integer consultantEmployeeId);

    /**
     * Cập nhật booking
     */
    BookingResponse update(Integer bookingId, UpdateBookingRequest request);

    /**
     * Lấy booking theo ID
     */
    BookingResponse getById(Integer bookingId);

    /**
     * Lấy danh sách bookings với filter và pagination
     */
    PageResponse<?> getAll(
            String status,
            Integer branchId,
            Integer consultantId,
            Instant startDate,
            Instant endDate,
            String keyword,
            int page,
            int size,
            String sortBy
    );

    /**
     * Xóa booking (soft delete - chuyển status sang CANCELLED)
     */
    void delete(Integer bookingId);

    /**
     * Tính giá tự động cho booking
     * @param vehicleCategoryIds Danh sách ID loại xe
     * @param quantities Danh sách số lượng tương ứng
     * @param distance Khoảng cách (km)
     * @param useHighway Có đi cao tốc không
     * @return Giá ước tính
     */
    java.math.BigDecimal calculatePrice(
            List<Integer> vehicleCategoryIds,
            List<Integer> quantities,
            Double distance,
            Boolean useHighway
    );

    /**
     * Lấy dashboard cho consultant
     */
    ConsultantDashboardResponse getConsultantDashboard(Integer consultantEmployeeId, Integer branchId);

    /**
     * Lấy danh sách bookings đơn giản (cho list view)
     */
    List<BookingListResponse> getBookingList(
            String status,
            Integer branchId,
            Integer consultantId
    );

    /**
     * Ghi nhận thanh toán/đặt cọc cho booking
     */
    BookingResponse addPayment(Integer bookingId, CreatePaymentRequest request, Integer employeeId);

    /** Assign driver/vehicle for booking trips */
    BookingResponse assign(Integer bookingId, AssignRequest request);

    /** Kiểm tra khả dụng xe theo branch/category/thời gian */
    CheckAvailabilityResponse checkAvailability(CheckAvailabilityRequest request);
}
