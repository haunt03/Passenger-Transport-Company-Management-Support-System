package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Booking.CustomerRequest;
import org.example.ptcmssbackend.dto.response.Booking.CustomerResponse;
import org.example.ptcmssbackend.entity.Customers;
import org.springframework.data.domain.Page;

import java.time.LocalDate;

public interface CustomerService {
    /**
     * Tìm hoặc tạo customer mới
     * Nếu tìm thấy theo phone thì trả về customer hiện có
     * Nếu không tìm thấy thì tạo mới
     */
    Customers findOrCreateCustomer(CustomerRequest request, Integer createdByEmployeeId);

    /**
     * Tìm customer theo phone
     */
    Customers findByPhone(String phone);

    /**
     * Tạo customer mới
     */
    Customers createCustomer(CustomerRequest request, Integer createdByEmployeeId);

    /**
     * Map entity sang response DTO
     */
    CustomerResponse toResponse(Customers customer);

    /**
     * Lấy thông tin khách hàng theo ID
     */
    CustomerResponse getById(Integer customerId);

    /**
     * Danh sách customer với filter và phân trang
     * Nếu userId được cung cấp và user là MANAGER, tự động filter theo chi nhánh của manager
     */
    Page<CustomerResponse> listCustomers(String keyword, Integer branchId, Integer userId, LocalDate fromDate, LocalDate toDate, int page, int size);
}

