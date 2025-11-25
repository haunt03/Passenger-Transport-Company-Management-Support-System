package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Debt.SendDebtReminderRequest;
import org.example.ptcmssbackend.dto.request.Debt.UpdateDebtInfoRequest;
import org.example.ptcmssbackend.dto.response.Debt.AgingBucketResponse;
import org.example.ptcmssbackend.dto.response.Debt.DebtReminderHistoryResponse;
import org.example.ptcmssbackend.dto.response.Debt.DebtSummaryResponse;
import org.example.ptcmssbackend.entity.DebtReminderHistory;
import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.repository.DebtReminderHistoryRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.service.DebtService;
import org.example.ptcmssbackend.service.InvoiceService;
import org.springframework.data.domain.Page;
import org.example.ptcmssbackend.exception.ResourceNotFoundException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DebtServiceImpl implements DebtService {

    private final InvoiceRepository invoiceRepository;
    private final DebtReminderHistoryRepository debtReminderHistoryRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final InvoiceService invoiceService;
    private final org.example.ptcmssbackend.service.EmailService emailService;

    @Override
    public Page<DebtSummaryResponse> getDebts(
            Integer branchId, Boolean overdueOnly, Pageable pageable) {
        log.info("[DebtService] Getting debts - branch: {}, overdueOnly: {}", branchId, overdueOnly);

        List<Invoices> invoices;
        if (Boolean.TRUE.equals(overdueOnly)) {
            invoices = invoiceRepository.findOverdueInvoices(branchId);
        } else {
            invoices = invoiceRepository.findUnpaidInvoices(branchId);
        }

        // Filter by branch if provided
        if (branchId != null) {
            invoices = invoices.stream()
                    .filter(inv -> inv.getBranch().getId().equals(branchId))
                    .collect(Collectors.toList());
        }

        // Sort: OVERDUE first, then by due date ascending
        invoices.sort((a, b) -> {
            boolean aOverdue = a.getPaymentStatus() == PaymentStatus.OVERDUE;
            boolean bOverdue = b.getPaymentStatus() == PaymentStatus.OVERDUE;
            if (aOverdue != bOverdue) {
                return aOverdue ? -1 : 1;
            }
            if (a.getDueDate() != null && b.getDueDate() != null) {
                return a.getDueDate().compareTo(b.getDueDate());
            }
            return 0;
        });

        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), invoices.size());
        List<Invoices> pagedInvoices = invoices.subList(start, end);

        List<DebtSummaryResponse> responses = pagedInvoices.stream()
                .map(this::mapToDebtSummary)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, invoices.size());
    }

    @Override
    public AgingBucketResponse getAgingBuckets(Integer branchId, LocalDate asOfDate) {
        log.info("[DebtService] Getting aging buckets - branch: {}, asOfDate: {}", branchId, asOfDate);

        LocalDate date = asOfDate != null ? asOfDate : LocalDate.now();
        List<Invoices> unpaidInvoices = invoiceRepository.findUnpaidInvoices(branchId);

        BigDecimal bucket0_30 = BigDecimal.ZERO;
        BigDecimal bucket31_60 = BigDecimal.ZERO;
        BigDecimal bucket61_90 = BigDecimal.ZERO;
        BigDecimal bucketOver90 = BigDecimal.ZERO;

        for (Invoices invoice : unpaidInvoices) {
            if (invoice.getDueDate() == null) continue;

            long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), date);
            BigDecimal balance = invoiceService.calculateBalance(invoice.getId());

            if (daysOverdue <= 30) {
                bucket0_30 = bucket0_30.add(balance);
            } else if (daysOverdue <= 60) {
                bucket31_60 = bucket31_60.add(balance);
            } else if (daysOverdue <= 90) {
                bucket61_90 = bucket61_90.add(balance);
            } else {
                bucketOver90 = bucketOver90.add(balance);
            }
        }

        AgingBucketResponse response = new AgingBucketResponse();
        response.setBucket0_30(bucket0_30);
        response.setBucket31_60(bucket31_60);
        response.setBucket61_90(bucket61_90);
        response.setBucketOver90(bucketOver90);
        response.setTotal(bucket0_30.add(bucket31_60).add(bucket61_90).add(bucketOver90));

        return response;
    }

    @Override
    @Transactional
    public void sendDebtReminder(Integer invoiceId, SendDebtReminderRequest request) {
        log.info("[DebtService] Sending debt reminder for invoice: {}", invoiceId);

        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        DebtReminderHistory reminder = new DebtReminderHistory();
        reminder.setInvoice(invoice);
        reminder.setReminderDate(Instant.now());
        reminder.setReminderType(request.getReminderType());
        reminder.setRecipient(request.getRecipient());
        reminder.setMessage(request.getMessage());

        // TODO: Set sentBy from request.getSentBy()
        // reminder.setSentBy(...);

        debtReminderHistoryRepository.save(reminder);

        // Actually send email/SMS/phone call
        try {
            String reminderType = request.getReminderType().toUpperCase();
            String customerEmail = invoice.getCustomer() != null ? invoice.getCustomer().getEmail() : null;
            String customerPhone = invoice.getCustomer() != null ? invoice.getCustomer().getPhone() : null;
            String customerName = invoice.getCustomer() != null ? invoice.getCustomer().getFullName() : "Quý khách";
            String invoiceNumber = invoice.getInvoiceNumber();
            String amount = invoice.getAmount().toString();
            String dueDate = invoice.getDueDate() != null ? invoice.getDueDate().toString() : "N/A";

            LocalDate today = LocalDate.now();
            Integer daysOverdue = invoice.getDueDate() != null && invoice.getDueDate().isBefore(today)
                    ? (int) java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today)
                    : 0;

            String message = request.getMessage() != null ? request.getMessage() :
                    "Vui lòng thanh toán hóa đơn #" + invoiceNumber + " sớm nhất có thể.";

            switch (reminderType) {
                case "EMAIL":
                    if (customerEmail != null) {
                        emailService.sendDebtReminderEmail(
                                customerEmail, customerName, invoiceNumber, amount, dueDate, daysOverdue, message
                        );
                        log.info("[DebtService] Debt reminder email sent to {}", customerEmail);
                    } else {
                        log.warn("[DebtService] Customer email not found for invoice {}", invoiceId);
                    }
                    break;
                case "SMS":
                    if (customerPhone != null) {
                        emailService.sendDebtReminderSMS(customerPhone, invoiceNumber, amount);
                        log.info("[DebtService] Debt reminder SMS sent to {}", customerPhone);
                    } else {
                        log.warn("[DebtService] Customer phone not found for invoice {}", invoiceId);
                    }
                    break;
                case "PHONE":
                    // TODO: Integrate with phone call service (Twilio, etc.)
                    log.info("[DebtService] Phone call reminder would be made to {}", customerPhone);
                    break;
                default:
                    log.warn("[DebtService] Unknown reminder type: {}", reminderType);
            }
        } catch (Exception e) {
            log.error("[DebtService] Failed to send debt reminder", e);
            // Don't throw exception, reminder is already saved
        }

        log.info("[DebtService] Debt reminder sent: {}", reminder.getReminderType());
    }

    @Override
    public List<DebtReminderHistoryResponse> getReminderHistory(Integer invoiceId) {
        List<DebtReminderHistory> reminders = debtReminderHistoryRepository.findAllByInvoiceId(invoiceId);
        return reminders.stream()
                .map(this::mapToReminderHistoryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateDebtInfo(Integer invoiceId, UpdateDebtInfoRequest request) {
        log.info("[DebtService] Updating debt info for invoice: {}", invoiceId);

        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (request.getPromiseToPayDate() != null) {
            invoice.setPromiseToPayDate(request.getPromiseToPayDate());
        }
        if (request.getDebtLabel() != null) {
            invoice.setDebtLabel(request.getDebtLabel());
        }
        if (request.getContactNote() != null) {
            invoice.setContactNote(request.getContactNote());
        }

        invoiceRepository.save(invoice);
    }

    @Override
    @Transactional
    public void setPromiseToPay(Integer invoiceId, LocalDate promiseDate) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
        invoice.setPromiseToPayDate(promiseDate);
        invoiceRepository.save(invoice);
    }

    @Override
    @Transactional
    public void setDebtLabel(Integer invoiceId, String label) {
        Invoices invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
        invoice.setDebtLabel(label);
        invoiceRepository.save(invoice);
    }

    // Helper methods
    private DebtSummaryResponse mapToDebtSummary(Invoices invoice) {
        DebtSummaryResponse response = new DebtSummaryResponse();
        response.setInvoiceId(invoice.getId());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setCustomerId(invoice.getCustomer() != null ? invoice.getCustomer().getId() : null);
        response.setCustomerName(invoice.getCustomer() != null ? invoice.getCustomer().getFullName() : null);
        response.setCustomerPhone(invoice.getCustomer() != null ? invoice.getCustomer().getPhone() : null);
        response.setCustomerEmail(invoice.getCustomer() != null ? invoice.getCustomer().getEmail() : null);
        response.setBookingId(invoice.getBooking() != null ? invoice.getBooking().getId() : null);
        response.setTotalAmount(invoice.getAmount());

        BigDecimal paidAmount = paymentHistoryRepository.sumByInvoiceId(invoice.getId());
        response.setPaidAmount(paidAmount != null ? paidAmount : BigDecimal.ZERO);
        response.setBalance(invoiceService.calculateBalance(invoice.getId()));

        response.setDueDate(invoice.getDueDate());
        if (invoice.getDueDate() != null && invoice.getPaymentStatus() != PaymentStatus.PAID) {
            LocalDate today = LocalDate.now();
            if (invoice.getDueDate().isBefore(today)) {
                response.setDaysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(
                        invoice.getDueDate(), today));
            }
        }

        response.setPaymentStatus(invoice.getPaymentStatus().toString());
        response.setPromiseToPayDate(invoice.getPromiseToPayDate());
        response.setDebtLabel(invoice.getDebtLabel());
        response.setContactNote(invoice.getContactNote());

        // Get last reminder date
        debtReminderHistoryRepository.findLatestByInvoiceId(invoice.getId())
                .ifPresent(reminder -> response.setLastReminderDate(reminder.getReminderDate()));

        return response;
    }

    private DebtReminderHistoryResponse mapToReminderHistoryResponse(DebtReminderHistory reminder) {
        DebtReminderHistoryResponse response = new DebtReminderHistoryResponse();
        response.setReminderId(reminder.getId());
        response.setInvoiceId(reminder.getInvoice().getId());
        response.setReminderDate(reminder.getReminderDate());
        response.setReminderType(reminder.getReminderType());
        response.setRecipient(reminder.getRecipient());
        response.setMessage(reminder.getMessage());
        if (reminder.getSentBy() != null) {
            response.setSentByName(reminder.getSentBy().getFullName());
        }
        response.setCreatedAt(reminder.getCreatedAt());
        return response;
    }
}
