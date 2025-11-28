package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Booking.CreateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.request.Booking.TripRequest;
import org.example.ptcmssbackend.dto.request.Booking.UpdateBookingRequest;
import org.example.ptcmssbackend.dto.request.Booking.VehicleDetailRequest;
import org.example.ptcmssbackend.dto.request.Booking.AssignRequest;
import org.example.ptcmssbackend.dto.request.Booking.CheckAvailabilityRequest;
import org.example.ptcmssbackend.dto.response.Booking.*;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.*;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.BookingService;
import org.example.ptcmssbackend.service.CustomerService;
import org.example.ptcmssbackend.service.SystemSettingService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final CustomerService customerService;
    private final BranchesRepository branchesRepository;
    private final EmployeeRepository employeeRepository;
    private final HireTypesRepository hireTypesRepository;
    private final VehicleCategoryPricingRepository vehicleCategoryRepository;
    private final TripRepository tripRepository;
    private final BookingVehicleDetailsRepository bookingVehicleDetailsRepository;
    private final TripDriverRepository tripDriverRepository;
    private final SystemSettingService systemSettingService;
    private final TripVehicleRepository tripVehicleRepository;
    private final InvoiceRepository invoiceRepository;
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;
    private final org.example.ptcmssbackend.service.WebSocketNotificationService webSocketNotificationService;

    @Override
    @Transactional
    public BookingResponse create(CreateBookingRequest request, Integer consultantEmployeeId) {
        log.info("[BookingService] Creating new booking for consultant: {}", consultantEmployeeId);

        // 1. Tìm hoặc tạo customer
        Customers customer = customerService.findOrCreateCustomer(
                request.getCustomer(),
                consultantEmployeeId != null ? consultantEmployeeId : null
        );

        // 2. Load các entity cần thiết
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found: " + request.getBranchId()));

        Employees consultant = consultantEmployeeId != null
                ? employeeRepository.findById(consultantEmployeeId).orElse(null)
                : null;

        HireTypes hireType = request.getHireTypeId() != null
                ? hireTypesRepository.findById(request.getHireTypeId()).orElse(null)
                : null;

        // 3. Tính giá tự động nếu chưa có
        BigDecimal estimatedCost = request.getEstimatedCost();
        if (estimatedCost == null && request.getDistance() != null) {
            List<Integer> categoryIds = request.getVehicles().stream()
                    .map(VehicleDetailRequest::getVehicleCategoryId)
                    .collect(Collectors.toList());
            List<Integer> quantities = request.getVehicles().stream()
                    .map(VehicleDetailRequest::getQuantity)
                    .collect(Collectors.toList());
            Integer additionalPoints = (request.getAdditionalPickupPoints() != null ? request.getAdditionalPickupPoints() : 0) +
                    (request.getAdditionalDropoffPoints() != null ? request.getAdditionalDropoffPoints() : 0);

            // Lấy startTime và endTime từ trips để check chuyến trong ngày
            Instant startTime = null;
            Instant endTime = null;
            if (request.getTrips() != null && !request.getTrips().isEmpty()) {
                TripRequest firstTrip = request.getTrips().get(0);
                startTime = firstTrip.getStartTime();
                endTime = firstTrip.getEndTime();
            }

            estimatedCost = calculatePrice(
                    categoryIds,
                    quantities,
                    request.getDistance(),
                    request.getUseHighway(),
                    request.getHireTypeId(),
                    request.getIsHoliday(),
                    request.getIsWeekend(),
                    additionalPoints,
                    startTime,
                    endTime
            );
        }

        // 4. Tính totalCost (estimatedCost - discountAmount)
        BigDecimal discountAmount = request.getDiscountAmount() != null
                ? request.getDiscountAmount()
                : BigDecimal.ZERO;
        BigDecimal totalCost = estimatedCost != null
                ? estimatedCost.subtract(discountAmount)
                : BigDecimal.ZERO;

        // 5. Tạo booking
        Bookings booking = new Bookings();
        booking.setCustomer(customer);
        booking.setBranch(branch);
        booking.setConsultant(consultant);
        booking.setHireType(hireType);
        booking.setUseHighway(request.getUseHighway() != null ? request.getUseHighway() : false);
        booking.setEstimatedCost(estimatedCost);
        booking.setTotalCost(totalCost);

        // Tính tiền cọc tự động nếu chưa có
        BigDecimal depositAmount = request.getDepositAmount();
        if (depositAmount == null && totalCost.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal defaultDepositPercent = getSystemSettingDecimal("DEFAULT_DEPOSIT_PERCENT", new BigDecimal("0.50"));
            depositAmount = totalCost.multiply(defaultDepositPercent).setScale(2, RoundingMode.HALF_UP);
        }
        booking.setDepositAmount(depositAmount != null ? depositAmount : BigDecimal.ZERO);

        booking.setStatus(parseBookingStatus(request.getStatus()));
        booking.setNote(request.getNote());

        // Lưu các field mới
        if (request.getIsHoliday() != null) {
            booking.setIsHoliday(request.getIsHoliday());
        }
        if (request.getIsWeekend() != null) {
            booking.setIsWeekend(request.getIsWeekend());
        }
        if (request.getAdditionalPickupPoints() != null) {
            booking.setAdditionalPickupPoints(request.getAdditionalPickupPoints());
        }
        if (request.getAdditionalDropoffPoints() != null) {
            booking.setAdditionalDropoffPoints(request.getAdditionalDropoffPoints());
        }

        booking = bookingRepository.save(booking);
        log.info("[BookingService] Created booking: {}", booking.getId());

        // Send WebSocket notification for new booking
        try {
            String customerName = customer.getFullName() != null ? customer.getFullName() : "Khách hàng";
            String bookingCode = "ORD-" + booking.getId();

            webSocketNotificationService.sendGlobalNotification(
                    "Đơn hàng mới",
                    String.format("Đơn %s - %s (%.0f km)",
                            bookingCode,
                            customerName,
                            request.getDistance() != null ? request.getDistance() : 0),
                    "INFO"
            );

            webSocketNotificationService.sendBookingUpdate(
                    booking.getId(),
                    "CREATED",
                    String.format("Đơn hàng %s đã được tạo thành công", bookingCode)
            );
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification for new booking", e);
        }

        // 6. Tạo trips
        if (request.getTrips() != null && !request.getTrips().isEmpty()) {
            for (TripRequest tripReq : request.getTrips()) {
                Trips trip = new Trips();
                trip.setBooking(booking);
                trip.setUseHighway(tripReq.getUseHighway() != null ? tripReq.getUseHighway() : booking.getUseHighway());
                trip.setStartTime(tripReq.getStartTime());
                // Don't set endTime when creating new trip - it will be set when trip is completed
                // This avoids violating trips_chk_1 constraint (startTime < endTime)
                trip.setStartLocation(tripReq.getStartLocation());
                trip.setEndLocation(tripReq.getEndLocation());
                if (tripReq.getDistance() != null && tripReq.getDistance() > 0) {
                    trip.setDistance(BigDecimal.valueOf(tripReq.getDistance()));
                }
                trip.setStatus(TripStatus.SCHEDULED);
                tripRepository.save(trip);
            }
        }

        // 7. Tạo booking vehicle details
        if (request.getVehicles() != null && !request.getVehicles().isEmpty()) {
            for (VehicleDetailRequest vehicleReq : request.getVehicles()) {
                BookingVehicleDetails details = new BookingVehicleDetails();
                BookingVehicleDetailsId id = new BookingVehicleDetailsId();
                id.setBookingId(booking.getId());
                id.setVehicleCategoryId(vehicleReq.getVehicleCategoryId());
                details.setId(id);
                details.setBooking(booking);
                VehicleCategoryPricing category = vehicleCategoryRepository.findById(vehicleReq.getVehicleCategoryId())
                        .orElseThrow(() -> new RuntimeException("Vehicle category not found: " + vehicleReq.getVehicleCategoryId()));
                details.setVehicleCategory(category);
                details.setQuantity(vehicleReq.getQuantity());
                bookingVehicleDetailsRepository.save(details);
            }
        }

        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse update(Integer bookingId, UpdateBookingRequest request) {
        log.info("[BookingService] Updating booking: {}", bookingId);

        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        // Chỉ cho phép update khi status là PENDING hoặc CONFIRMED
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("Cannot update booking with status: " + booking.getStatus());
        }

        // Validation: Kiểm tra loại thay đổi và thời gian cho phép
        boolean isMajorChange = isMajorModification(booking, request);
        validateModificationTime(booking, isMajorChange);

        BookingStatus oldStatus = booking.getStatus();

        // Update customer nếu có
        if (request.getCustomer() != null) {
            Customers customer = customerService.findOrCreateCustomer(
                    request.getCustomer(),
                    booking.getConsultant() != null ? booking.getConsultant().getEmployeeId() : null
            );
            booking.setCustomer(customer);
        }

        // Update branch
        if (request.getBranchId() != null) {
            Branches branch = branchesRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new RuntimeException("Branch not found: " + request.getBranchId()));
            booking.setBranch(branch);
        }

        // Update hire type
        if (request.getHireTypeId() != null) {
            HireTypes hireType = hireTypesRepository.findById(request.getHireTypeId()).orElse(null);
            booking.setHireType(hireType);
        }

        // Update useHighway
        if (request.getUseHighway() != null) {
            booking.setUseHighway(request.getUseHighway());
        }

        // Tính lại giá nếu có distance mới
        if (request.getDistance() != null && request.getVehicles() != null) {
            List<Integer> categoryIds = request.getVehicles().stream()
                    .map(VehicleDetailRequest::getVehicleCategoryId)
                    .collect(Collectors.toList());
            List<Integer> quantities = request.getVehicles().stream()
                    .map(VehicleDetailRequest::getQuantity)
                    .collect(Collectors.toList());
            Integer additionalPoints = (request.getAdditionalPickupPoints() != null ? request.getAdditionalPickupPoints() : 0) +
                    (request.getAdditionalDropoffPoints() != null ? request.getAdditionalDropoffPoints() : 0);

            // Lấy startTime và endTime từ trips để check chuyến trong ngày
            Instant startTime = null;
            Instant endTime = null;
            if (request.getTrips() != null && !request.getTrips().isEmpty()) {
                TripRequest firstTrip = request.getTrips().get(0);
                startTime = firstTrip.getStartTime();
                endTime = firstTrip.getEndTime();
            } else {
                // Nếu không có trips trong request, lấy từ trips hiện tại của booking
                List<Trips> existingTrips = tripRepository.findByBooking_Id(booking.getId());
                if (existingTrips != null && !existingTrips.isEmpty()) {
                    startTime = existingTrips.get(0).getStartTime();
                    endTime = existingTrips.get(0).getEndTime();
                }
            }

            BigDecimal estimatedCost = calculatePrice(
                    categoryIds,
                    quantities,
                    request.getDistance(),
                    request.getUseHighway() != null ? request.getUseHighway() : booking.getUseHighway(),
                    request.getHireTypeId() != null ? request.getHireTypeId() : (booking.getHireType() != null ? booking.getHireType().getId() : null),
                    request.getIsHoliday() != null ? request.getIsHoliday() : (booking.getIsHoliday() != null ? booking.getIsHoliday() : false),
                    request.getIsWeekend() != null ? request.getIsWeekend() : (booking.getIsWeekend() != null ? booking.getIsWeekend() : false),
                    additionalPoints,
                    startTime,
                    endTime
            );
            booking.setEstimatedCost(estimatedCost);
        } else if (request.getEstimatedCost() != null) {
            booking.setEstimatedCost(request.getEstimatedCost());
        }

        // Update các field mới
        if (request.getIsHoliday() != null) {
            booking.setIsHoliday(request.getIsHoliday());
        }
        if (request.getIsWeekend() != null) {
            booking.setIsWeekend(request.getIsWeekend());
        }
        if (request.getAdditionalPickupPoints() != null) {
            booking.setAdditionalPickupPoints(request.getAdditionalPickupPoints());
        }
        if (request.getAdditionalDropoffPoints() != null) {
            booking.setAdditionalDropoffPoints(request.getAdditionalDropoffPoints());
        }

        // Update discount và totalCost
        BigDecimal discountAmount = request.getDiscountAmount() != null
                ? request.getDiscountAmount()
                : BigDecimal.ZERO;
        BigDecimal totalCost = booking.getEstimatedCost() != null
                ? booking.getEstimatedCost().subtract(discountAmount)
                : BigDecimal.ZERO;
        booking.setTotalCost(totalCost);


        if (request.getDepositAmount() != null) {
            booking.setDepositAmount(request.getDepositAmount());
        }

        if (request.getStatus() != null) {
            booking.setStatus(parseBookingStatus(request.getStatus()));
        }

        if (request.getNote() != null) {
            booking.setNote(request.getNote());
        }

        booking = bookingRepository.save(booking);

        // Send WebSocket notification for booking update
        try {
            String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "Khách hàng";
            String bookingCode = "ORD-" + bookingId;
            BookingStatus newStatus = booking.getStatus();

            if (oldStatus != newStatus) {
                // Status changed
                webSocketNotificationService.sendGlobalNotification(
                        "Cập nhật trạng thái đơn hàng",
                        String.format("Đơn %s - %s: %s → %s",
                                bookingCode,
                                customerName,
                                oldStatus.name(),
                                newStatus.name()),
                        "INFO"
                );

                webSocketNotificationService.sendBookingUpdate(
                        bookingId,
                        newStatus.name(),
                        String.format("Trạng thái đơn hàng đã được cập nhật thành %s", newStatus.name())
                );
            } else {
                // General update
                webSocketNotificationService.sendBookingUpdate(
                        bookingId,
                        "UPDATED",
                        String.format("Đơn hàng %s đã được cập nhật", bookingCode)
                );
            }
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification for booking update", e);
        }

        // Update trips (xóa cũ, tạo mới)
        if (request.getTrips() != null) {
            // Xóa trips cũ (dọn phụ thuộc trước để tránh lỗi FK)
            List<Trips> oldTrips = tripRepository.findByBooking_Id(bookingId);
            for (Trips old : oldTrips) {
                // xóa trực tiếp theo tripId để đảm bảo xóa FK trước
                try {
                    tripDriverRepository.deleteByTrip_Id(old.getId());
                } catch (Exception ignore) {
                    List<TripDrivers> tds = tripDriverRepository.findByTripId(old.getId());
                    if (!tds.isEmpty()) tripDriverRepository.deleteAll(tds);
                }
                try {
                    tripVehicleRepository.deleteByTrip_Id(old.getId());
                } catch (Exception ignore) {
                    List<TripVehicles> tvs = tripVehicleRepository.findByTripId(old.getId());
                    if (!tvs.isEmpty()) tripVehicleRepository.deleteAll(tvs);
                }
            }
            // sau khi dọn phụ thuộc mới xóa trips
            if (!oldTrips.isEmpty()) {
                tripRepository.deleteAll(oldTrips);
            }

            // Tạo trips mới
            for (TripRequest tripReq : request.getTrips()) {
                Trips trip = new Trips();
                trip.setBooking(booking);
                trip.setUseHighway(tripReq.getUseHighway() != null ? tripReq.getUseHighway() : booking.getUseHighway());
                trip.setStartTime(tripReq.getStartTime());
                trip.setEndTime(tripReq.getEndTime());
                trip.setStartLocation(tripReq.getStartLocation());
                trip.setEndLocation(tripReq.getEndLocation());
                if (tripReq.getDistance() != null && tripReq.getDistance() > 0) {
                    trip.setDistance(BigDecimal.valueOf(tripReq.getDistance()));
                }
                trip.setStatus(TripStatus.SCHEDULED);
                tripRepository.save(trip);
            }
        }

        // Update vehicle details (xóa cũ, tạo mới)
        if (request.getVehicles() != null) {
            bookingVehicleDetailsRepository.deleteByBooking_Id(bookingId);

            for (VehicleDetailRequest vehicleReq : request.getVehicles()) {
                BookingVehicleDetails details = new BookingVehicleDetails();
                BookingVehicleDetailsId id = new BookingVehicleDetailsId();
                id.setBookingId(booking.getId());
                id.setVehicleCategoryId(vehicleReq.getVehicleCategoryId());
                details.setId(id);
                details.setBooking(booking);
                VehicleCategoryPricing category = vehicleCategoryRepository.findById(vehicleReq.getVehicleCategoryId())
                        .orElseThrow(() -> new RuntimeException("Vehicle category not found: " + vehicleReq.getVehicleCategoryId()));
                details.setVehicleCategory(category);
                details.setQuantity(vehicleReq.getQuantity());
                bookingVehicleDetailsRepository.save(details);
            }
        }

        return toResponse(booking);
    }

    @Override
    public BookingResponse getById(Integer bookingId) {
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));
        return toResponse(booking);
    }

    @Override
    public PageResponse<?> getAll(
            String status,
            Integer branchId,
            Integer consultantId,
            Instant startDate,
            Instant endDate,
            String keyword,
            int page,
            int size,
            String sortBy
    ) {
        int pageNo = page > 0 ? page - 1 : 0;
        List<Sort.Order> sorts = new ArrayList<>();

        if (StringUtils.hasLength(sortBy)) {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\w+?)(:)(.*)");
            java.util.regex.Matcher matcher = pattern.matcher(sortBy);
            if (matcher.find()) {
                if (matcher.group(3).equalsIgnoreCase("asc")) {
                    sorts.add(new Sort.Order(Sort.Direction.ASC, matcher.group(1)));
                } else {
                    sorts.add(new Sort.Order(Sort.Direction.DESC, matcher.group(1)));
                }
            }
        } else {
            sorts.add(new Sort.Order(Sort.Direction.DESC, "id"));
        }

        Pageable pageable = PageRequest.of(pageNo, size, Sort.by(sorts));
        BookingStatus statusEnum = status != null && !status.isBlank()
                ? parseBookingStatus(status)
                : null;

        Page<Bookings> bookingPage = bookingRepository.filterBookings(
                statusEnum, branchId, consultantId, startDate, endDate, keyword, pageable
        );

        List<BookingListResponse> items = bookingPage.getContent().stream()
                .map(this::toListResponse)
                .collect(Collectors.toList());

        return PageResponse.builder()
                .pageNo(pageNo + 1)
                .pageSize(size)
                .totalElements(bookingPage.getTotalElements())
                .totalPages(bookingPage.getTotalPages())
                .items(items)
                .build();
    }

    @Override
    @Transactional
    public void delete(Integer bookingId) {
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        // Validation: Chỉ cho phép hủy trước khi khởi hành
        validateCanCancelOrModify(booking, "hủy");

        // Tính % mất cọc dựa trên thời gian hủy
        BigDecimal depositLossAmount = calculateDepositLoss(booking);

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        // Ghi nhận mất cọc nếu có
        if (depositLossAmount != null && depositLossAmount.compareTo(BigDecimal.ZERO) > 0) {
            try {
                // Tạo invoice để ghi nhận mất cọc
                Invoices depositLossInvoice = new Invoices();
                depositLossInvoice.setBooking(booking);
                depositLossInvoice.setBranch(booking.getBranch());
                depositLossInvoice.setCustomer(booking.getCustomer());
                depositLossInvoice.setType(org.example.ptcmssbackend.enums.InvoiceType.INCOME);
                depositLossInvoice.setIsDeposit(false); // Không phải tiền cọc, mà là tiền mất do hủy
                depositLossInvoice.setAmount(depositLossAmount);
                depositLossInvoice.setPaymentMethod("AUTO"); // Tự động (không cần thanh toán)
                depositLossInvoice.setPaymentStatus(org.example.ptcmssbackend.enums.PaymentStatus.PAID);
                depositLossInvoice.setStatus(org.example.ptcmssbackend.enums.InvoiceStatus.ACTIVE);
                depositLossInvoice.setNote(String.format("Tiền mất cọc do hủy đơn (%.0f%% tiền cọc)",
                        depositLossAmount.divide(booking.getDepositAmount() != null && booking.getDepositAmount().compareTo(BigDecimal.ZERO) > 0
                                        ? booking.getDepositAmount()
                                        : BigDecimal.ONE, 2, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100)).doubleValue()));
                invoiceRepository.save(depositLossInvoice);

                log.info("[Booking] Deposit loss recorded: {} VNĐ for booking {}", depositLossAmount, bookingId);
            } catch (Exception e) {
                log.warn("Failed to record deposit loss invoice", e);
            }
        }

        // Send WebSocket notification for cancellation
        try {
            String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "Khách hàng";
            String bookingCode = "ORD-" + bookingId;
            String message = depositLossAmount != null && depositLossAmount.compareTo(BigDecimal.ZERO) > 0
                    ? String.format("Đơn %s - %s đã bị hủy. Mất cọc: %,.0f VNĐ", bookingCode, customerName, depositLossAmount)
                    : String.format("Đơn %s - %s đã bị hủy", bookingCode, customerName);

            webSocketNotificationService.sendGlobalNotification(
                    "Đơn hàng bị hủy",
                    message,
                    "WARNING"
            );

            webSocketNotificationService.sendBookingUpdate(
                    bookingId,
                    "CANCELLED",
                    "Đơn hàng đã bị hủy"
            );
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification for booking cancellation", e);
        }
    }

    /**
     * Tính số tiền mất cọc khi hủy đơn dựa trên thời gian hủy
     * - Hủy < 24h trước khởi hành: Mất 100% tiền cọc
     * - Hủy < 48h trước khởi hành: Mất 30% tiền cọc
     * - Hủy >= 48h trước khởi hành: Không mất cọc (hoàn lại)
     */
    private BigDecimal calculateDepositLoss(Bookings booking) {
        if (booking.getDepositAmount() == null || booking.getDepositAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO; // Không có tiền cọc
        }

        // Lấy thời gian khởi hành từ trips
        List<Trips> trips = tripRepository.findByBooking_Id(booking.getId());
        if (trips == null || trips.isEmpty()) {
            log.warn("[Booking] No trips found for booking {}, cannot calculate deposit loss", booking.getId());
            return BigDecimal.ZERO; // Không có trip, không tính mất cọc
        }

        // Lấy thời gian khởi hành sớm nhất
        Instant earliestStartTime = trips.stream()
                .map(Trips::getStartTime)
                .filter(java.util.Objects::nonNull)
                .min(Instant::compareTo)
                .orElse(null);

        if (earliestStartTime == null) {
            log.warn("[Booking] No start time found for booking {}, cannot calculate deposit loss", booking.getId());
            return BigDecimal.ZERO;
        }

        // Tính số giờ từ bây giờ đến khởi hành
        Instant now = Instant.now();
        long hoursUntilStart = java.time.Duration.between(now, earliestStartTime).toHours();

        // Lấy cấu hình từ SystemSettings
        int fullLossHours = getSystemSettingInt("CANCELLATION_FULL_DEPOSIT_LOSS_HOURS", 24);
        int partialLossHours = getSystemSettingInt("CANCELLATION_PARTIAL_DEPOSIT_LOSS_HOURS", 48);
        BigDecimal partialLossPercent = getSystemSettingDecimal("CANCELLATION_PARTIAL_DEPOSIT_PERCENT", new BigDecimal("0.30"));

        BigDecimal depositAmount = booking.getDepositAmount();

        if (hoursUntilStart < 0) {
            // Đã quá thời gian khởi hành, mất 100%
            log.info("[Booking] Cancellation after start time, full deposit loss: {} VNĐ", depositAmount);
            return depositAmount;
        } else if (hoursUntilStart < fullLossHours) {
            // Hủy < 24h trước khởi hành: Mất 100%
            log.info("[Booking] Cancellation < {} hours before start, full deposit loss: {} VNĐ", fullLossHours, depositAmount);
            return depositAmount;
        } else if (hoursUntilStart < partialLossHours) {
            // Hủy < 48h trước khởi hành: Mất 30%
            BigDecimal lossAmount = depositAmount.multiply(partialLossPercent).setScale(2, RoundingMode.HALF_UP);
            log.info("[Booking] Cancellation < {} hours before start, partial deposit loss ({}%): {} VNĐ",
                    partialLossHours, partialLossPercent.multiply(BigDecimal.valueOf(100)), lossAmount);
            return lossAmount;
        } else {
            // Hủy >= 48h trước khởi hành: Không mất cọc
            log.info("[Booking] Cancellation >= {} hours before start, no deposit loss", partialLossHours);
            return BigDecimal.ZERO;
        }
    }

    @Override
    public BigDecimal calculatePrice(
            List<Integer> vehicleCategoryIds,
            List<Integer> quantities,
            Double distance,
            Boolean useHighway
    ) {
        // Gọi overloaded method với các tham số mặc định
        return calculatePrice(
                vehicleCategoryIds,
                quantities,
                distance,
                useHighway,
                null, // hireTypeId - sẽ được xác định từ booking
                false, // isHoliday
                false, // isWeekend
                0, // additionalPoints
                null, // startTime
                null // endTime
        );
    }

    /**
     * Tính giá với logic mới theo yêu cầu:
     * - Nếu là chuyến trong ngày (6h sáng - 11h đêm cùng ngày): Dùng giá cố định (sameDayFixedPrice)
     * - Nếu không: GIÁ THUÊ = TỔNG QUÃNG ĐƯỜNG × ĐƠN GIÁ THEO LOẠI XE × HỆ SỐ + PHỤ PHÍ
     */
    public BigDecimal calculatePrice(
            List<Integer> vehicleCategoryIds,
            List<Integer> quantities,
            Double distance,
            Boolean useHighway,
            Integer hireTypeId,
            Boolean isHoliday,
            Boolean isWeekend,
            Integer additionalPoints,
            Instant startTime,
            Instant endTime
    ) {
        if (vehicleCategoryIds == null || vehicleCategoryIds.isEmpty()) {
            return BigDecimal.ZERO;
        }

        // Lấy cấu hình từ SystemSettings
        BigDecimal holidaySurchargeRate = getSystemSettingDecimal("HOLIDAY_SURCHARGE_RATE", new BigDecimal("0.25"));
        BigDecimal weekendSurchargeRate = getSystemSettingDecimal("WEEKEND_SURCHARGE_RATE", new BigDecimal("0.20"));
        BigDecimal oneWayDiscountRate = getSystemSettingDecimal("ONE_WAY_DISCOUNT_RATE", new BigDecimal("0.6667"));
        BigDecimal additionalPointSurchargeRate = getSystemSettingDecimal("ADDITIONAL_POINT_SURCHARGE_RATE", new BigDecimal("0.05"));

        // Check xem có phải chuyến trong ngày không (6h sáng - 11h đêm cùng ngày)
        boolean isSameDayTrip = isSameDayTrip(startTime, endTime);

        // Xác định hệ số đi 1 chiều vs 2 chiều
        BigDecimal tripTypeMultiplier = BigDecimal.ONE;
        if (hireTypeId != null) {
            HireTypes hireType = hireTypesRepository.findById(hireTypeId).orElse(null);
            if (hireType != null && "ONE_WAY".equals(hireType.getCode())) {
                tripTypeMultiplier = oneWayDiscountRate;
            }
        }

        // Tính hệ số phụ phí ngày lễ/cuối tuần
        BigDecimal surchargeRate = BigDecimal.ZERO;
        if (isHoliday != null && isHoliday) {
            surchargeRate = surchargeRate.add(holidaySurchargeRate);
        }
        if (isWeekend != null && isWeekend) {
            surchargeRate = surchargeRate.add(weekendSurchargeRate);
        }

        BigDecimal totalPrice = BigDecimal.ZERO;

        for (int i = 0; i < vehicleCategoryIds.size(); i++) {
            Integer categoryId = vehicleCategoryIds.get(i);
            Integer quantity = i < quantities.size() ? quantities.get(i) : 1;

            VehicleCategoryPricing category = vehicleCategoryRepository.findById(categoryId)
                    .orElseThrow(() -> new RuntimeException("Vehicle category not found: " + categoryId));

            if (category.getStatus() != VehicleCategoryStatus.ACTIVE) {
                continue; // Bỏ qua loại xe không active
            }

            BigDecimal pricePerKm = category.getPricePerKm() != null ? category.getPricePerKm() : BigDecimal.ZERO;
            BigDecimal highwayFee = category.getHighwayFee() != null ? category.getHighwayFee() : BigDecimal.ZERO;
            BigDecimal sameDayFixedPrice = category.getSameDayFixedPrice() != null ? category.getSameDayFixedPrice() : BigDecimal.ZERO;

            BigDecimal basePrice = BigDecimal.ZERO;

            // Nếu là chuyến trong ngày và có giá cố định, ưu tiên dùng giá cố định
            if (isSameDayTrip && sameDayFixedPrice.compareTo(BigDecimal.ZERO) > 0) {
                basePrice = sameDayFixedPrice;
                // Nếu chưa bao gồm cao tốc và có yêu cầu cao tốc, cộng thêm phí cao tốc
                // Giá cố định thường đã bao gồm cao tốc, nhưng nếu chưa thì cộng thêm
                // (Theo yêu cầu: 2,600,000đ đã bao cao tốc, 2,500,000đ chưa + 300k)
                if (useHighway != null && useHighway && highwayFee.compareTo(BigDecimal.ZERO) > 0) {
                    // Kiểm tra: nếu giá cố định = 2,500,000 (chưa cao tốc) thì cộng thêm
                    // Nếu = 2,600,000 (đã có cao tốc) thì không cộng
                    // Logic: nếu giá cố định < 2,600,000 thì cộng thêm phí cao tốc
                    BigDecimal standardWithHighway = new BigDecimal("2600000");
                    if (sameDayFixedPrice.compareTo(standardWithHighway) < 0) {
                        basePrice = basePrice.add(highwayFee);
                    }
                }
            } else {
                // Công thức tính theo km: GIÁ = distance × pricePerKm × hệ số loại chuyến
                if (distance != null && distance > 0 && pricePerKm.compareTo(BigDecimal.ZERO) > 0) {
                    basePrice = pricePerKm
                            .multiply(BigDecimal.valueOf(distance))
                            .multiply(tripTypeMultiplier);
                }

                // Phụ phí cao tốc
                if (useHighway != null && useHighway && highwayFee.compareTo(BigDecimal.ZERO) > 0) {
                    basePrice = basePrice.add(highwayFee);
                }
            }

            // Phụ phí xe hạng sang
            if (category.getIsPremium() != null && category.getIsPremium()) {
                BigDecimal premiumSurcharge = category.getPremiumSurcharge() != null
                        ? category.getPremiumSurcharge()
                        : new BigDecimal("1000000");
                basePrice = basePrice.add(premiumSurcharge);
            }

            // Phụ phí ngày lễ/cuối tuần
            if (surchargeRate.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal surcharge = basePrice.multiply(surchargeRate);
                basePrice = basePrice.add(surcharge);
            }

            // Phụ phí địa điểm phát sinh (tăng % mỗi điểm)
            if (additionalPoints != null && additionalPoints > 0) {
                BigDecimal additionalPointFee = basePrice
                        .multiply(additionalPointSurchargeRate)
                        .multiply(BigDecimal.valueOf(additionalPoints));
                basePrice = basePrice.add(additionalPointFee);
            }

            // Nhân với số lượng xe
            BigDecimal priceForThisCategory = basePrice.multiply(BigDecimal.valueOf(quantity));
            totalPrice = totalPrice.add(priceForThisCategory);
        }

        return totalPrice.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Helper method: Lấy giá trị decimal từ SystemSettings
     */
    private BigDecimal getSystemSettingDecimal(String key, BigDecimal defaultValue) {
        try {
            var setting = systemSettingService.getByKey(key);
            if (setting != null && setting.getSettingValue() != null) {
                return new BigDecimal(setting.getSettingValue());
            }
        } catch (Exception e) {
            log.warn("Cannot get system setting {}: {}", key, e.getMessage());
        }
        return defaultValue;
    }

    /**
     * Helper method: Kiểm tra xem có phải chuyến trong ngày không
     * Chuyến trong ngày: Khởi hành từ 6h sáng, về 7-8h tối (hoặc đến 10-11h đêm cùng ngày)
     */
    private boolean isSameDayTrip(Instant startTime, Instant endTime) {
        if (startTime == null || endTime == null) {
            return false;
        }

        try {
            // Lấy cấu hình từ SystemSettings
            int startHour = getSystemSettingInt("SAME_DAY_TRIP_START_HOUR", 6);
            int endHour = getSystemSettingInt("SAME_DAY_TRIP_END_HOUR", 23);

            java.time.ZonedDateTime startZoned = startTime.atZone(java.time.ZoneId.systemDefault());
            java.time.ZonedDateTime endZoned = endTime.atZone(java.time.ZoneId.systemDefault());

            // Check cùng ngày
            if (!startZoned.toLocalDate().equals(endZoned.toLocalDate())) {
                return false;
            }

            // Check giờ khởi hành >= 6h sáng
            int startHourOfDay = startZoned.getHour();
            if (startHourOfDay < startHour) {
                return false;
            }

            // Check giờ về <= 11h đêm (23h)
            int endHourOfDay = endZoned.getHour();
            if (endHourOfDay > endHour) {
                return false;
            }

            return true;
        } catch (Exception e) {
            log.warn("Error checking same day trip: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Helper method: Lấy giá trị int từ SystemSettings
     */
    private int getSystemSettingInt(String key, int defaultValue) {
        try {
            var setting = systemSettingService.getByKey(key);
            if (setting != null && setting.getSettingValue() != null) {
                return Integer.parseInt(setting.getSettingValue());
            }
        } catch (Exception e) {
            log.warn("Cannot get system setting {}: {}", key, e.getMessage());
        }
        return defaultValue;
    }

    /**
     * Kiểm tra xem request có phải là thay đổi lớn không
     * Thay đổi lớn: điểm đón/trả, hành trình, số ngày, loại xe
     * Thay đổi nhỏ: thông tin khách hàng, ghi chú, trạng thái
     */
    private boolean isMajorModification(Bookings booking, UpdateBookingRequest request) {
        // Thay đổi trips (điểm đón, điểm trả, thời gian) = thay đổi lớn
        if (request.getTrips() != null && !request.getTrips().isEmpty()) {
            List<Trips> existingTrips = tripRepository.findByBooking_Id(booking.getId());

            // Số lượng trips khác nhau
            if (existingTrips.size() != request.getTrips().size()) {
                log.info("[Booking] Major change detected: trip count changed");
                return true;
            }

            // Check từng trip xem có thay đổi điểm đón/trả không
            for (int i = 0; i < request.getTrips().size(); i++) {
                TripRequest tripReq = request.getTrips().get(i);
                if (i < existingTrips.size()) {
                    Trips existingTrip = existingTrips.get(i);

                    // Check điểm đón
                    if (tripReq.getStartLocation() != null &&
                            !tripReq.getStartLocation().equals(existingTrip.getStartLocation())) {
                        log.info("[Booking] Major change detected: pickup location changed");
                        return true;
                    }

                    // Check điểm trả
                    if (tripReq.getEndLocation() != null &&
                            !tripReq.getEndLocation().equals(existingTrip.getEndLocation())) {
                        log.info("[Booking] Major change detected: dropoff location changed");
                        return true;
                    }

                    // Check ngày/giờ khởi hành thay đổi > 2 giờ
                    if (tripReq.getStartTime() != null && existingTrip.getStartTime() != null) {
                        long hoursDiff = Math.abs(java.time.Duration.between(
                                tripReq.getStartTime(), existingTrip.getStartTime()).toHours());
                        if (hoursDiff > 2) {
                            log.info("[Booking] Major change detected: start time changed by {} hours", hoursDiff);
                            return true;
                        }
                    }
                }
            }
        }

        // Thay đổi loại xe = thay đổi lớn
        if (request.getVehicles() != null && !request.getVehicles().isEmpty()) {
            List<BookingVehicleDetails> existingVehicles = bookingVehicleDetailsRepository.findByBookingId(booking.getId());

            // Số lượng loại xe khác nhau
            if (existingVehicles.size() != request.getVehicles().size()) {
                log.info("[Booking] Major change detected: vehicle count changed");
                return true;
            }

            // Check từng loại xe
            for (int i = 0; i < request.getVehicles().size(); i++) {
                VehicleDetailRequest vReq = request.getVehicles().get(i);
                if (i < existingVehicles.size()) {
                    BookingVehicleDetails existingV = existingVehicles.get(i);

                    // Loại xe khác
                    if (!vReq.getVehicleCategoryId().equals(existingV.getVehicleCategory().getId())) {
                        log.info("[Booking] Major change detected: vehicle category changed");
                        return true;
                    }

                    // Số lượng xe khác
                    if (!vReq.getQuantity().equals(existingV.getQuantity())) {
                        log.info("[Booking] Major change detected: vehicle quantity changed");
                        return true;
                    }
                }
            }
        }

        // Không có thay đổi lớn
        return false;
    }

    /**
     * Validation thời gian cho phép sửa đổi
     * - Thay đổi nhỏ: >= 24h trước khởi hành
     * - Thay đổi lớn: >= 72h trước khởi hành
     */
    private void validateModificationTime(Bookings booking, boolean isMajorChange) {
        List<Trips> trips = tripRepository.findByBooking_Id(booking.getId());
        if (trips == null || trips.isEmpty()) {
            return; // Chưa có trip, cho phép sửa
        }

        Instant earliestStartTime = trips.stream()
                .map(Trips::getStartTime)
                .filter(java.util.Objects::nonNull)
                .min(Instant::compareTo)
                .orElse(null);

        if (earliestStartTime == null) {
            return;
        }

        Instant now = Instant.now();

        // Check đã khởi hành chưa
        if (now.isAfter(earliestStartTime)) {
            throw new RuntimeException("Không thể sửa đổi đơn hàng sau khi đã khởi hành");
        }

        // Check có trip đang diễn ra không
        boolean hasInProgressTrip = trips.stream()
                .anyMatch(t -> t.getStatus() == TripStatus.ONGOING);
        if (hasInProgressTrip) {
            throw new RuntimeException("Không thể sửa đổi đơn hàng khi có chuyến đang diễn ra");
        }

        long hoursUntilStart = java.time.Duration.between(now, earliestStartTime).toHours();

        if (isMajorChange) {
            // Thay đổi lớn: >= 72h
            int minHours = getSystemSettingInt("BOOKING_MAJOR_MODIFICATION_MIN_HOURS", 72);
            if (hoursUntilStart < minHours) {
                throw new RuntimeException(
                        String.format("Thay đổi lớn (điểm đón/trả, hành trình, loại xe) phải thực hiện trước %d giờ khởi hành. " +
                                "Còn %d giờ trước khi khởi hành.", minHours, hoursUntilStart)
                );
            }
        } else {
            // Thay đổi nhỏ: >= 24h
            int minHours = getSystemSettingInt("BOOKING_MINOR_MODIFICATION_MIN_HOURS", 24);
            if (hoursUntilStart < minHours) {
                throw new RuntimeException(
                        String.format("Sửa đổi đơn hàng phải thực hiện trước %d giờ khởi hành. " +
                                "Còn %d giờ trước khi khởi hành.", minHours, hoursUntilStart)
                );
            }
        }

        log.info("[Booking] Modification allowed: isMajorChange={}, hoursUntilStart={}", isMajorChange, hoursUntilStart);
    }

    /**
     * Validation: Kiểm tra xem có thể hủy booking không
     * - Chỉ cho phép trước khi khởi hành
     * - Hủy: được phép nhưng có phạt cọc theo quy định
     * (Dùng cho delete/cancel, không dùng cho update)
     */
    private void validateCanCancelOrModify(Bookings booking, String action) {
        // Lấy thời gian khởi hành từ trips
        List<Trips> trips = tripRepository.findByBooking_Id(booking.getId());
        if (trips == null || trips.isEmpty()) {
            // Không có trip, cho phép hủy
            return;
        }

        // Lấy thời gian khởi hành sớm nhất
        Instant earliestStartTime = trips.stream()
                .map(Trips::getStartTime)
                .filter(java.util.Objects::nonNull)
                .min(Instant::compareTo)
                .orElse(null);

        if (earliestStartTime == null) {
            // Không có thời gian khởi hành, cho phép
            return;
        }

        // Check xem đã khởi hành chưa
        Instant now = Instant.now();
        if (now.isAfter(earliestStartTime)) {
            throw new RuntimeException(
                    String.format("Không thể %s đơn hàng sau khi đã khởi hành. Thời gian khởi hành: %s",
                            action, earliestStartTime.toString())
            );
        }

        // Check xem có trip nào đang IN_PROGRESS không
        boolean hasInProgressTrip = trips.stream()
                .anyMatch(t -> t.getStatus() == TripStatus.ONGOING);

        if (hasInProgressTrip) {
            throw new RuntimeException(
                    String.format("Không thể %s đơn hàng khi có chuyến đang diễn ra", action)
            );
        }
    }

    @Override
    public ConsultantDashboardResponse getConsultantDashboard(Integer consultantEmployeeId, Integer branchId) {
        // Lấy danh sách bookings theo status
        List<Bookings> pendingBookings = bookingRepository.findPendingBookings(branchId, consultantEmployeeId);
        List<Bookings> sentQuotations = bookingRepository.filterBookings(
                BookingStatus.QUOTATION_SENT, branchId, consultantEmployeeId, null, null, null, Pageable.unpaged()
        ).getContent();
        List<Bookings> confirmedBookings = bookingRepository.findConfirmedBookings(branchId, consultantEmployeeId);

        // Đếm số lượng
        Long totalPendingCount = bookingRepository.countByStatus(BookingStatus.PENDING, branchId, consultantEmployeeId);
        Long totalSentCount = bookingRepository.countByStatus(BookingStatus.QUOTATION_SENT, branchId, consultantEmployeeId);
        Long totalConfirmedCount = bookingRepository.countByStatus(BookingStatus.CONFIRMED, branchId, consultantEmployeeId);

        // Tính doanh số trong tháng
        YearMonth currentMonth = YearMonth.now();
        LocalDate monthStart = currentMonth.atDay(1);
        LocalDate monthEnd = currentMonth.atEndOfMonth();
        Instant startInstant = monthStart.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endInstant = monthEnd.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        Page<Bookings> monthlyBookings = bookingRepository.filterBookings(
                BookingStatus.COMPLETED,
                branchId,
                consultantEmployeeId,
                startInstant,
                endInstant,
                null,
                Pageable.unpaged()
        );

        BigDecimal monthlyRevenue = monthlyBookings.getContent().stream()
                .map(b -> b.getTotalCost() != null ? b.getTotalCost() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tính tỷ lệ chuyển đổi
        Long totalBookings = bookingRepository.countByStatus(null, branchId, consultantEmployeeId);
        Double conversionRate = totalBookings > 0
                ? (double) totalConfirmedCount / totalBookings * 100
                : 0.0;

        // Thống kê theo tháng (3 tháng gần nhất)
        List<ConsultantDashboardResponse.MonthlyStatistic> monthlyStatistics = new ArrayList<>();
        for (int i = 2; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            LocalDate mStart = month.atDay(1);
            LocalDate mEnd = month.atEndOfMonth();
            Instant mStartInstant = mStart.atStartOfDay(ZoneId.systemDefault()).toInstant();
            Instant mEndInstant = mEnd.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

            Page<Bookings> monthBookings = bookingRepository.filterBookings(
                    null, branchId, consultantEmployeeId, mStartInstant, mEndInstant, null, Pageable.unpaged()
            );

            Long monthTotal = (long) monthBookings.getContent().size();
            Long monthConfirmed = monthBookings.getContent().stream()
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.COMPLETED)
                    .count();
            BigDecimal monthRevenue = monthBookings.getContent().stream()
                    .map(b -> b.getTotalCost() != null ? b.getTotalCost() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Double monthConversionRate = monthTotal > 0 ? (double) monthConfirmed / monthTotal * 100 : 0.0;

            monthlyStatistics.add(ConsultantDashboardResponse.MonthlyStatistic.builder()
                    .month(month.toString())
                    .totalBookings(monthTotal)
                    .confirmedBookings(monthConfirmed)
                    .revenue(monthRevenue)
                    .conversionRate(monthConversionRate)
                    .build());
        }

        return ConsultantDashboardResponse.builder()
                .pendingBookings(pendingBookings.stream().map(this::toListResponse).collect(Collectors.toList()))
                .sentQuotations(sentQuotations.stream().map(this::toListResponse).collect(Collectors.toList()))
                .confirmedBookings(confirmedBookings.stream().map(this::toListResponse).collect(Collectors.toList()))
                .totalPendingCount(totalPendingCount)
                .totalSentCount(totalSentCount)
                .totalConfirmedCount(totalConfirmedCount)
                .monthlyRevenue(monthlyRevenue)
                .conversionRate(conversionRate)
                .monthlyStatistics(monthlyStatistics)
                .build();
    }

    @Override
    public List<BookingListResponse> getBookingList(String status, Integer branchId, Integer consultantId) {
        BookingStatus statusEnum = status != null && !status.isBlank()
                ? parseBookingStatus(status)
                : null;

        Page<Bookings> bookings = bookingRepository.filterBookings(
                statusEnum, branchId, consultantId, null, null, null, Pageable.unpaged()
        );

        return bookings.getContent().stream()
                .map(this::toListResponse)
                .collect(Collectors.toList());
    }

    // Helper methods
    private BookingStatus parseBookingStatus(String status) {
        if (status == null || status.isBlank()) {
            return BookingStatus.PENDING;
        }
        try {
            String s = status.trim().toUpperCase().replace('-', '_').replace(' ', '_');
            if ("INPROGRESS".equals(s)) s = "IN_PROGRESS";
            return BookingStatus.valueOf(s);
        } catch (IllegalArgumentException e) {
            return BookingStatus.PENDING;
        }
    }

    @Override
    @Transactional
    public BookingResponse addPayment(Integer bookingId, CreatePaymentRequest request, Integer employeeId) {
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        // Tìm invoice UNPAID với cùng số tiền và isDeposit để cập nhật thay vì tạo mới
        List<Invoices> existingInvoices = invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
        Invoices matchingUnpaidInvoice = existingInvoices.stream()
                .filter(inv -> inv.getPaymentStatus() == org.example.ptcmssbackend.enums.PaymentStatus.UNPAID
                        && inv.getAmount() != null
                        && inv.getAmount().compareTo(request.getAmount()) == 0
                        && inv.getIsDeposit() != null
                        && inv.getIsDeposit().equals(Boolean.TRUE.equals(request.getDeposit())))
                .findFirst()
                .orElse(null);

        Invoices inv;
        if (matchingUnpaidInvoice != null) {
            // Cập nhật invoice UNPAID thành PAID
            inv = matchingUnpaidInvoice;
            inv.setPaymentMethod(request.getPaymentMethod());
            inv.setPaymentStatus(org.example.ptcmssbackend.enums.PaymentStatus.PAID);
            if (request.getNote() != null && !request.getNote().isEmpty()) {
                inv.setNote(request.getNote());
            }
            if (employeeId != null) {
                inv.setCreatedBy(employeeRepository.findById(employeeId).orElse(null));
            }
        } else {
            // Tạo invoice mới nếu không tìm thấy invoice UNPAID phù hợp
            inv = new Invoices();
            inv.setBooking(booking);
            inv.setBranch(booking.getBranch());
            inv.setCustomer(booking.getCustomer());
            inv.setType(org.example.ptcmssbackend.enums.InvoiceType.INCOME);
            inv.setIsDeposit(Boolean.TRUE.equals(request.getDeposit()));
            inv.setAmount(request.getAmount());
            inv.setPaymentMethod(request.getPaymentMethod());
            inv.setPaymentStatus(org.example.ptcmssbackend.enums.PaymentStatus.PAID);
            inv.setStatus(org.example.ptcmssbackend.enums.InvoiceStatus.ACTIVE);
            inv.setNote(request.getNote());
            if (employeeId != null) {
                inv.setCreatedBy(employeeRepository.findById(employeeId).orElse(null));
            }
        }
        invoiceRepository.save(inv);

        // return updated booking response with new totals
        return getById(bookingId);
    }

    @Override
    @Transactional
    public BookingResponse assign(Integer bookingId, AssignRequest request) {
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        List<Trips> trips = tripRepository.findByBooking_Id(bookingId);
        List<Integer> targetTripIds = (request.getTripIds() != null && !request.getTripIds().isEmpty())
                ? request.getTripIds()
                : trips.stream().map(Trips::getId).collect(Collectors.toList());

        // Assign driver if provided
        if (request.getDriverId() != null) {
            Drivers driver = driverRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new RuntimeException("Driver not found: " + request.getDriverId()));
            for (Integer tid : targetTripIds) {
                List<TripDrivers> olds = tripDriverRepository.findByTripId(tid);
                if (!olds.isEmpty()) tripDriverRepository.deleteAll(olds);

                TripDrivers td = new TripDrivers();
                TripDriverId id = new TripDriverId();
                id.setTripId(tid);
                id.setDriverId(driver.getId());
                td.setId(id);
                Trips trip = trips.stream().filter(t -> t.getId().equals(tid)).findFirst().orElseThrow();
                td.setTrip(trip);
                td.setDriver(driver);
                td.setDriverRole("Main Driver");
                td.setNote(request.getNote());
                tripDriverRepository.save(td);
            }
        }

        // Assign vehicle if provided
        if (request.getVehicleId() != null) {
            Vehicles vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Vehicle not found: " + request.getVehicleId()));
            for (Integer tid : targetTripIds) {
                List<TripVehicles> olds = tripVehicleRepository.findByTripId(tid);

                // Nếu đã gán đúng vehicle này rồi -> cập nhật note/assignedAt (idempotent)
                TripVehicles same = null;
                for (TripVehicles tvOld : olds) {
                    if (tvOld.getVehicle() != null && tvOld.getVehicle().getId().equals(vehicle.getId())) {
                        same = tvOld;
                        break;
                    }
                }

                if (same != null) {
                    same.setAssignedAt(java.time.Instant.now());
                    same.setNote(request.getNote());
                    tripVehicleRepository.save(same);
                    // Xoá các mapping khác nếu tồn tại (đảm bảo chỉ còn 1)
                    for (TripVehicles tvOld : olds) {
                        if (!tvOld.getId().equals(same.getId())) {
                            tripVehicleRepository.delete(tvOld);
                        }
                    }
                    tripVehicleRepository.flush();
                } else {
                    // Chưa có -> xoá tất cả cũ rồi tạo mới
                    if (!olds.isEmpty()) {
                        tripVehicleRepository.deleteAll(olds);
                        tripVehicleRepository.flush();
                    }
                    TripVehicles tv = new TripVehicles();
                    Trips trip = trips.stream().filter(t -> t.getId().equals(tid)).findFirst().orElseThrow();
                    tv.setTrip(trip);
                    tv.setVehicle(vehicle);
                    tv.setAssignedAt(java.time.Instant.now());
                    tv.setNote(request.getNote());
                    tripVehicleRepository.save(tv);
                }
            }
        }

        return getById(bookingId);
    }

    @Override
    public org.example.ptcmssbackend.dto.response.Booking.CheckAvailabilityResponse checkAvailability(CheckAvailabilityRequest request) {
        Integer branchId = request.getBranchId();
        Integer categoryId = request.getCategoryId();
        java.time.Instant start = request.getStartTime();
        java.time.Instant end = request.getEndTime();
        int needed = request.getQuantity() != null ? request.getQuantity() : 1;

        // Total candidates available by branch/category/status
        java.util.List<Vehicles> candidates = vehicleRepository.filterVehicles(categoryId, branchId, VehicleStatus.AVAILABLE);
        int total = candidates != null ? candidates.size() : 0;

        // Busy vehicles in window
        java.util.List<Integer> busyIds = tripVehicleRepository.findBusyVehicleIds(branchId, categoryId, start, end);
        int busy = busyIds != null ? busyIds.size() : 0;

        int available = Math.max(0, total - busy);
        boolean ok = available >= needed;

        return org.example.ptcmssbackend.dto.response.Booking.CheckAvailabilityResponse.builder()
                .ok(ok)
                .availableCount(available)
                .needed(needed)
                .totalCandidates(total)
                .busyCount(busy)
                .build();
    }

    private BookingResponse toResponse(Bookings booking) {
        // Load trips
        List<Trips> trips = tripRepository.findByBooking_Id(booking.getId());

        // Load vehicle details
        List<BookingVehicleDetails> vehicleDetails = bookingVehicleDetailsRepository.findByBookingId(booking.getId());

        // Load trip drivers và vehicles (nếu đã gán)
        List<TripResponse> tripResponses = trips.stream().map(trip -> {
            // Tìm driver và vehicle cho trip này
            Integer driverId = null;
            String driverName = null;
            Integer vehicleId = null;
            String vehicleLicensePlate = null;

            // Tìm driver và vehicle từ TripDrivers và TripVehicles
            List<TripDrivers> tripDrivers = tripDriverRepository.findByTripId(trip.getId());
            if (!tripDrivers.isEmpty()) {
                TripDrivers td = tripDrivers.get(0); // Lấy driver đầu tiên
                driverId = td.getDriver().getId();
                if (td.getDriver().getEmployee() != null && td.getDriver().getEmployee().getUser() != null) {
                    driverName = td.getDriver().getEmployee().getUser().getFullName();
                }
            }

            List<TripVehicles> tripVehicles = tripVehicleRepository.findByTripId(trip.getId());
            if (!tripVehicles.isEmpty()) {
                TripVehicles tv = tripVehicles.get(0); // Lấy vehicle đầu tiên
                vehicleId = tv.getVehicle().getId();
                vehicleLicensePlate = tv.getVehicle().getLicensePlate();
            }

            return TripResponse.builder()
                    .id(trip.getId())
                    .bookingId(booking.getId())
                    .startTime(trip.getStartTime())
                    .endTime(trip.getEndTime())
                    .startLocation(trip.getStartLocation())
                    .endLocation(trip.getEndLocation())
                    .distance(trip.getDistance() != null ? trip.getDistance().doubleValue() : null)
                    .useHighway(trip.getUseHighway())
                    .status(trip.getStatus() != null ? trip.getStatus().name() : null)
                    .driverId(driverId)
                    .driverName(driverName)
                    .vehicleId(vehicleId)
                    .vehicleLicensePlate(vehicleLicensePlate)
                    .build();
        }).collect(Collectors.toList());

        // Tính paidAmount và remainingAmount từ Invoices
        BigDecimal paidAmount = invoiceRepository.calculatePaidAmountByBookingId(
                booking.getId(),
                InvoiceType.INCOME,
                PaymentStatus.PAID);
        if (paidAmount == null) paidAmount = BigDecimal.ZERO;
        BigDecimal remainingAmount = booking.getTotalCost() != null
                ? booking.getTotalCost().subtract(paidAmount)
                : BigDecimal.ZERO;
        if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
            remainingAmount = BigDecimal.ZERO;
        }

        return BookingResponse.builder()
                .id(booking.getId())
                .customer(customerService.toResponse(booking.getCustomer()))
                .branchId(booking.getBranch().getId())
                .branchName(booking.getBranch().getBranchName())
                .consultantId(booking.getConsultant() != null ? booking.getConsultant().getEmployeeId() : null)
                .consultantName(booking.getConsultant() != null && booking.getConsultant().getUser() != null
                        ? booking.getConsultant().getUser().getFullName() : null)
                .hireTypeId(booking.getHireType() != null ? booking.getHireType().getId() : null)
                .hireTypeName(booking.getHireType() != null ? booking.getHireType().getName() : null)
                .useHighway(booking.getUseHighway())
                .bookingDate(booking.getBookingDate())
                .estimatedCost(booking.getEstimatedCost())
                .discountAmount(booking.getEstimatedCost() != null && booking.getTotalCost() != null
                        ? booking.getEstimatedCost().subtract(booking.getTotalCost())
                        : BigDecimal.ZERO)
                .totalCost(booking.getTotalCost())
                .depositAmount(booking.getDepositAmount())
                .status(booking.getStatus() != null ? booking.getStatus().name() : null)
                .note(booking.getNote())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .trips(tripResponses)
                .vehicles(vehicleDetails.stream().map(vd -> VehicleDetailResponse.builder()
                        .vehicleCategoryId(vd.getVehicleCategory().getId())
                        .categoryName(vd.getVehicleCategory().getCategoryName())
                        .quantity(vd.getQuantity())
                        .capacity(null) // TODO: Lấy từ Vehicles nếu có
                        .build()).collect(Collectors.toList()))
                .paidAmount(paidAmount)
                .remainingAmount(remainingAmount)
                .build();
    }

    private BookingListResponse toListResponse(Bookings booking) {
        // Tạo route summary từ trips
        List<Trips> trips = tripRepository.findByBooking_Id(booking.getId());

        String routeSummary = trips.isEmpty() ? "Chưa có lịch trình" :
                trips.stream()
                        .map(t -> (t.getStartLocation() != null ? t.getStartLocation() : "?") +
                                " → " +
                                (t.getEndLocation() != null ? t.getEndLocation() : "?"))
                        .collect(Collectors.joining(", "));

        Instant startDate = trips.stream()
                .map(Trips::getStartTime)
                .filter(java.util.Objects::nonNull)
                .min(Instant::compareTo)
                .orElse(null);

        // Tính paidAmount từ invoices
        BigDecimal paidAmount = invoiceRepository.calculatePaidAmountByBookingId(
                booking.getId(),
                InvoiceType.INCOME,
                PaymentStatus.PAID);
        if (paidAmount == null) paidAmount = BigDecimal.ZERO;

        return BookingListResponse.builder()
                .id(booking.getId())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .routeSummary(routeSummary)
                .startDate(startDate)
                .totalCost(booking.getTotalCost())
                .depositAmount(booking.getDepositAmount())
                .paidAmount(paidAmount)
                .status(booking.getStatus() != null ? booking.getStatus().name() : null)
                .createdAt(booking.getCreatedAt())
                .consultantId(booking.getConsultant() != null ? booking.getConsultant().getEmployeeId() : null)
                .consultantName(booking.getConsultant() != null && booking.getConsultant().getUser() != null
                        ? booking.getConsultant().getUser().getFullName() : null)
                .build();
    }
}
