package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.service.EmployeeService;
import org.example.ptcmssbackend.service.EmailService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UsersRepository usersRepository;
    private final BranchesRepository branchesRepository;
    private final RolesRepository rolesRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Override
    public List<Employees> findAll() {
        return employeeRepository.findAll();
    }

    @Override
    public Employees findById(Integer id) {
        // Sử dụng findByIdWithDetails để eager load các relationships
        Optional<Employees> employeeOpt = employeeRepository.findByIdWithDetails(id);
        return employeeOpt.orElse(null);
    }

    @Override
    public Employees save(Employees employee) {
        return employeeRepository.save(employee);
    }

    @Override
    public void delete(Employees employee) {
        employeeRepository.delete(employee);
    }

    @Override
    public List<Employees> findByRoleName(String roleName) {
        return employeeRepository.findByRoleName(roleName);
    }

    @Override
    public List<Employees> findByBranchId(Integer branchId) {
        return employeeRepository.findByBranchId(branchId);
    }

    @Override
    @Transactional
    public Employees createEmployee(org.example.ptcmssbackend.dto.request.Employee.CreateEmployeeRequest request) {
        System.out.println("=== Creating Employee ===");
        System.out.println("Request: userId=" + request.getUserId() + ", branchId=" + request.getBranchId() + ", roleId=" + request.getRoleId());

        // Tìm User, Branch, Role từ ID
        Users user = usersRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));
        System.out.println("Found user: " + user.getId() + " - " + user.getFullName());

        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found with id: " + request.getBranchId()));
        System.out.println("Found branch: " + branch.getId() + " - " + branch.getBranchName());

        Roles role = rolesRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + request.getRoleId()));
        System.out.println("Found role: " + role.getId() + " - " + role.getRoleName());

        // Kiểm tra xem user đã là employee chưa
        if (employeeRepository.existsByUser_Id(request.getUserId())) {
            throw new RuntimeException("User is already an employee");
        }

        // Tạo Employee mới
        Employees employee = new Employees();
        employee.setUser(user);
        employee.setBranch(branch);
        employee.setRole(role);

        System.out.println("Employee before save - User: " + employee.getUser() + ", Branch: " + employee.getBranch() + ", Role: " + employee.getRole());

        // Set status
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            employee.setStatus(EmployeeStatus.valueOf(request.getStatus().toUpperCase()));
        } else {
            employee.setStatus(EmployeeStatus.ACTIVE);
        }

        System.out.println("Saving employee...");
        Employees saved = employeeRepository.save(employee);
        System.out.println("Employee saved with ID: " + saved.getEmployeeId());

        return saved;
    }

    @Override
    @Transactional
    public Employees updateEmployee(Integer id, org.example.ptcmssbackend.dto.request.Employee.UpdateEmployeeRequest request) {
        System.out.println("=== Updating Employee ===");
        System.out.println("Employee ID: " + id + ", branchId=" + request.getBranchId() + ", roleId=" + request.getRoleId());

        // Tìm employee hiện tại với eager loading
        Employees employee = employeeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));

        // Tìm Branch và Role mới
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found with id: " + request.getBranchId()));
        System.out.println("Found branch: " + branch.getId() + " - " + branch.getBranchName());

        Roles role = rolesRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + request.getRoleId()));
        System.out.println("Found role: " + role.getId() + " - " + role.getRoleName());

        // Cập nhật thông tin
        employee.setBranch(branch);
        employee.setRole(role);

        // Cập nhật status nếu có
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            employee.setStatus(EmployeeStatus.valueOf(request.getStatus().toUpperCase()));
        }

        System.out.println("Updating employee...");
        Employees updated = employeeRepository.save(employee);
        System.out.println("Employee updated successfully");

        return updated;
    }

    @Override
    @Transactional
    public Employees createEmployeeWithUser(org.example.ptcmssbackend.dto.request.Employee.CreateEmployeeWithUserRequest request) {
        System.out.println("=== Creating Employee with User ===");
        System.out.println("Request: username=" + request.getUsername() + ", branchId=" + request.getBranchId() + ", roleId=" + request.getRoleId());

        // Kiểm tra username đã tồn tại chưa
        if (usersRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists: " + request.getUsername());
        }

        // Kiểm tra email đã tồn tại chưa (nếu có)
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            if (usersRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new RuntimeException("Email already exists: " + request.getEmail());
            }
        }

        // Kiểm tra phone đã tồn tại chưa (nếu có)
        if (request.getPhone() != null && !request.getPhone().isEmpty()) {
            if (usersRepository.findByPhone(request.getPhone()).isPresent()) {
                throw new RuntimeException("Phone already exists: " + request.getPhone());
            }
        }

        // Tìm Branch và Role
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found with id: " + request.getBranchId()));
        System.out.println("Found branch: " + branch.getId() + " - " + branch.getBranchName());

        Roles role = rolesRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + request.getRoleId()));
        System.out.println("Found role: " + role.getId() + " - " + role.getRoleName());

        // 1. Tạo User mới (KHÔNG CÓ PASSWORD - sẽ tạo sau khi verify email)
        Users user = new Users();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString())); // Temporary random password
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        user.setRole(role);
        user.setStatus(UserStatus.INACTIVE); // Chưa kích hoạt - chờ verify email
        user.setEmailVerified(false);
        user.setVerificationToken(java.util.UUID.randomUUID().toString()); // Tạo verification token

        System.out.println("Saving user...");
        Users savedUser = usersRepository.save(user);
        System.out.println("User saved with ID: " + savedUser.getId());

        // 2. Tạo Employee với User vừa tạo
        Employees employee = new Employees();
        employee.setUser(savedUser);
        employee.setBranch(branch);
        employee.setRole(role);

        // Set status
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            employee.setStatus(EmployeeStatus.valueOf(request.getStatus().toUpperCase()));
        } else {
            employee.setStatus(EmployeeStatus.ACTIVE);
        }

        System.out.println("Saving employee...");
        Employees savedEmployee = employeeRepository.save(employee);
        System.out.println("Employee saved with ID: " + savedEmployee.getEmployeeId());

        // 3. Gửi email verification (nếu có email)
        if (savedUser.getEmail() != null && !savedUser.getEmail().isEmpty()) {
            try {
                String baseUrl = "http://localhost:8080"; // TODO: Get from config
                emailService.sendVerificationEmail(
                        savedUser.getEmail(),
                        savedUser.getFullName(),
                        savedUser.getVerificationToken(),
                        baseUrl
                );
                System.out.println("✉️ Verification email sent to: " + savedUser.getEmail());
            } catch (Exception e) {
                System.err.println("❌ Failed to send verification email: " + e.getMessage());
                // Không throw exception - vẫn tạo user thành công
            }
        }

        return savedEmployee;
    }

}