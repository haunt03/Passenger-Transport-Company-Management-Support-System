package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.entity.Bookings;
import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.exception.ResourceNotFoundException;
import org.example.ptcmssbackend.repository.BookingRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.service.DepositService;
import org.example.ptcmssbackend.service.InvoiceService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DepositServiceImpl implements DepositService {

    private final InvoiceService invoiceService;
    private final InvoiceRepository invoiceRepository;
    private final BookingRepository bookingRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final org.example.ptcmssbackend.repository.EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public InvoiceResponse createDeposit(Integer bookingId, CreateInvoiceRequest request) {
        log.info("[DepositService] Creating deposit for booking: {}, isDeposit: {}", bookingId, request.getIsDeposit());

        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));

        // Validate deposit amount
        // Cần tính cả các payment requests PENDING đã tạo trước đó
        BigDecimal remainingAmount = getRemainingAmount(bookingId);
        BigDecimal totalPendingAmount = getTotalPendingPaymentAmount(bookingId);
        
        // Ràng buộc 1: Không được tạo yêu cầu mới nếu đã có yêu cầu PENDING
        if (totalPendingAmount.compareTo(BigDecimal.ZERO) > 0) {
            throw new RuntimeException(String.format(
                "Không thể tạo yêu cầu thanh toán mới. Đã có yêu cầu thanh toán đang chờ duyệt (tổng %s). Vui lòng đợi kế toán xác nhận các yêu cầu trước.", 
                totalPendingAmount));
        }
        
        // Ràng buộc 2: Tổng pending + amount mới <= remaining amount
        BigDecimal totalWithNewAmount = totalPendingAmount.add(request.getAmount());
        if (totalWithNewAmount.compareTo(remainingAmount) > 0) {
            throw new RuntimeException(String.format(
                "Tổng số tiền yêu cầu (%s) vượt quá số tiền còn lại (%s). Số tiền có thể tạo thêm: %s", 
                totalWithNewAmount, remainingAmount, remainingAmount.subtract(totalPendingAmount)));
        }
        
        BigDecimal availableAmount = remainingAmount.subtract(totalPendingAmount);
        if (request.getAmount().compareTo(availableAmount) > 0) {
            throw new RuntimeException(String.format(
                "Số tiền vượt quá số tiền còn lại. Số tiền còn lại: %s, đã có %s đang chờ duyệt, còn lại có thể tạo: %s", 
                remainingAmount, totalPendingAmount, availableAmount));
        }

        // TẤT CẢ ghi nhận tiền (cọc hoặc thanh toán) đều tạo payment_history PENDING chờ kế toán duyệt
        // Flow: Tạo/tìm invoice UNPAID → Tạo payment_history PENDING → Kế toán duyệt → Invoice PAID
        
        List<Invoices> existingInvoices = invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
        
        // Tìm invoice INCOME UNPAID của booking này
        Invoices targetInvoice = existingInvoices.stream()
                .filter(inv -> inv.getType() == InvoiceType.INCOME && inv.getPaymentStatus() == PaymentStatus.UNPAID)
                .findFirst()
                .orElse(null);

        // Nếu không có invoice UNPAID, tạo mới
        if (targetInvoice == null) {
            request.setBookingId(bookingId);
            request.setCustomerId(booking.getCustomer().getId());
            request.setBranchId(booking.getBranch().getId());
            request.setType("INCOME");
            
            // Tạo invoice mới với status UNPAID
            InvoiceResponse newInvoiceResp = invoiceService.createInvoice(request);
            targetInvoice = invoiceRepository.findById(newInvoiceResp.getInvoiceId())
                    .orElseThrow(() -> new RuntimeException("Failed to create invoice"));
        }

        // Tạo payment_history với status PENDING chờ kế toán xác nhận
        org.example.ptcmssbackend.entity.PaymentHistory paymentHistory = new org.example.ptcmssbackend.entity.PaymentHistory();
        paymentHistory.setInvoice(targetInvoice);
        paymentHistory.setPaymentDate(java.time.Instant.now());
        paymentHistory.setAmount(request.getAmount());
        // Mặc định là CASH (chuyển khoản dùng QR riêng)
        paymentHistory.setPaymentMethod("CASH");
        paymentHistory.setConfirmationStatus(org.example.ptcmssbackend.enums.PaymentConfirmationStatus.PENDING);
        
        // Note: thêm prefix để phân biệt cọc vs thanh toán
        String notePrefix = Boolean.TRUE.equals(request.getIsDeposit()) ? "[Đặt cọc] " : "[Thu tiền] ";
        paymentHistory.setNote(notePrefix + (request.getNote() != null ? request.getNote() : ""));
        
        // Generate receipt number
        String receiptNum = null;
        if (receiptNum == null || receiptNum.isEmpty()) {
            receiptNum = generateReceiptNumber(booking.getBranch().getId());
        }
        paymentHistory.setReceiptNumber(receiptNum);

        if (request.getCreatedBy() != null) {
            paymentHistory.setCreatedBy(employeeRepository.findById(request.getCreatedBy()).orElse(null));
        }

        paymentHistoryRepository.save(paymentHistory);
        log.info("[DepositService] Created payment_history PENDING for invoice: {}, amount: {}, isDeposit: {}", 
                targetInvoice.getInvoiceNumber(), request.getAmount(), request.getIsDeposit());

        return invoiceService.getInvoiceById(targetInvoice.getId());
    }

    @Override
    public List<InvoiceResponse> getDepositsByBooking(Integer bookingId) {
        List<Invoices> deposits = invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
        return deposits.stream()
                .filter(inv -> Boolean.TRUE.equals(inv.getIsDeposit()))
                .filter(inv -> inv.getType() == InvoiceType.INCOME)
                .map(inv -> invoiceService.getInvoiceById(inv.getId()))
                .collect(Collectors.toList());
    }

    @Override
    public BigDecimal getTotalDepositPaid(Integer bookingId) {
        List<Invoices> deposits = invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
        return deposits.stream()
                .filter(inv -> Boolean.TRUE.equals(inv.getIsDeposit()))
                .filter(inv -> inv.getType() == InvoiceType.INCOME)
                .filter(inv -> inv.getPaymentStatus() == PaymentStatus.PAID)
                .map(inv -> paymentHistoryRepository.sumConfirmedByInvoiceId(inv.getId()))
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public BigDecimal getRemainingAmount(Integer bookingId) {
        Bookings booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));

        BigDecimal totalCost = booking.getTotalCost() != null ? booking.getTotalCost() : BigDecimal.ZERO;
        BigDecimal totalPaid = getTotalDepositPaid(bookingId);

        return totalCost.subtract(totalPaid);
    }
    
    /**
     * Tính tổng số tiền của các payment requests đang PENDING cho booking này
     * (chưa được kế toán duyệt)
     */
    private BigDecimal getTotalPendingPaymentAmount(Integer bookingId) {
        // Tìm tất cả invoices của booking
        List<Invoices> invoices = invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
        
        // Tính tổng payment requests PENDING của tất cả invoices
        BigDecimal totalPending = BigDecimal.ZERO;
        for (Invoices invoice : invoices) {
            List<org.example.ptcmssbackend.entity.PaymentHistory> pendingPayments = 
                paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(invoice.getId())
                    .stream()
                    .filter(ph -> ph.getConfirmationStatus() == org.example.ptcmssbackend.enums.PaymentConfirmationStatus.PENDING)
                    .collect(Collectors.toList());
            
            for (org.example.ptcmssbackend.entity.PaymentHistory ph : pendingPayments) {
                totalPending = totalPending.add(ph.getAmount() != null ? ph.getAmount() : BigDecimal.ZERO);
            }
        }
        
        return totalPending;
    }

    @Override
    @Transactional
    public void cancelDeposit(Integer depositId, String reason) {
        Invoices deposit = invoiceRepository.findById(depositId)
                .orElseThrow(() -> new ResourceNotFoundException("Deposit not found: " + depositId));

        if (!Boolean.TRUE.equals(deposit.getIsDeposit())) {
            throw new RuntimeException("Hóa đơn không phải là tiền đặt cọc");
        }

        deposit.setStatus(InvoiceStatus.CANCELLED);
        deposit.setCancellationReason(reason);
        invoiceRepository.save(deposit);

        log.info("[DepositService] Deposit {} cancelled: {}", deposit.getInvoiceNumber(), reason);
    }

    @Override
    public String generateReceiptNumber(Integer branchId) {
        LocalDate today = LocalDate.now();
        String year = String.valueOf(today.getYear());
        String month = String.format("%02d", today.getMonthValue());
        String day = String.format("%02d", today.getDayOfMonth());
        
        // Get max sequence for today
        String pattern = "REC-" + year + month + day + "-%";
        Integer maxSeq = invoiceRepository.findMaxSequenceNumber(branchId, pattern);
        int nextSeq = (maxSeq != null ? maxSeq : 0) + 1;
        
        return String.format("REC-%s%s%s-%04d", year, month, day, nextSeq);
    }
}

