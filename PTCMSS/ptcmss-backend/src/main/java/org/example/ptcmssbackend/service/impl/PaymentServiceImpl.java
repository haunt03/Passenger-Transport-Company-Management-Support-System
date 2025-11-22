package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.config.QrPaymentProperties;
import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.response.Booking.PaymentResponse;
import org.example.ptcmssbackend.entity.Bookings;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.repository.BookingRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
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
    private final EmployeeRepository employeeRepository;
    private final QrPaymentProperties qrPaymentProperties;

    @Override
    public PaymentResponse generateQRCode(Integer bookingId, BigDecimal amount, String note, Boolean deposit, Integer employeeId) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        Invoices invoice = buildInvoiceSkeleton(booking, amount, Boolean.TRUE.equals(deposit), PaymentStatus.UNPAID);
        invoice.setPaymentMethod("QR");
        invoice.setNote(note);
        if (employeeId != null) {
            Employees employee = employeeRepository.findById(employeeId).orElse(null);
            invoice.setCreatedBy(employee);
        }
        Invoices saved = invoiceRepository.save(invoice);

        String description = StringUtils.hasText(note)
                ? note
                : String.format("%s-%d", qrPaymentProperties.getDescriptionPrefix(), bookingId);

        String qrText = buildQrText(amount, description);
        String qrImageUrl = buildQrImageUrl(amount, description);
        Instant expiresAt = Instant.now().plus(qrPaymentProperties.getExpiresInMinutes(), ChronoUnit.MINUTES);

        return mapInvoice(saved).toBuilder()
                .qrText(qrText)
                .qrImageUrl(qrImageUrl)
                .expiresAt(expiresAt)
                .note(description)
                .build();
    }

    @Override
    public PaymentResponse createDeposit(Integer bookingId, CreatePaymentRequest request, Integer employeeId) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        Invoices invoice = buildInvoiceSkeleton(booking, request.getAmount(), Boolean.TRUE.equals(request.getDeposit()), PaymentStatus.PAID);
        invoice.setPaymentMethod(StringUtils.hasText(request.getPaymentMethod()) ? request.getPaymentMethod() : "CASH");
        invoice.setNote(request.getNote());
        if (employeeId != null) {
            Employees employee = employeeRepository.findById(employeeId).orElse(null);
            invoice.setCreatedBy(employee);
        }
        Invoices saved = invoiceRepository.save(invoice);
        return mapInvoice(saved);
    }

    @Override
    public List<PaymentResponse> getPaymentHistory(Integer bookingId) {
        return invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId).stream()
                .map(this::mapInvoice)
                .collect(Collectors.toList());
    }

    private String buildQrText(BigDecimal amount, String description) {
        return String.format("BANK:%s|ACC:%s|AMT:%s|INFO:%s",
                valueOrEmpty(qrPaymentProperties.getBankCode()),
                valueOrEmpty(qrPaymentProperties.getAccountNumber()),
                amount.stripTrailingZeros().toPlainString(),
                description);
    }

    private String buildQrImageUrl(BigDecimal amount, String description) {
        String provider = StringUtils.hasText(qrPaymentProperties.getProviderUrl())
                ? qrPaymentProperties.getProviderUrl()
                : "https://img.vietqr.io/image";
        String template = StringUtils.hasText(qrPaymentProperties.getTemplate())
                ? qrPaymentProperties.getTemplate()
                : "compact";

        String bank = valueOrEmpty(qrPaymentProperties.getBankCode());
        String account = valueOrEmpty(qrPaymentProperties.getAccountNumber());

        String encodedInfo = URLEncoder.encode(description, StandardCharsets.UTF_8);
        String encodedName = URLEncoder.encode(valueOrEmpty(qrPaymentProperties.getAccountName()), StandardCharsets.UTF_8);

        return String.format("%s/%s-%s-%s.png?amount=%s&addInfo=%s&accountName=%s",
                provider,
                bank,
                account,
                template,
                amount.stripTrailingZeros().toPlainString(),
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
                .paymentMethod(invoice.getPaymentMethod())
                .paymentStatus(invoice.getPaymentStatus() != null ? invoice.getPaymentStatus().name() : null)
                .note(invoice.getNote())
                .createdAt(invoice.getCreatedAt())
                .build();
    }
}