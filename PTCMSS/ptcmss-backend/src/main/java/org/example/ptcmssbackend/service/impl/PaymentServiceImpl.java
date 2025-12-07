package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.config.QrPaymentProperties;
import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.response.Booking.PaymentResponse;
import org.example.ptcmssbackend.entity.Bookings;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.entity.Notifications;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.entity.PaymentHistory;
import org.example.ptcmssbackend.enums.PaymentConfirmationStatus;
import org.example.ptcmssbackend.repository.BookingRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.repository.NotificationRepository;
import org.example.ptcmssbackend.service.AppSettingService;
import org.example.ptcmssbackend.service.PaymentService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationRepository notificationRepository;
    private final QrPaymentProperties qrPaymentProperties;
    private final AppSettingService appSettingService;
    private final org.example.ptcmssbackend.service.WebSocketNotificationService webSocketNotificationService;

    @Override
    public PaymentResponse generateQRCode(Integer bookingId, BigDecimal amount, String note, Boolean deposit, Integer employeeId) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền phải lớn hơn 0");
        }
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + bookingId));
        Employees createdBy = employeeId != null ? employeeRepository.findById(employeeId).orElse(null) : null;

        // Validation: Kiểm tra ràng buộc thanh toán
        if (!Boolean.TRUE.equals(deposit)) {
            // Chỉ validate cho thanh toán (không phải cọc)
            BigDecimal remainingAmount = getRemainingAmount(bookingId);
            BigDecimal totalPendingAmount = getTotalPendingPaymentAmount(bookingId);
            
            // Ràng buộc 1: Không được tạo yêu cầu mới nếu đã có yêu cầu PENDING
            if (totalPendingAmount.compareTo(BigDecimal.ZERO) > 0) {
                throw new RuntimeException(String.format(
                    "Không thể tạo yêu cầu thanh toán mới. Đã có yêu cầu thanh toán đang chờ duyệt (tổng %s). Vui lòng đợi kế toán xác nhận các yêu cầu trước.", 
                    totalPendingAmount));
            }
            
            // Ràng buộc 2: Tổng pending + amount mới <= remaining amount
            BigDecimal totalWithNewAmount = totalPendingAmount.add(amount);
            if (totalWithNewAmount.compareTo(remainingAmount) > 0) {
                throw new RuntimeException(String.format(
                    "Tổng số tiền yêu cầu (%s) vượt quá số tiền còn lại (%s). Số tiền có thể tạo thêm: %s", 
                    totalWithNewAmount, remainingAmount, remainingAmount.subtract(totalPendingAmount)));
            }
        }

        String descriptionPrefix = appSettingService.getValue(AppSettingService.QR_DESCRIPTION_PREFIX);
        String description = StringUtils.hasText(note)
                ? note
                : String.format("%s-%d", descriptionPrefix, bookingId);

        // Create pending invoice + payment history so accountants can confirm QR transfers
        Invoices invoice = buildInvoiceSkeleton(booking, amount, Boolean.TRUE.equals(deposit), PaymentStatus.UNPAID);
        invoice.setNote(description);
        if (createdBy != null) {
            invoice.setCreatedBy(createdBy);
        }
        Invoices savedInvoice = invoiceRepository.save(invoice);

        PaymentHistory paymentHistory = new PaymentHistory();
        paymentHistory.setInvoice(savedInvoice);
        paymentHistory.setPaymentDate(Instant.now());
        paymentHistory.setAmount(amount);
        paymentHistory.setPaymentMethod("QR");
        paymentHistory.setConfirmationStatus(PaymentConfirmationStatus.PENDING);
        paymentHistory.setNote(description);
        if (createdBy != null) {
            paymentHistory.setCreatedBy(createdBy);
        }
        PaymentHistory savedHistory = paymentHistoryRepository.save(paymentHistory);

        notifyAccountantsAboutPaymentRequest(
                booking,
                amount,
                Boolean.TRUE.equals(deposit),
                description
        );

        String qrText = buildQrText(amount, description);
        String qrImageUrl = buildQrImageUrl(amount, description);
        Instant expiresAt = Instant.now().plus(qrPaymentProperties.getExpiresInMinutes(), ChronoUnit.MINUTES);

        // Send WebSocket notification for QR code generation
        try {
            String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "Khách hàng";
            webSocketNotificationService.sendGlobalNotification(
                    "QR thanh toán mới",
                    String.format("Đã tạo mã QR thanh toán %s cho đơn #%d - %s",
                            deposit ? "cọc" : "",
                            bookingId,
                            customerName),
                    "INFO"
            );
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification for QR generation", e);
        }

        return PaymentResponse.builder()
                .invoiceId(savedInvoice.getId())
                .bookingId(bookingId)
                .amount(amount)
                .deposit(Boolean.TRUE.equals(deposit))
                .paymentMethod("QR")
                .paymentStatus(savedInvoice.getPaymentStatus() != null ? savedInvoice.getPaymentStatus().name() : null)
                .note(description)
                .createdAt(savedHistory.getCreatedAt() != null ? savedHistory.getCreatedAt() : savedInvoice.getCreatedAt())
                .qrText(qrText)
                .qrImageUrl(qrImageUrl)
                .expiresAt(expiresAt)
                .paymentId(savedHistory.getId())
                .confirmationStatus(savedHistory.getConfirmationStatus() != null ? savedHistory.getConfirmationStatus().name() : null)
                .build();
    }

    @Override
    public PaymentResponse createDeposit(Integer bookingId, CreatePaymentRequest request, Integer employeeId) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền phải lớn hơn 0");
        }
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + bookingId));

        // Create invoice with UNPAID status initially (waiting for confirmation)
        Invoices invoice = buildInvoiceSkeleton(booking, request.getAmount(), Boolean.TRUE.equals(request.getDeposit()), PaymentStatus.UNPAID);
        invoice.setNote(request.getNote());
        if (employeeId != null) {
            Employees employee = employeeRepository.findById(employeeId).orElse(null);
            invoice.setCreatedBy(employee);
        }
        Invoices saved = invoiceRepository.save(invoice);

        // Create Pending Payment History
        PaymentHistory history = new PaymentHistory();
        history.setInvoice(saved);
        history.setPaymentDate(Instant.now());
        history.setAmount(request.getAmount());
        history.setPaymentMethod(StringUtils.hasText(request.getPaymentMethod()) ? request.getPaymentMethod() : "CASH");
        history.setConfirmationStatus(PaymentConfirmationStatus.PENDING);
        history.setNote(request.getNote());
        if (employeeId != null) {
            Employees employee = employeeRepository.findById(employeeId).orElse(null);
            history.setCreatedBy(employee);
        }
        paymentHistoryRepository.save(history);

        notifyAccountantsAboutPaymentRequest(
                booking,
                request.getAmount(),
                Boolean.TRUE.equals(request.getDeposit()),
                request.getNote()
        );

        return mapInvoice(saved);
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "0đ";
        return String.format("%,dđ", amount.longValue());
    }

    @Override
    public List<PaymentResponse> getPaymentHistory(Integer bookingId) {
        // Lấy tất cả invoices của booking
        List<Invoices> invoices = invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
        
        // Với mỗi invoice, lấy payment_history và map thành PaymentResponse
        return invoices.stream()
                .flatMap(invoice -> {
                    // Lấy tất cả payment_history của invoice này
                    List<PaymentHistory> paymentHistories =
                            paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(invoice.getId());
                    
                    // Nếu có payment_history, trả về payment_history (để có confirmationStatus)
                    if (!paymentHistories.isEmpty()) {
                        return paymentHistories.stream()
                                .map(ph -> mapPaymentHistory(ph, invoice));
                    } else {
                        // Nếu không có payment_history, trả về invoice (cho backward compatibility)
                        return java.util.stream.Stream.of(mapInvoice(invoice));
                    }
                })
                .collect(Collectors.toList());
    }

    private String buildQrText(BigDecimal amount, String description) {
        // VietQR format: bank_code|account_number|amount|description
        // This will be used by VietQR API to generate proper EMVCo QR code
        String bank = valueOrEmpty(appSettingService.getValue(AppSettingService.QR_BANK_CODE));
        String account = valueOrEmpty(appSettingService.getValue(AppSettingService.QR_ACCOUNT_NUMBER));
        String amountStr = amount.stripTrailingZeros().toPlainString();

        // Return simple format that VietQR image URL will handle
        return String.format("%s|%s|%s|%s", bank, account, amountStr, description);
    }

    private String buildQrImageUrl(BigDecimal amount, String description) {
        String provider = StringUtils.hasText(qrPaymentProperties.getProviderUrl())
                ? qrPaymentProperties.getProviderUrl()
                : "https://img.vietqr.io/image";
        String template = StringUtils.hasText(qrPaymentProperties.getTemplate())
                ? qrPaymentProperties.getTemplate()
                : "compact";

        String bank = valueOrEmpty(appSettingService.getValue(AppSettingService.QR_BANK_CODE));
        String account = valueOrEmpty(appSettingService.getValue(AppSettingService.QR_ACCOUNT_NUMBER));
        String accountName = valueOrEmpty(appSettingService.getValue(AppSettingService.QR_ACCOUNT_NAME));

        // URL encode parameters
        String encodedInfo = URLEncoder.encode(description, StandardCharsets.UTF_8);
        String encodedName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);

        // VietQR requires amount as integer (no decimal)
        long amountInt = amount.longValue();

        // VietQR URL format: https://img.vietqr.io/image/{bank_id}-{account_no}-{template}.jpg?amount={amount}&addInfo={info}&accountName={name}
        return String.format("%s/%s-%s-%s.jpg?amount=%d&addInfo=%s&accountName=%s",
                provider,
                bank,
                account,
                template,
                amountInt,
                encodedInfo,
                encodedName);
    }

    private String valueOrEmpty(String value) {
        return StringUtils.hasText(value) ? value : "";
    }

    private Invoices buildInvoiceSkeleton(Bookings booking, BigDecimal amount, boolean deposit, PaymentStatus status) {
        Invoices invoice = new Invoices();
        invoice.setBooking(booking);
        invoice.setBranch(booking.getBranch());
        invoice.setCustomer(booking.getCustomer());
        invoice.setType(InvoiceType.INCOME);
        invoice.setIsDeposit(deposit);
        invoice.setAmount(amount);
        invoice.setPaymentStatus(status);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        return invoice;
    }

    private PaymentResponse mapInvoice(Invoices invoice) {
        return PaymentResponse.builder()
                .invoiceId(invoice.getId())
                .bookingId(invoice.getBooking() != null ? invoice.getBooking().getId() : null)
                .amount(invoice.getAmount())
                .deposit(Boolean.TRUE.equals(invoice.getIsDeposit()))
                .paymentStatus(invoice.getPaymentStatus() != null ? invoice.getPaymentStatus().name() : null)
                .note(invoice.getNote())
                .createdAt(invoice.getCreatedAt())
                .build();
    }

    /**
     * Map PaymentHistory to PaymentResponse (có thêm confirmationStatus và paymentId)
     */
    private PaymentResponse mapPaymentHistory(PaymentHistory ph, Invoices invoice) {
        return PaymentResponse.builder()
                .invoiceId(invoice.getId())
                .bookingId(invoice.getBooking() != null ? invoice.getBooking().getId() : null)
                .amount(ph.getAmount())
                .deposit(Boolean.TRUE.equals(invoice.getIsDeposit()))
                .paymentMethod(ph.getPaymentMethod())
                .paymentStatus(invoice.getPaymentStatus() != null ? invoice.getPaymentStatus().name() : null)
                .note(ph.getNote() != null ? ph.getNote() : invoice.getNote())
                .createdAt(ph.getCreatedAt() != null ? ph.getCreatedAt() : invoice.getCreatedAt())
                // Thêm các field từ payment_history
                .paymentId(ph.getId())
                .confirmationStatus(ph.getConfirmationStatus() != null ? ph.getConfirmationStatus().name() : null)
                .build();
    }

    private void notifyAccountantsAboutPaymentRequest(Bookings booking,
                                                      BigDecimal amount,
                                                      boolean isDeposit,
                                                      String note) {
        try {
            Integer branchId = booking.getBranch() != null ? booking.getBranch().getId() : null;
            String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "Khách hàng";
            String bookingCode = "ORD-" + booking.getId();
            String paymentType = isDeposit ? "Cọc" : "Thanh toán";
            String amountStr = formatAmount(amount);

            String title = "Yêu cầu " + paymentType.toLowerCase() + " mới";
            String message = String.format("Có yêu cầu %s %s cho đơn %s - %s cần xác nhận",
                    paymentType.toLowerCase(),
                    amountStr,
                    bookingCode,
                    customerName);

            if (StringUtils.hasText(note)) {
                message = message + String.format(" (%s)", note);
            }

            if (branchId != null) {
                try {
                    List<Employees> accountants = employeeRepository.findByRoleNameAndBranchId("Accountant", branchId);
                    for (Employees accountant : accountants) {
                        if (accountant.getUser() != null) {
                            Notifications notification = new Notifications();
                            notification.setUser(accountant.getUser());
                            notification.setTitle(title);
                            notification.setMessage(message);
                            notification.setIsRead(false);
                            notificationRepository.save(notification);

                            webSocketNotificationService.sendUserNotification(
                                    accountant.getUser().getId(),
                                    title,
                                    message,
                                    "INFO"
                            );
                            log.debug("[PaymentService] Sent notification to accountant: {}", accountant.getUser().getUsername());
                        }
                    }
                    if (!accountants.isEmpty()) {
                        log.info("[PaymentService] Notified {} accountants about payment request for booking {}",
                                accountants.size(), bookingCode);
                    }
                } catch (Exception accErr) {
                    log.warn("[PaymentService] Failed to notify accountants: {}", accErr.getMessage());
                }
            }

            webSocketNotificationService.sendGlobalNotification(title, message, "INFO");
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification for payment", e);
        }
    }

    /**
     * Tính số tiền còn lại của booking cần thu (totalCost - depositAmount)
     * Đây là số tiền còn lại ban đầu, chưa trừ đi các payment requests PENDING
     */
    private BigDecimal getRemainingAmount(Integer bookingId) {
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + bookingId));
        BigDecimal totalCost = booking.getTotalCost() != null ? booking.getTotalCost() : BigDecimal.ZERO;
        BigDecimal depositAmount = booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO;
        return totalCost.subtract(depositAmount);
    }

    /**
     * Tính tổng số tiền các payment requests PENDING của booking
     */
    private BigDecimal getTotalPendingPaymentAmount(Integer bookingId) {
        // Tìm tất cả invoices của booking
        List<Invoices> invoices = invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
        
        // Tính tổng payment requests PENDING của tất cả invoices
        BigDecimal totalPending = BigDecimal.ZERO;
        for (Invoices invoice : invoices) {
            List<PaymentHistory> pendingPayments =
                paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(invoice.getId())
                    .stream()
                    .filter(ph -> ph.getConfirmationStatus() == PaymentConfirmationStatus.PENDING)
                    .collect(Collectors.toList());
            
            for (PaymentHistory ph : pendingPayments) {
                totalPending = totalPending.add(ph.getAmount() != null ? ph.getAmount() : BigDecimal.ZERO);
            }
        }
        
        return totalPending;
    }
}
