package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Drivers;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.DriverRepository;
import org.example.ptcmssbackend.service.EmployeeService;
import org.example.ptcmssbackend.service.EmailService;
import org.springframework.core.env.Environment;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final DriverRepository driverRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final Environment environment;

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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + request.getUserId()));
        System.out.println("Found user: " + user.getId() + " - " + user.getFullName());

        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh với ID: " + request.getBranchId()));
        System.out.println("Found branch: " + branch.getId() + " - " + branch.getBranchName());

        Roles role = rolesRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò với ID: " + request.getRoleId()));
        System.out.println("Found role: " + role.getId() + " - " + role.getRoleName());

        // Kiểm tra xem user đã là employee chưa
        if (employeeRepository.existsByUser_Id(request.getUserId())) {
            throw new RuntimeException("Người dùng này đã là nhân viên");
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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với ID: " + id));

        // Tìm Branch và Role mới
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh với ID: " + request.getBranchId()));
        System.out.println("Found branch: " + branch.getId() + " - " + branch.getBranchName());

        Roles role = rolesRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò với ID: " + request.getRoleId()));
        System.out.println("Found role: " + role.getId() + " - " + role.getRoleName());

        // Cập nhật thông tin
        employee.setBranch(branch);
        employee.setRole(role);

        // Cập nhật status nếu có
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            employee.setStatus(EmployeeStatus.valueOf(request.getStatus().toUpperCase()));
        }

        // Cập nhật thông tin user liên quan
        Users user = employee.getUser();
        if (user == null) {
            throw new RuntimeException("Nhân viên không gắn với tài khoản người dùng hợp lệ");
        }

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getEmail() != null) {
            String email = request.getEmail().trim();
            if (!email.isEmpty() && !email.equalsIgnoreCase(user.getEmail() != null ? user.getEmail() : "")) {
                usersRepository.findByEmail(email)
                        .filter(existing -> !existing.getId().equals(user.getId()))
                        .ifPresent(existing -> {
                            throw new RuntimeException("Email đã tồn tại: " + email);
                        });
                user.setEmail(email);
            } else if (email.isEmpty()) {
                user.setEmail(null);
            }
        }

        if (request.getPhone() != null) {
            String phone = request.getPhone().trim();
            if (!phone.isEmpty() && !phone.equals(user.getPhone() != null ? user.getPhone() : "")) {
                usersRepository.findByPhone(phone)
                        .filter(existing -> !existing.getId().equals(user.getId()))
                        .ifPresent(existing -> {
                            throw new RuntimeException("Số điện thoại đã tồn tại: " + phone);
                        });
                user.setPhone(phone);
            } else if (phone.isEmpty()) {
                user.setPhone(null);
            }
        }

        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }

        usersRepository.save(user);

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
            throw new RuntimeException("Tên đăng nhập đã tồn tại: " + request.getUsername());
        }

        // Kiểm tra email đã tồn tại chưa (nếu có)
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            if (usersRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new RuntimeException("Email đã tồn tại: " + request.getEmail());
            }
        }

        // Kiểm tra phone đã tồn tại chưa (nếu có)
        if (request.getPhone() != null && !request.getPhone().isEmpty()) {
            if (usersRepository.findByPhone(request.getPhone()).isPresent()) {
                throw new RuntimeException("Số điện thoại đã tồn tại: " + request.getPhone());
            }
        }

        // Tìm Branch và Role
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh với ID: " + request.getBranchId()));
        System.out.println("Found branch: " + branch.getId() + " - " + branch.getBranchName());

        Roles role = rolesRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò với ID: " + request.getRoleId()));
        System.out.println("Found role: " + role.getId() + " - " + role.getRoleName());

        // ====== PHÂN QUYỀN: Manager chỉ được tạo nhân viên trong chi nhánh của mình
        // và chỉ được tạo các role có quyền thấp hơn (không được tạo ADMIN / MANAGER)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            boolean isManager = auth.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_MANAGER".equalsIgnoreCase(a.getAuthority()));

            if (isManager) {
                Users currentUser = null;
                if (auth.getPrincipal() instanceof Users) {
                    currentUser = (Users) auth.getPrincipal();
                }

                // Lấy chi nhánh mà Manager đang phụ trách
                if (currentUser != null) {
                    Integer managerBranchId = employeeRepository.findByUserId(currentUser.getId())
                            .map(e -> e.getBranch() != null ? e.getBranch().getId() : null)
                            .orElse(null);

                    if (managerBranchId == null) {
                        throw new RuntimeException("Tài khoản quản lý chưa được gán chi nhánh, không thể tạo nhân viên mới.");
                    }

                    if (!managerBranchId.equals(branch.getId())) {
                        throw new RuntimeException("Bạn chỉ được tạo nhân viên trong chi nhánh mình phụ trách.");
                    }
                }

                // Manager không được tạo tài khoản có vai trò Admin/Manager
                String newRoleName = role.getRoleName() != null ? role.getRoleName().trim().toUpperCase() : "";
                if ("ADMIN".equals(newRoleName) || "MANAGER".equals(newRoleName) || "QUẢN LÝ".equals(newRoleName)) {
                    throw new RuntimeException("Quản lý không được phép tạo tài khoản với vai trò Admin hoặc Manager.");
                }
            }
        }

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

        // 2.1 Nếu role là DRIVER, tự động tạo Driver record
        if ("DRIVER".equalsIgnoreCase(role.getRoleName()) || "Tài xế".equalsIgnoreCase(role.getRoleName())) {
            System.out.println("Creating Driver record for employee...");
            Drivers driver = new Drivers();
            driver.setEmployee(savedEmployee);
            driver.setBranch(branch);

            // Set license number from request
            if (request.getLicenseNumber() != null && !request.getLicenseNumber().trim().isEmpty()) {
                driver.setLicenseNumber(request.getLicenseNumber().trim());
            } else {
                throw new RuntimeException("Số bằng lái là bắt buộc đối với tài xế");
            }

            // Các thông tin chi tiết về xe,... sẽ được cập nhật sau
            driverRepository.save(driver);
            System.out.println("Driver record created successfully with license: " + driver.getLicenseNumber());
        }

        // 3. Gửi email verification (nếu có email)
        if (savedUser.getEmail() != null && !savedUser.getEmail().isEmpty()) {
            try {
                // Lấy baseUrl từ config, fallback về localhost nếu không có
                String baseUrl = environment.getProperty("app.base-url", "https://api.hethongvantai.site");
                // Link verification sẽ vừa verify email vừa cho phép set password
                String verificationUrl = baseUrl + "/api/auth/verify?token=" + savedUser.getVerificationToken();
                emailService.sendVerificationEmail(
                        savedUser.getEmail(),
                        savedUser.getFullName(),
                        savedUser.getUsername(), // Truyền username vào email
                        verificationUrl
                );
                System.out.println("✉️ Verification email sent to: " + savedUser.getEmail());
            } catch (Exception e) {
                System.err.println("❌ Failed to send verification email: " + e.getMessage());
                // Không throw exception - vẫn tạo user thành công
            }
        }

        return savedEmployee;
    }

    @Override
    public Employees findByUserId(Integer userId) {
        return employeeRepository.findByUserId(userId).orElse(null);
    }

    @Override
    public List<Employees> findAvailableManagers(Integer excludeBranchId) {
        // Lấy tất cả managers
        List<Employees> allManagers = findByRoleName("Manager");

        // Lấy danh sách chi nhánh
        List<Branches> branches = branchesRepository.findAll();

        // Lọc ra managers chưa được gán hoặc đang quản lý chi nhánh excludeBranchId
        return allManagers.stream()
                .filter(manager -> {
                    // Tìm chi nhánh có manager này
                    boolean isAssigned = branches.stream()
                            .anyMatch(branch ->
                                    branch.getManager() != null &&
                                            branch.getManager().getEmployeeId().equals(manager.getEmployeeId()) &&
                                            (excludeBranchId == null || !branch.getId().equals(excludeBranchId))
                            );
                    return !isAssigned;
                })
                .collect(java.util.stream.Collectors.toList());
    }
}
