package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Booking.CustomerRequest;
import org.example.ptcmssbackend.dto.response.Booking.CustomerResponse;
import org.example.ptcmssbackend.entity.Customers;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.enums.CustomerStatus;
import org.example.ptcmssbackend.repository.CustomerRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.service.CustomerService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public Customers findOrCreateCustomer(CustomerRequest request, Integer createdByEmployeeId) {
        // Tìm customer theo phone (nếu có)
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            Customers existing = customerRepository.findByPhoneIgnoreCase(request.getPhone()).orElse(null);
            if (existing != null) {
                log.info("[CustomerService] Found existing customer by phone: {}", request.getPhone());
                // Cập nhật thông tin nếu có thay đổi
                boolean updated = false;
                if (request.getFullName() != null && !request.getFullName().equals(existing.getFullName())) {
                    existing.setFullName(request.getFullName());
                    updated = true;
                }
                if (request.getEmail() != null && !request.getEmail().equals(existing.getEmail())) {
                    existing.setEmail(request.getEmail());
                    updated = true;
                }
                if (request.getAddress() != null && !request.getAddress().equals(existing.getAddress())) {
                    existing.setAddress(request.getAddress());
                    updated = true;
                }
                if (updated) {
                    existing = customerRepository.save(existing);
                    log.info("[CustomerService] Updated customer info: {}", existing.getId());
                }
                return existing;
            }
        }

        // Không tìm thấy, tạo mới
        log.info("[CustomerService] Creating new customer: {}", request.getFullName());
        return createCustomer(request, createdByEmployeeId);
    }

    @Override
    public Customers findByPhone(String phone) {
        return customerRepository.findByPhoneIgnoreCase(phone)
                .orElse(null);
    }

    @Override
    @Transactional
    public Customers createCustomer(CustomerRequest request, Integer createdByEmployeeId) {
        Customers customer = new Customers();
        customer.setFullName(request.getFullName());
        customer.setPhone(request.getPhone());
        customer.setEmail(request.getEmail());
        customer.setAddress(request.getAddress());
        customer.setNote(request.getNote());
        customer.setStatus(CustomerStatus.ACTIVE);

        if (createdByEmployeeId != null) {
            Employees createdBy = employeeRepository.findById(createdByEmployeeId).orElse(null);
            customer.setCreatedBy(createdBy);
        }

        return customerRepository.save(customer);
    }

    @Override
    public CustomerResponse toResponse(Customers customer) {
        if (customer == null) return null;

        return CustomerResponse.builder()
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phone(customer.getPhone())
                .email(customer.getEmail())
                .address(customer.getAddress())
                .note(customer.getNote())
                .status(customer.getStatus() != null ? customer.getStatus().name() : null)
                .build();
    }
}
