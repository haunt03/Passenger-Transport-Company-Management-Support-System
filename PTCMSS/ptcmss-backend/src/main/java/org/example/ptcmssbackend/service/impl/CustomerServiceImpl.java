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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

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

        Integer branchId = null;
        String branchName = null;
        if (customer.getCreatedBy() != null && customer.getCreatedBy().getBranch() != null) {
            branchId = customer.getCreatedBy().getBranch().getId();
            branchName = customer.getCreatedBy().getBranch().getBranchName();
        }

        return CustomerResponse.builder()
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phone(customer.getPhone())
                .email(customer.getEmail())
                .address(customer.getAddress())
                .note(customer.getNote())
                .status(customer.getStatus() != null ? customer.getStatus().name() : null)
                .createdAt(customer.getCreatedAt())
                .branchId(branchId)
                .branchName(branchName)
                .build();
    }

    @Override
    public Page<CustomerResponse> listCustomers(String keyword, Integer branchId, Integer userId, LocalDate fromDate, LocalDate toDate, int page, int size) {
        log.info("[CustomerService] List customers - keyword={}, branchId={}, userId={}, from={}, to={}, page={}, size={}",
                keyword, branchId, userId, fromDate, toDate, page, size);

        // Nếu có userId, kiểm tra xem user có phải là MANAGER không
        // Nếu là MANAGER, tự động filter theo chi nhánh của manager
        Integer effectiveBranchId = branchId;
        if (userId != null && effectiveBranchId == null) {
            log.info("[CustomerService] Checking user role for userId={}", userId);
            Employees employee = employeeRepository.findByUserId(userId).orElse(null);
            if (employee != null) {
                log.info("[CustomerService] Found employee: employeeId={}, branchId={}", employee.getEmployeeId(),
                        employee.getBranch() != null ? employee.getBranch().getId() : null);
                if (employee.getBranch() != null) {
                    // Kiểm tra role của user
                    if (employee.getUser() != null && employee.getUser().getRole() != null) {
                        String role = employee.getUser().getRole().getRoleName();
                        log.info("[CustomerService] User role: {}", role);
                        if ("MANAGER".equals(role)) {
                            effectiveBranchId = employee.getBranch().getId();
                            log.info("[CustomerService] Manager detected - auto filtering by branchId={}", effectiveBranchId);
                        }
                    } else {
                        log.warn("[CustomerService] User or role is null for employee employeeId={}", employee.getEmployeeId());
                    }
                }
            } else {
                log.warn("[CustomerService] No employee found for userId={}", userId);
            }
        } else {
            log.info("[CustomerService] Skipping role check - userId={}, effectiveBranchId={}", userId, effectiveBranchId);
        }

        Instant fromInstant = fromDate != null ? fromDate.atStartOfDay(ZoneId.systemDefault()).toInstant() : null;
        Instant toInstant = toDate != null ? toDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant() : null;

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Customers> customersPage = customerRepository.findWithFilters(keyword, effectiveBranchId, fromInstant, toInstant, pageable);

        return customersPage.map(this::toResponse);
    }
}

