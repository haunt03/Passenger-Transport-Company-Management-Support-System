package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.RecordPaymentRequest;
import org.example.ptcmssbackend.dto.request.Invoice.SendInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.VoidInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.dto.response.Invoice.PaymentHistoryResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.enums.PaymentConfirmationStatus;
import org.example.ptcmssbackend.exception.InvoiceException;
import org.example.ptcmssbackend.exception.PaymentException;
import org.example.ptcmssbackend.exception.ResourceNotFoundException;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.InvoiceService;
import org.example.ptcmssbackend.service.SystemSettingService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    // Sử dụng timezone cố định để tránh lỗi khi deploy lên VPS (timezone khác với local)
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final InvoiceRepository invoiceRepository;
    private final BranchesRepository branchesRepository;
    private final CustomerRepository customerRepository;
    private final BookingRepository bookingRepository;
    private final EmployeeRepository employeeRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final org.example.ptcmssbackend.service.EmailService emailService;
    private final org.example.ptcmssbackend.repository.NotificationRepository notificationRepository;
    private final org.example.ptcmssbackend.service.WebSocketNotificationService webSocketNotificationService;
    private final TripRepository tripRepository;
    private final TripDriverRepository tripDriverRepository;
    private final BookingVehicleDetailsRepository bookingVehicleDetailsRepository;
    private final SystemSettingService systemSettingService;

    @Override
    @Transactional
    public InvoiceResponse createInvoice(CreateInvoiceRequest request) {
        log.info("[InvoiceService] Creating invoice for branch: {}", request.getBranchId());

        // Load entities
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + request.getBranchId()));

        Customers customer = request.getCustomerId() != null
                ? customerRepository.findById(request.getCustomerId()).orElse(null)
                : null;

        Bookings booking = request.getBookingId() != null
                ? bookingRepository.findById(request.getBookingId()).orElse(null)
                : null;

        Employees createdBy = request.getCreatedBy() != null
                ? employeeRepository.findById(request.getCreatedBy()).orElse(null)
                : null;

        // Create invoice
        Invoices invoice = new Invoices();
        invoice.setBranch(branch);
        invoice.setCustomer(customer);
        invoice.setBooking(booking);
        // Convert string to InvoiceType
        InvoiceType invoiceType;
        try {
            invoiceType = InvoiceType.valueOf(request.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Loại hóa đơn không hợp lệ: " + request.getType());
        }
        invoice.setType(invoiceType);
        invoice.setIsDeposit(request.getIsDeposit() != null ? request.getIsDeposit() : false);
        invoice.setAmount(request.getAmount());
        invoice.setPaymentTerms(request.getPaymentTerms() != null ? request.getPaymentTerms() : "NET_7");
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        invoice.setCreatedBy(createdBy);
        invoice.setNote(request.getNote());

        // Set due date:
        // Ưu tiên: request.dueDate
        // Nếu gắn với booking: dùng endTime của trip + setting DUE_DATE_DEBT_DAYS (mặc định 7)
        // Nếu không có, fallback theo paymentTerms + invoiceDate
        LocalDate dueDate = request.getDueDate();
        if (dueDate == null) {
            LocalDate baseDate = null;

            // Nếu có booking, lấy endTime mới nhất của trip
            if (request.getBookingId() != null) {
                var trips = tripRepository.findByBooking_Id(request.getBookingId());
                Instant latestEnd = trips.stream()
                        .filter(t -> t.getEndTime() != null)
                        .map(Trips::getEndTime)
                        .max(Instant::compareTo)
                        .orElse(null);
                if (latestEnd != null) {
                    baseDate = latestEnd.atZone(ZoneId.systemDefault()).toLocalDate();
                }
            }

            // Fallback: dùng invoiceDate (creation timestamp)
            if (baseDate == null && invoice.getInvoiceDate() != null) {
                baseDate = invoice.getInvoiceDate().atZone(ZoneId.systemDefault()).toLocalDate();
            }

            if (baseDate != null) {
                int extraDays = getSystemSettingInt("DUE_DATE_DEBT_DAYS", 7);
                dueDate = baseDate.plusDays(extraDays);
            } else {
                // Fallback cuối: paymentTerms
                LocalDate invoiceLocalDate = invoice.getInvoiceDate().atZone(ZoneId.systemDefault()).toLocalDate();
                int days = getDaysFromPaymentTerms(invoice.getPaymentTerms());
                dueDate = invoiceLocalDate.plusDays(days);
            }
        }
        invoice.setDueDate(dueDate);

        // Generate invoice number
        LocalDate invoiceDate = invoice.getInvoiceDate() != null
                ? invoice.getInvoiceDate().atZone(VIETNAM_ZONE).toLocalDate()
                : LocalDate.now(VIETNAM_ZONE);
        invoice.setInvoiceNumber(generateInvoiceNumber(branch.getId(), invoiceDate));

        // Save
        invoice = invoiceRepository.save(invoice);

        log.info("[InvoiceService] Created invoice: {}", invoice.getInvoiceNumber());
        return mapToResponse(invoice);
    }

    @Override
    public InvoiceResponse getInvoiceById(Integer invoiceId) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
        return mapToResponse(invoice);
    }

    @Override
    public Page<InvoiceListResponse> getInvoices(
            Integer branchId, String type, String status, String paymentStatus,
            LocalDate startDate, LocalDate endDate, Integer customerId, String keyword, Pageable pageable) {

        InvoiceType invoiceType = null;
        if (type != null) {
            try {
                invoiceType = InvoiceType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Invalid type, keep as null
            }
        }
        InvoiceStatus invoiceStatus = status != null ? InvoiceStatus.valueOf(status.toUpperCase()) : null;
        PaymentStatus paymentStatusEnum = paymentStatus != null ? PaymentStatus.valueOf(paymentStatus.toUpperCase()) : null;

        Instant startInstant = startDate != null ? startDate.atStartOfDay(ZoneId.systemDefault()).toInstant() : null;
        Instant endInstant = endDate != null ? endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant() : null;

        List<Invoices> invoices = invoiceRepository.findInvoicesWithFilters(
                branchId, invoiceType, invoiceStatus, startInstant, endInstant, customerId, paymentStatusEnum);

        // Filter: Loại bỏ các invoice chỉ có payment PENDING (chưa có payment CONFIRMED nào)
        // Logic: Invoice chỉ xuất hiện trong danh sách khi:
        // - Có ít nhất 1 payment CONFIRMED, HOẶC
        // - Không có payment nào cả (invoice được tạo trước khi có payment)
        // Invoice chỉ có payment PENDING (chưa có CONFIRMED) thì không hiển thị
        invoices = invoices.stream()
                .filter(inv -> {
                    // Kiểm tra số lượng payment PENDING
                    Integer pendingCount = paymentHistoryRepository.countPendingPaymentsByInvoiceId(inv.getId());
                    boolean hasPending = pendingCount != null && pendingCount > 0;

                    // Kiểm tra số tiền đã CONFIRMED
                    BigDecimal confirmedAmount = paymentHistoryRepository.sumConfirmedByInvoiceId(inv.getId());
                    boolean hasConfirmed = confirmedAmount != null && confirmedAmount.compareTo(BigDecimal.ZERO) > 0;

                    // Nếu có payment PENDING nhưng không có payment CONFIRMED → không hiển thị
                    if (hasPending && !hasConfirmed) {
                        return false;
                    }

                    // Các trường hợp khác đều hiển thị:
                    // - Có payment CONFIRMED (có thể kèm theo PENDING)
                    // - Không có payment nào cả
                    return true;
                })
                .collect(Collectors.toList());

        // Filter by keyword if provided
        if (keyword != null && !keyword.trim().isEmpty()) {
            String keywordLower = keyword.trim().toLowerCase();
            invoices = invoices.stream()
                    .filter(inv -> {
                        String invoiceNo = (inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "").toLowerCase();
                        String customerName = (inv.getCustomer() != null && inv.getCustomer().getFullName() != null
                                ? inv.getCustomer().getFullName() : "").toLowerCase();
                        String bookingCode = "";
                        if (inv.getBooking() != null && inv.getBooking().getId() != null) {
                            bookingCode = ("ORD-" + inv.getBooking().getId()).toLowerCase();
                        }
                        return invoiceNo.contains(keywordLower)
                                || customerName.contains(keywordLower)
                                || bookingCode.contains(keywordLower);
                    })
                    .collect(Collectors.toList());
        }

        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), invoices.size());
        List<Invoices> pagedInvoices = invoices.subList(start, end);

        List<InvoiceListResponse> responses = pagedInvoices.stream()
                .map(this::mapToListResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, invoices.size());
    }

    @Override
    @Transactional
    public InvoiceResponse updateInvoice(Integer invoiceId, CreateInvoiceRequest request) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        // Don't allow update if already paid
        if (invoice.getPaymentStatus() == PaymentStatus.PAID) {
            throw new InvoiceException("Cannot update paid invoice");
        }

        // Update fields
        if (request.getAmount() != null) invoice.setAmount(request.getAmount());
        // subtotal và vatAmount đã được xóa
        if (request.getPaymentTerms() != null) invoice.setPaymentTerms(request.getPaymentTerms());
        if (request.getDueDate() != null) invoice.setDueDate(request.getDueDate());
        if (request.getNote() != null) invoice.setNote(request.getNote());

        invoice = invoiceRepository.save(invoice);
        return mapToResponse(invoice);
    }

    @Override
    @Transactional
    public void voidInvoice(Integer invoiceId, VoidInvoiceRequest request) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new org.example.ptcmssbackend.exception.InvoiceException("Invoice already cancelled");
        }

        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelledAt(Instant.now());
        invoice.setCancellationReason(request.getCancellationReason());

        if (request.getCancelledBy() != null) {
            Employees cancelledBy = employeeRepository.findById(request.getCancelledBy())
                    .orElse(null);
            invoice.setCancelledBy(cancelledBy);
        }

        invoiceRepository.save(invoice);
        log.info("[InvoiceService] Voided invoice: {}", invoice.getInvoiceNumber());
    }

    @Override
    public String generateInvoiceNumber(Integer branchId, LocalDate invoiceDate) {
        // Get branch code
        Branches branch = branchesRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + branchId));

        String branchCode = getBranchCode(branch.getId(), branch.getBranchName());
        String year = String.valueOf(invoiceDate.getYear());
        String pattern = "INV-" + branchCode + "-" + year + "-%";

        // Get max sequence
        Integer maxSeq = invoiceRepository.findMaxSequenceNumber(branchId, pattern);
        int nextSeq = (maxSeq != null ? maxSeq : 0) + 1;

        return String.format("INV-%s-%s-%04d", branchCode, year, nextSeq);
    }

    @Override
    @Transactional
    public PaymentHistoryResponse recordPayment(Integer invoiceId, RecordPaymentRequest request) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (invoice.getStatus() != InvoiceStatus.ACTIVE) {
            throw new org.example.ptcmssbackend.exception.InvoiceException("Cannot record payment for cancelled invoice");
        }

        BigDecimal balance = calculateBalance(invoiceId);
        if (request.getAmount().compareTo(balance) > 0) {
            throw new PaymentException(
                    "Payment amount (" + request.getAmount() + ") exceeds balance (" + balance + ")");
        }

        // Create payment history
        PaymentHistory payment = new PaymentHistory();
        payment.setInvoice(invoice);
        payment.setPaymentDate(Instant.now());
        payment.setAmount(request.getAmount());
        payment.setPaymentMethod(request.getPaymentMethod());
        // Set confirmation status: mặc định PENDING, nếu request có thì dùng request
        if (request.getConfirmationStatus() != null) {
            try {
                payment.setConfirmationStatus(PaymentConfirmationStatus.valueOf(request.getConfirmationStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);
            }
        } else {
            payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);
        }
        payment.setBankName(request.getBankName());
        payment.setBankAccount(request.getBankAccount());
        payment.setReferenceNumber(request.getReferenceNumber());
        payment.setCashierName(request.getCashierName());
        payment.setReceiptNumber(request.getReceiptNumber());
        payment.setNote(request.getNote());

        if (request.getCreatedBy() != null) {
            Employees createdBy = employeeRepository.findById(request.getCreatedBy()).orElse(null);
            payment.setCreatedBy(createdBy);
        }

        payment = paymentHistoryRepository.save(payment);

        // Gửi thông báo cho Accountant nếu payment có status PENDING (cần xác nhận)
        if (payment.getConfirmationStatus() == PaymentConfirmationStatus.PENDING) {
            notifyAccountantsAboutPendingPayment(invoice, payment);
        }

        // Update invoice payment status
        BigDecimal newBalance = calculateBalance(invoiceId);
        if (newBalance.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setPaymentStatus(PaymentStatus.PAID);
        }

        invoiceRepository.save(invoice);

        return mapToPaymentHistoryResponse(payment);
    }

    @Override
    public List<PaymentHistoryResponse> getPaymentHistory(Integer invoiceId) {
        List<PaymentHistory> payments = paymentHistoryRepository.findAllByInvoiceId(invoiceId);
        return payments.stream()
                .map(this::mapToPaymentHistoryResponse)
                .collect(Collectors.toList());
    }

    @Override
    public BigDecimal calculateBalance(Integer invoiceId) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        // Chỉ tính các payment đã được xác nhận (CONFIRMED)
        BigDecimal totalPaid = paymentHistoryRepository.sumConfirmedByInvoiceId(invoiceId);
        return invoice.getAmount().subtract(totalPaid != null ? totalPaid : BigDecimal.ZERO);
    }

    @Override
    @Transactional
    public void markAsPaid(Integer invoiceId) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
        invoice.setPaymentStatus(PaymentStatus.PAID);
        invoiceRepository.save(invoice);
    }

    @Override
    @Transactional
    public void markAsOverdue(Integer invoiceId) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
        invoice.setPaymentStatus(PaymentStatus.OVERDUE);
        invoiceRepository.save(invoice);
    }

    @Override
    @Transactional
    public void sendInvoice(Integer invoiceId, SendInvoiceRequest request) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        invoice.setSentAt(Instant.now());
        invoice.setSentToEmail(request.getEmail());
        invoiceRepository.save(invoice);

        // Send email with invoice
        try {
            String customerName = invoice.getCustomer() != null ? invoice.getCustomer().getFullName() : "Quý khách";
            String amount = invoice.getAmount().toString();
            String dueDate = invoice.getDueDate() != null ? invoice.getDueDate().toString() : "N/A";
            String invoiceUrl = ""; // TODO: Generate invoice PDF URL if needed
            String note = request.getMessage() != null ? request.getMessage() : invoice.getNote();

            emailService.sendInvoiceEmail(
                    request.getEmail(),
                    customerName,
                    invoice.getInvoiceNumber(),
                    amount,
                    dueDate,
                    invoiceUrl,
                    note
            );
            log.info("[InvoiceService] Invoice {} sent to {}", invoice.getInvoiceNumber(), request.getEmail());
        } catch (Exception e) {
            log.error("[InvoiceService] Failed to send invoice email: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể gửi email: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean isOverdue(Integer invoiceId) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (invoice.getDueDate() == null || invoice.getPaymentStatus() == PaymentStatus.PAID) {
            return false;
        }

        return invoice.getDueDate().isBefore(LocalDate.now(VIETNAM_ZONE));
    }

    @Override
    @Transactional
    public void checkAndUpdateOverdueInvoices() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        List<Invoices> unpaidInvoices = invoiceRepository.findUnpaidInvoicesBeforeDate(today, null);

        unpaidInvoices.forEach(invoice -> {
            if (invoice.getDueDate() != null && invoice.getDueDate().isBefore(today)) {
                invoice.setPaymentStatus(PaymentStatus.OVERDUE);
                invoiceRepository.save(invoice);
                log.info("[InvoiceService] Marked invoice {} as overdue", invoice.getInvoiceNumber());
            }
        });
    }

    // Helper methods
    private InvoiceResponse mapToResponse(Invoices invoice) {
        InvoiceResponse response = new InvoiceResponse();
        response.setInvoiceId(invoice.getId());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setBranchId(invoice.getBranch().getId());
        response.setBranchName(invoice.getBranch().getBranchName());
        response.setBookingId(invoice.getBooking() != null ? invoice.getBooking().getId() : null);
        response.setCustomerId(invoice.getCustomer() != null ? invoice.getCustomer().getId() : null);
        response.setCustomerName(invoice.getCustomer() != null ? invoice.getCustomer().getFullName() : null);
        response.setCustomerPhone(invoice.getCustomer() != null ? invoice.getCustomer().getPhone() : null);
        response.setCustomerEmail(invoice.getCustomer() != null ? invoice.getCustomer().getEmail() : null);
        response.setType(invoice.getType().toString());
        response.setIsDeposit(invoice.getIsDeposit());
        response.setAmount(invoice.getAmount());
        response.setPaymentStatus(invoice.getPaymentStatus().toString());
        response.setStatus(invoice.getStatus().toString());
        response.setPaymentTerms(invoice.getPaymentTerms());
        response.setDueDate(invoice.getDueDate());
        response.setInvoiceDate(invoice.getInvoiceDate());
        response.setCreatedAt(invoice.getCreatedAt());
        response.setPromiseToPayDate(invoice.getPromiseToPayDate());
        response.setDebtLabel(invoice.getDebtLabel());
        response.setContactNote(invoice.getContactNote());
        response.setCancelledAt(invoice.getCancelledAt());
        response.setCancellationReason(invoice.getCancellationReason());
        response.setSentAt(invoice.getSentAt());
        response.setSentToEmail(invoice.getSentToEmail());
        response.setNote(invoice.getNote());
        response.setImg(invoice.getImg());

        // Calculate balance
        // Chỉ tính các payment đã được xác nhận (CONFIRMED)
        BigDecimal paidAmount = paymentHistoryRepository.sumConfirmedByInvoiceId(invoice.getId());
        response.setPaidAmount(paidAmount != null ? paidAmount : BigDecimal.ZERO);
        response.setBalance(calculateBalance(invoice.getId()));

        // Calculate days overdue
        if (invoice.getDueDate() != null && invoice.getPaymentStatus() != PaymentStatus.PAID) {
            LocalDate today = LocalDate.now(VIETNAM_ZONE);
            if (invoice.getDueDate().isBefore(today)) {
                response.setDaysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today));
            }
        }

        // Đếm số payment requests đang chờ xác nhận
        Integer pendingCount = paymentHistoryRepository.countPendingPaymentsByInvoiceId(invoice.getId());
        response.setPendingPaymentCount(pendingCount != null ? pendingCount : 0);

        return response;
    }

    private InvoiceListResponse mapToListResponse(Invoices invoice) {
        InvoiceListResponse response = new InvoiceListResponse();
        response.setInvoiceId(invoice.getId());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setBranchId(invoice.getBranch().getId());
        response.setBranchName(invoice.getBranch().getBranchName());
        response.setCustomerId(invoice.getCustomer() != null ? invoice.getCustomer().getId() : null);
        response.setCustomerName(invoice.getCustomer() != null ? invoice.getCustomer().getFullName() : null);
        response.setCustomerPhone(invoice.getCustomer() != null ? invoice.getCustomer().getPhone() : null);
        response.setCustomerEmail(invoice.getCustomer() != null ? invoice.getCustomer().getEmail() : null);
        response.setBookingId(invoice.getBooking() != null ? invoice.getBooking().getId() : null);
        response.setType(invoice.getType().toString());
        response.setAmount(invoice.getAmount());
        response.setDueDate(invoice.getDueDate());
        response.setPaymentStatus(invoice.getPaymentStatus().toString());
        response.setStatus(invoice.getStatus().toString());
        response.setInvoiceDate(invoice.getInvoiceDate());

        // Chỉ tính các payment đã được xác nhận (CONFIRMED)
        BigDecimal paidAmount = paymentHistoryRepository.sumConfirmedByInvoiceId(invoice.getId());
        response.setPaidAmount(paidAmount != null ? paidAmount : BigDecimal.ZERO);
        response.setBalance(calculateBalance(invoice.getId()));

        if (invoice.getDueDate() != null && invoice.getPaymentStatus() != PaymentStatus.PAID) {
            LocalDate today = LocalDate.now(VIETNAM_ZONE);
            if (invoice.getDueDate().isBefore(today)) {
                response.setDaysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today));
            }
        }

        // Đếm số payment requests đang chờ xác nhận
        Integer pendingCount = paymentHistoryRepository.countPendingPaymentsByInvoiceId(invoice.getId());
        response.setPendingPaymentCount(pendingCount != null ? pendingCount : 0);

        return response;
    }

    private PaymentHistoryResponse mapToPaymentHistoryResponse(PaymentHistory payment) {
        PaymentHistoryResponse response = new PaymentHistoryResponse();
        response.setPaymentId(payment.getId());
        response.setInvoiceId(payment.getInvoice().getId());
        response.setPaymentDate(payment.getPaymentDate());
        response.setAmount(payment.getAmount());
        response.setPaymentMethod(payment.getPaymentMethod());
        response.setConfirmationStatus(payment.getConfirmationStatus() != null ? payment.getConfirmationStatus().name() : "PENDING");
        response.setBankName(payment.getBankName());
        response.setBankAccount(payment.getBankAccount());
        response.setReferenceNumber(payment.getReferenceNumber());
        response.setCashierName(payment.getCashierName());
        response.setReceiptNumber(payment.getReceiptNumber());
        response.setNote(payment.getNote());
        if (payment.getCreatedBy() != null && payment.getCreatedBy().getUser() != null) {
            response.setCreatedByName(payment.getCreatedBy().getUser().getFullName());
        }
        response.setCreatedAt(payment.getCreatedAt());
        return response;
    }

    private String getBranchCode(Integer branchId, String branchName) {
        // Simple mapping - can be improved
        if (branchName != null) {
            if (branchName.contains("Hà Nội") || branchName.contains("Ha Noi")) return "HN";
            if (branchName.contains("Đà Nẵng") || branchName.contains("Da Nang")) return "DN";
            if (branchName.contains("HCM") || branchName.contains("TP. HCM")) return "HCM";
            if (branchName.contains("Hải Phòng") || branchName.contains("Hai Phong")) return "HP";
            if (branchName.contains("Quảng Ninh") || branchName.contains("Quang Ninh")) return "QN";
        }
        return String.format("B%02d", branchId);
    }

    private int getSystemSettingInt(String key, int defaultValue) {
        try {
            var setting = systemSettingService.getByKey(key);
            if (setting != null && setting.getSettingValue() != null) {
                return Integer.parseInt(setting.getSettingValue());
            }
        } catch (Exception e) {
            log.warn("[InvoiceService] Cannot read system setting {}: {}", key, e.getMessage());
        }
        return defaultValue;
    }

    @Override
    @Transactional
    public PaymentHistoryResponse confirmPayment(Integer paymentId, String status) {
        log.info("[InvoiceService] confirmPayment - paymentId: {}, status: {}", paymentId, status);
        PaymentHistory payment = paymentHistoryRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán: " + paymentId));

        try {
            PaymentConfirmationStatus confirmationStatus = PaymentConfirmationStatus.valueOf(status.toUpperCase());
            payment.setConfirmationStatus(confirmationStatus);
            payment = paymentHistoryRepository.save(payment);
            log.info("[InvoiceService] Payment {} confirmation status updated to {}", paymentId, confirmationStatus);

            // Update invoice payment status nếu cần
            Invoices invoice = payment.getInvoice();
            if (invoice != null) {
                BigDecimal newBalance = calculateBalance(invoice.getId());
                if (newBalance.compareTo(BigDecimal.ZERO) <= 0) {
                    invoice.setPaymentStatus(PaymentStatus.PAID);

                    // Khi invoice được thanh toán đủ → Booking chuyển sang COMPLETED
                    if (invoice.getBooking() != null) {
                        Bookings booking = invoice.getBooking();
                        if (booking.getStatus() != BookingStatus.COMPLETED && booking.getStatus() != BookingStatus.CANCELLED) {
                            booking.setStatus(BookingStatus.COMPLETED);
                            bookingRepository.save(booking);
                            log.info("[InvoiceService] Booking {} marked as COMPLETED after full payment", booking.getId());
                        }
                    }
                } else {
                    // Nếu có payment bị reject, có thể cần update lại status
                    if (invoice.getPaymentStatus() == PaymentStatus.PAID && newBalance.compareTo(BigDecimal.ZERO) > 0) {
                        invoice.setPaymentStatus(PaymentStatus.UNPAID);
                    }
                }
                invoiceRepository.save(invoice);

                // Xử lý deposit: Khi deposit được confirm, cập nhật booking status và tạo trips
                if (invoice.getBooking() != null && Boolean.TRUE.equals(invoice.getIsDeposit())
                        && confirmationStatus == PaymentConfirmationStatus.CONFIRMED) {
                    Bookings booking = invoice.getBooking();

                    // 1. Cập nhật booking status thành CONFIRMED nếu chưa phải CONFIRMED hoặc COMPLETED
                    if (booking.getStatus() != BookingStatus.CONFIRMED
                            && booking.getStatus() != BookingStatus.COMPLETED
                            && booking.getStatus() != BookingStatus.CANCELLED) {
                        booking.setStatus(BookingStatus.CONFIRMED);
                        bookingRepository.save(booking);
                        log.info("[InvoiceService] Booking {} status updated to CONFIRMED after deposit confirmation", booking.getId());
                    }

                    // 2. Tạo trips nếu chưa có (dựa trên BookingVehicleDetails)
                    List<Trips> existingTrips = tripRepository.findByBooking_Id(booking.getId());
                    if (existingTrips.isEmpty()) {
                        // Lấy thông tin vehicles từ BookingVehicleDetails
                        List<BookingVehicleDetails> vehicleDetails = bookingVehicleDetailsRepository.findByBookingId(booking.getId());
                        int requiredTrips = vehicleDetails.stream()
                                .mapToInt(bvd -> bvd.getQuantity() != null ? bvd.getQuantity() : 0)
                                .sum();

                        if (requiredTrips > 0) {
                            // Tạo trips mặc định (chưa có trips nào, nên không có template)
                            // Thông tin chi tiết (startTime, endTime, locations) sẽ được cập nhật sau khi có thông tin từ booking
                            List<Trips> newTrips = new java.util.ArrayList<>();
                            for (int i = 0; i < requiredTrips; i++) {
                                Trips trip = new Trips();
                                trip.setBooking(booking);
                                trip.setUseHighway(booking.getUseHighway());
                                trip.setStatus(org.example.ptcmssbackend.enums.TripStatus.SCHEDULED);
                                // startTime, endTime, locations sẽ được cập nhật sau khi có thông tin từ booking hoặc từ consultant
                                newTrips.add(trip);
                            }
                            // Batch save để tối ưu performance trên VPS
                            tripRepository.saveAll(newTrips);
                            log.info("[InvoiceService] Created {} trips for booking {} after deposit confirmation", requiredTrips, booking.getId());
                        }
                    } else {
                        // Kiểm tra xem số trips có đủ không
                        List<BookingVehicleDetails> vehicleDetails = bookingVehicleDetailsRepository.findByBookingId(booking.getId());
                        int requiredTrips = vehicleDetails.stream()
                                .mapToInt(bvd -> bvd.getQuantity() != null ? bvd.getQuantity() : 0)
                                .sum();

                        if (existingTrips.size() < requiredTrips) {
                            // Tạo thêm trips nếu thiếu
                            Trips template = existingTrips.get(0);
                            int needMore = requiredTrips - existingTrips.size();
                            List<Trips> newTrips = new java.util.ArrayList<>();
                            for (int i = 0; i < needMore; i++) {
                                Trips clone = new Trips();
                                clone.setBooking(booking);
                                clone.setUseHighway(template.getUseHighway());
                                clone.setStartTime(template.getStartTime());
                                clone.setEndTime(template.getEndTime());
                                clone.setStartLocation(template.getStartLocation());
                                clone.setEndLocation(template.getEndLocation());
                                clone.setDistance(template.getDistance());
                                clone.setIncidentalCosts(template.getIncidentalCosts());
                                clone.setStatus(org.example.ptcmssbackend.enums.TripStatus.SCHEDULED);
                                newTrips.add(clone);
                            }
                            // Batch save để tối ưu performance trên VPS
                            tripRepository.saveAll(newTrips);
                            log.info("[InvoiceService] Created {} additional trips for booking {} after deposit confirmation", needMore, booking.getId());
                        }
                    }
                }
            }

            // Send WebSocket notifications to Driver (người tạo payment request)
            try {
                Integer bookingId = invoice != null && invoice.getBooking() != null ? invoice.getBooking().getId() : null;
                String amountFormatted = formatAmount(payment.getAmount());
                String statusText = confirmationStatus == PaymentConfirmationStatus.CONFIRMED ? "đã được duyệt" : "đã bị từ chối";
                String notificationType = confirmationStatus == PaymentConfirmationStatus.CONFIRMED ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED";
                String notificationTitle = confirmationStatus == PaymentConfirmationStatus.CONFIRMED
                        ? "Thanh toán đã được duyệt"
                        : "Thanh toán đã bị từ chối";

                // Gửi notification đến Driver (người tạo payment request)
                // Ưu tiên: invoice.getRequestedBy() (driver) > driver từ booking > payment.getCreatedBy() (employee)
                Integer driverUserId = null;

                // Tìm driver từ booking (driver được assign cho trip của booking)
                if (bookingId != null && invoice != null && invoice.getBooking() != null) {
                    try {
                        // Tìm trips của booking
                        List<Trips> trips = tripRepository.findByBooking_Id(bookingId);
                        if (trips != null && !trips.isEmpty()) {
                            // Lấy trip đầu tiên và tìm driver
                            Trips firstTrip = trips.get(0);
                            List<TripDrivers> tripDrivers = tripDriverRepository.findByTripId(firstTrip.getId());
                            if (tripDrivers != null && !tripDrivers.isEmpty()) {
                                TripDrivers tripDriver = tripDrivers.get(0);
                                if (tripDriver.getDriver() != null && tripDriver.getDriver().getEmployee() != null
                                        && tripDriver.getDriver().getEmployee().getUser() != null) {
                                    driverUserId = tripDriver.getDriver().getEmployee().getUser().getId();
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("[InvoiceService] Could not find driver from booking: {}", e.getMessage());
                    }
                }
                // Cách 3: Fallback - từ payment.getCreatedBy() (employee)
                if (driverUserId == null && payment.getCreatedBy() != null && payment.getCreatedBy().getUser() != null) {
                    driverUserId = payment.getCreatedBy().getUser().getId();
                }

                if (driverUserId != null) {
                    String notificationMessage = String.format("Yêu cầu thanh toán %s cho đơn #%d %s",
                            amountFormatted,
                            bookingId != null ? bookingId : "N/A",
                            statusText);

                    webSocketNotificationService.sendUserNotification(
                            driverUserId,
                            notificationTitle,
                            notificationMessage,
                            notificationType
                    );
                    log.info("[InvoiceService] Sent payment confirmation notification to driver/employee userId: {}", driverUserId);
                } else {
                    log.warn("[InvoiceService] Could not find driver/user to send payment confirmation notification for paymentId: {}", payment.getId());
                }

                // Gửi payment update qua global channel (cho các role khác như Coordinator, Manager)
                if (invoice != null) {
                    String paymentUpdateMessage = String.format("Thanh toán %s đã %s",
                            amountFormatted,
                            statusText);

                    webSocketNotificationService.sendPaymentUpdate(
                            invoice.getId(),
                            bookingId,
                            confirmationStatus.name(),
                            paymentUpdateMessage
                    );
                    log.info("[InvoiceService] Sent payment update notification for invoice: {}", invoice.getId());
                }
            } catch (Exception e) {
                log.warn("[InvoiceService] Failed to send WebSocket notification for payment confirmation", e);
                // Không throw exception để không ảnh hưởng đến flow chính
            }

            log.info("[InvoiceService] confirmPayment completed successfully for paymentId: {}", paymentId);
            return mapToPaymentHistoryResponse(payment);
        } catch (IllegalArgumentException e) {
            log.error("[InvoiceService] Invalid confirmation status: {}", status, e);
            throw new RuntimeException("Trạng thái xác nhận không hợp lệ: " + status + ". Phải là CONFIRMED hoặc REJECTED");
        } catch (Exception e) {
            log.error("[InvoiceService] Error in confirmPayment for paymentId: {}", paymentId, e);
            throw new RuntimeException("Lỗi khi xác nhận thanh toán: " + e.getMessage(), e);
        }
    }

    @Override
    public void deletePayment(Integer paymentId) {
        PaymentHistory payment = paymentHistoryRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thanh toán: " + paymentId));

        // Chỉ cho phép xóa payment có status PENDING
        if (payment.getConfirmationStatus() != PaymentConfirmationStatus.PENDING) {
            throw new RuntimeException("Chỉ được xóa payment request có trạng thái PENDING. Payment này đã " +
                    (payment.getConfirmationStatus() == PaymentConfirmationStatus.CONFIRMED ? "được xác nhận" : "bị từ chối"));
        }

        // Xóa payment
        paymentHistoryRepository.delete(payment);

        // Update invoice payment status nếu cần
        Invoices invoice = payment.getInvoice();
        if (invoice != null) {
            BigDecimal newBalance = calculateBalance(invoice.getId());
            if (newBalance.compareTo(invoice.getAmount()) >= 0) {
                // Nếu chưa có payment nào hoặc tất cả đã bị xóa
                invoice.setPaymentStatus(PaymentStatus.UNPAID);
            }
            invoiceRepository.save(invoice);
        }
    }

    private int getDaysFromPaymentTerms(String paymentTerms) {
        if (paymentTerms == null) return 7;
        switch (paymentTerms.toUpperCase()) {
            case "NET_7": return 7;
            case "NET_14": return 14;
            case "NET_30": return 30;
            case "NET_60": return 60;
            default: return 7;
        }
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "0đ";
        return String.format("%,dđ", amount.longValue());
    }

    @Override
    public List<PaymentHistoryResponse> getPendingPayments(Integer branchId) {
        log.info("[InvoiceService] Getting pending payments for branch: {}", branchId);
        List<PaymentHistory> payments = paymentHistoryRepository.findPendingPayments(branchId);
        return payments.stream()
                .map(this::mapToPaymentHistoryResponseWithInvoice)
                .collect(Collectors.toList());
    }

    @Override
    public Long countPendingPayments(Integer branchId) {
        return paymentHistoryRepository.countPendingPayments(branchId);
    }

    private PaymentHistoryResponse mapToPaymentHistoryResponseWithInvoice(PaymentHistory payment) {
        PaymentHistoryResponse response = mapToPaymentHistoryResponse(payment);
        // Add invoice info for context
        if (payment.getInvoice() != null) {
            Invoices invoice = payment.getInvoice();
            response.setInvoiceId(invoice.getId());
            response.setInvoiceNumber(invoice.getInvoiceNumber());
            if (invoice.getCustomer() != null) {
                response.setCustomerName(invoice.getCustomer().getFullName());
            }
            if (invoice.getBooking() != null) {
                response.setBookingId(invoice.getBooking().getId());
                response.setBookingCode("ORD-" + invoice.getBooking().getId());
            }
        }
        return response;
    }

    @Override
    @Transactional
    public void checkAndUpdateOverdueInvoicesAfter48h() {
        // Tí   nh thời điểm cutoff: 48h trước hiện tại
        Instant cutoffTime = Instant.now().minus(48, java.time.temporal.ChronoUnit.HOURS);

        log.info("[InvoiceService] Checking invoices with completed trips older than 48h (cutoff: {})", cutoffTime);

        // Tìm invoices chưa thanh toán đủ mà trip đã hoàn thành quá 48h
        List<Invoices> overdueInvoices = invoiceRepository.findUnpaidInvoicesWithCompletedTripsOlderThan(cutoffTime, null);

        int count = 0;
        for (Invoices invoice : overdueInvoices) {
            // Kiểm tra xem invoice có còn nợ không (tính payment đã CONFIRMED)
            BigDecimal balance = calculateBalance(invoice.getId());
            if (balance.compareTo(BigDecimal.ZERO) > 0) {
                // Còn nợ → đánh dấu OVERDUE (vào bảng công nợ)
                invoice.setPaymentStatus(PaymentStatus.OVERDUE);
                invoiceRepository.save(invoice);
                count++;
                log.info("[InvoiceService] Marked invoice {} as OVERDUE (48h after trip completion, balance: {})",
                        invoice.getInvoiceNumber(), balance);
            }
        }

        log.info("[InvoiceService] Marked {} invoices as OVERDUE after 48h check", count);
    }

    /**
     * Gửi thông báo cho tất cả Accountants trong chi nhánh khi có payment request mới cần xác nhận
     */
    private void notifyAccountantsAboutPendingPayment(Invoices invoice, PaymentHistory payment) {
        try {
            Integer branchId = invoice.getBranch().getId();
            String customerName = invoice.getCustomer() != null ? invoice.getCustomer().getFullName() : "Khách hàng";
            String amountStr = new java.text.DecimalFormat("#,###").format(payment.getAmount()) + " đ";

            // Tìm tất cả Accountants trong chi nhánh
            List<Employees> accountants = employeeRepository.findByRoleNameAndBranchId("Accountant", branchId);

            String title = "Yêu cầu thanh toán mới";
            String message = String.format(
                    "Có yêu cầu thanh toán %s từ %s cho hóa đơn %s cần xác nhận.",
                    amountStr,
                    customerName,
                    invoice.getInvoiceNumber()
            );

            for (Employees accountant : accountants) {
                if (accountant.getUser() != null) {
                    // 1. Lưu notification vào DB
                    org.example.ptcmssbackend.entity.Notifications notification = new org.example.ptcmssbackend.entity.Notifications();
                    notification.setUser(accountant.getUser());
                    notification.setTitle(title);
                    notification.setMessage(message);
                    notification.setIsRead(false);
                    notificationRepository.save(notification);

                    // 2. Gửi WebSocket notification để hiển thị realtime
                    try {
                        webSocketNotificationService.sendUserNotification(
                                accountant.getUser().getId(),
                                title,
                                message,
                                "INFO"
                        );
                        log.debug("[InvoiceService] Sent WebSocket notification to accountant: {}", accountant.getUser().getUsername());
                    } catch (Exception wsErr) {
                        log.warn("[InvoiceService] Failed to send WebSocket notification to accountant {}: {}",
                                accountant.getUser().getUsername(), wsErr.getMessage());
                    }
                }
            }

            if (!accountants.isEmpty()) {
                log.info("[InvoiceService] Notified {} accountants about pending payment for invoice {}",
                        accountants.size(), invoice.getInvoiceNumber());
            }
        } catch (Exception e) {
            // Không throw exception để không ảnh hưởng đến flow chính
            log.error("[InvoiceService] Error sending notifications to accountants: {}", e.getMessage());
        }
    }
}

