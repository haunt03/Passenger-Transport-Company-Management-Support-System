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
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.exception.ResourceNotFoundException;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.InvoiceService;
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

    private final InvoiceRepository invoiceRepository;
    private final BranchesRepository branchesRepository;
    private final CustomerRepository customerRepository;
    private final BookingRepository bookingRepository;
    private final EmployeeRepository employeeRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final org.example.ptcmssbackend.service.EmailService emailService;

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
            throw new RuntimeException("Invalid invoice type: " + request.getType());
        }
        invoice.setType(invoiceType);
        invoice.setCostType(request.getCostType());
        invoice.setIsDeposit(request.getIsDeposit() != null ? request.getIsDeposit() : false);
        invoice.setAmount(request.getAmount());
        invoice.setSubtotal(request.getSubtotal());
        invoice.setVatAmount(request.getVatAmount() != null ? request.getVatAmount() : BigDecimal.ZERO);
        invoice.setPaymentMethod(request.getPaymentMethod());
        invoice.setPaymentTerms(request.getPaymentTerms() != null ? request.getPaymentTerms() : "NET_7");
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        invoice.setCreatedBy(createdBy);
        invoice.setNote(request.getNote());

        // Set due date based on payment terms
        if (request.getDueDate() == null && invoice.getInvoiceDate() != null) {
            LocalDate invoiceLocalDate = invoice.getInvoiceDate().atZone(ZoneId.systemDefault()).toLocalDate();
            int days = getDaysFromPaymentTerms(invoice.getPaymentTerms());
            invoice.setDueDate(invoiceLocalDate.plusDays(days));
        } else {
            invoice.setDueDate(request.getDueDate());
        }

        // Bank transfer info
        invoice.setBankName(request.getBankName());
        invoice.setBankAccount(request.getBankAccount());
        invoice.setReferenceNumber(request.getReferenceNumber());
        invoice.setCashierName(request.getCashierName());

        // Generate invoice number
        LocalDate invoiceDate = invoice.getInvoiceDate() != null
                ? invoice.getInvoiceDate().atZone(ZoneId.systemDefault()).toLocalDate()
                : LocalDate.now();
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
            LocalDate startDate, LocalDate endDate, Integer customerId, Pageable pageable) {

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
            throw new org.example.ptcmssbackend.exception.InvoiceException("Cannot update paid invoice");
        }

        // Update fields
        if (request.getAmount() != null) invoice.setAmount(request.getAmount());
        if (request.getSubtotal() != null) invoice.setSubtotal(request.getSubtotal());
        if (request.getVatAmount() != null) invoice.setVatAmount(request.getVatAmount());
        if (request.getPaymentMethod() != null) invoice.setPaymentMethod(request.getPaymentMethod());
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
            throw new org.example.ptcmssbackend.exception.PaymentException(
                    "Payment amount (" + request.getAmount() + ") exceeds balance (" + balance + ")");
        }

        // Create payment history
        PaymentHistory payment = new PaymentHistory();
        payment.setInvoice(invoice);
        payment.setPaymentDate(Instant.now());
        payment.setAmount(request.getAmount());
        payment.setPaymentMethod(request.getPaymentMethod());
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

        BigDecimal totalPaid = paymentHistoryRepository.sumByInvoiceId(invoiceId);
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
            log.error("[InvoiceService] Failed to send invoice email", e);
            // Don't throw exception, just log - invoice is already marked as sent
        }
    }

    @Override
    public boolean isOverdue(Integer invoiceId) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (invoice.getDueDate() == null || invoice.getPaymentStatus() == PaymentStatus.PAID) {
            return false;
        }

        return invoice.getDueDate().isBefore(LocalDate.now());
    }

    @Override
    @Transactional
    public void checkAndUpdateOverdueInvoices() {
        LocalDate today = LocalDate.now();
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
        response.setCostType(invoice.getCostType());
        response.setIsDeposit(invoice.getIsDeposit());
        response.setAmount(invoice.getAmount());
        response.setSubtotal(invoice.getSubtotal());
        response.setVatAmount(invoice.getVatAmount());
        response.setPaymentMethod(invoice.getPaymentMethod());
        response.setPaymentStatus(invoice.getPaymentStatus().toString());
        response.setStatus(invoice.getStatus().toString());
        response.setPaymentTerms(invoice.getPaymentTerms());
        response.setDueDate(invoice.getDueDate());
        response.setInvoiceDate(invoice.getInvoiceDate());
        response.setCreatedAt(invoice.getCreatedAt());
        response.setBankName(invoice.getBankName());
        response.setBankAccount(invoice.getBankAccount());
        response.setReferenceNumber(invoice.getReferenceNumber());
        response.setCashierName(invoice.getCashierName());
        response.setReceiptNumber(invoice.getReceiptNumber());
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
        BigDecimal paidAmount = paymentHistoryRepository.sumByInvoiceId(invoice.getId());
        response.setPaidAmount(paidAmount != null ? paidAmount : BigDecimal.ZERO);
        response.setBalance(calculateBalance(invoice.getId()));

        // Calculate days overdue
        if (invoice.getDueDate() != null && invoice.getPaymentStatus() != PaymentStatus.PAID) {
            LocalDate today = LocalDate.now();
            if (invoice.getDueDate().isBefore(today)) {
                response.setDaysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today));
            }
        }

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
        response.setBookingId(invoice.getBooking() != null ? invoice.getBooking().getId() : null);
        response.setType(invoice.getType().toString());
        response.setAmount(invoice.getAmount());
        response.setDueDate(invoice.getDueDate());
        response.setPaymentStatus(invoice.getPaymentStatus().toString());
        response.setStatus(invoice.getStatus().toString());
        response.setInvoiceDate(invoice.getInvoiceDate());

        BigDecimal paidAmount = paymentHistoryRepository.sumByInvoiceId(invoice.getId());
        response.setPaidAmount(paidAmount != null ? paidAmount : BigDecimal.ZERO);
        response.setBalance(calculateBalance(invoice.getId()));

        if (invoice.getDueDate() != null && invoice.getPaymentStatus() != PaymentStatus.PAID) {
            LocalDate today = LocalDate.now();
            if (invoice.getDueDate().isBefore(today)) {
                response.setDaysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today));
            }
        }

        return response;
    }

    private PaymentHistoryResponse mapToPaymentHistoryResponse(PaymentHistory payment) {
        PaymentHistoryResponse response = new PaymentHistoryResponse();
        response.setPaymentId(payment.getId());
        response.setInvoiceId(payment.getInvoice().getId());
        response.setPaymentDate(payment.getPaymentDate());
        response.setAmount(payment.getAmount());
        response.setPaymentMethod(payment.getPaymentMethod());
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
}
