package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.response.Booking.PaymentResponse;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentService {

    PaymentResponse generateQRCode(Integer bookingId, BigDecimal amount, String note, Boolean deposit, Integer employeeId);

    PaymentResponse createDeposit(Integer bookingId, CreatePaymentRequest request, Integer employeeId);

    List<PaymentResponse> getPaymentHistory(Integer bookingId);
}