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
    private final TripVehicleRepository tripVehicleRepository;
    private final InvoiceRepository invoiceRepository;
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;

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
            estimatedCost = calculatePrice(
                    categoryIds,
                    quantities,
                    request.getDistance(),
                    request.getUseHighway()
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
        booking.setDepositAmount(request.getDepositAmount() != null ? request.getDepositAmount() : BigDecimal.ZERO);
        booking.setStatus(parseBookingStatus(request.getStatus()));
        booking.setNote(request.getNote());

        booking = bookingRepository.save(booking);
        log.info("[BookingService] Created booking: {}", booking.getId());

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
            BigDecimal estimatedCost = calculatePrice(
                    categoryIds,
                    quantities,
                    request.getDistance(),
                    request.getUseHighway() != null ? request.getUseHighway() : booking.getUseHighway()
            );
            booking.setEstimatedCost(estimatedCost);
        } else if (request.getEstimatedCost() != null) {
            booking.setEstimatedCost(request.getEstimatedCost());
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
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
    }

    @Override
    public BigDecimal calculatePrice(
            List<Integer> vehicleCategoryIds,
            List<Integer> quantities,
            Double distance,
            Boolean useHighway
    ) {
        if (vehicleCategoryIds == null || vehicleCategoryIds.isEmpty()) {
            return BigDecimal.ZERO;
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

            // Tính giá cho 1 xe: baseFare + (pricePerKm * distance) + highwayFee (nếu có)
            BigDecimal baseFare = category.getBaseFare() != null ? category.getBaseFare() : BigDecimal.ZERO;
            BigDecimal pricePerKm = category.getPricePerKm() != null ? category.getPricePerKm() : BigDecimal.ZERO;
            BigDecimal highwayFee = category.getHighwayFee() != null ? category.getHighwayFee() : BigDecimal.ZERO;
            BigDecimal fixedCosts = category.getFixedCosts() != null ? category.getFixedCosts() : BigDecimal.ZERO;

            BigDecimal priceForOneVehicle = baseFare;

            if (distance != null && distance > 0 && pricePerKm.compareTo(BigDecimal.ZERO) > 0) {
                priceForOneVehicle = priceForOneVehicle.add(
                        pricePerKm.multiply(BigDecimal.valueOf(distance))
                );
            }

            if (useHighway != null && useHighway && highwayFee.compareTo(BigDecimal.ZERO) > 0) {
                priceForOneVehicle = priceForOneVehicle.add(highwayFee);
            }

            if (fixedCosts.compareTo(BigDecimal.ZERO) > 0) {
                priceForOneVehicle = priceForOneVehicle.add(fixedCosts);
            }

            // Nhân với số lượng
            BigDecimal priceForThisCategory = priceForOneVehicle.multiply(BigDecimal.valueOf(quantity));
            totalPrice = totalPrice.add(priceForThisCategory);
        }

        return totalPrice.setScale(2, RoundingMode.HALF_UP);
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

        Invoices inv = new Invoices();
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

        return BookingListResponse.builder()
                .id(booking.getId())
                .customerName(booking.getCustomer().getFullName())
                .customerPhone(booking.getCustomer().getPhone())
                .routeSummary(routeSummary)
                .startDate(startDate)
                .totalCost(booking.getTotalCost())
                .status(booking.getStatus() != null ? booking.getStatus().name() : null)
                .createdAt(booking.getCreatedAt())
                .consultantId(booking.getConsultant() != null ? booking.getConsultant().getEmployeeId() : null)
                .consultantName(booking.getConsultant() != null && booking.getConsultant().getUser() != null
                        ? booking.getConsultant().getUser().getFullName() : null)
                .build();
    }
}
