package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.request.User.ChangePasswordRequest;
import org.example.ptcmssbackend.dto.response.User.UserResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.EmailService;
import org.example.ptcmssbackend.service.LocalImageService;
import org.example.ptcmssbackend.service.UserService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.UnsupportedEncodingException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.mail.MessagingException;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UsersRepository usersRepository;
    private final RolesRepository rolesRepository;
    private final BranchesRepository branchesRepository;
    private final EmployeeRepository employeeRepository;
    private final EmailService emailService;
    private final LocalImageService localImageService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public Integer createUser(CreateUserRequest request) {
        // Validate role
        Roles role = rolesRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò"));

        // Validate branch
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh"));

        // Validate unique fields
        String email = Optional.ofNullable(request.getEmail()).map(String::trim).orElse(null);
        if (StringUtils.hasText(email) && usersRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã tồn tại");
        }
        String phone = Optional.ofNullable(request.getPhone()).map(String::trim).orElse(null);
        if (StringUtils.hasText(phone) && usersRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã tồn tại");
        }
        String username = Optional.ofNullable(request.getUsername()).map(String::trim).orElse(null);
        if (StringUtils.hasText(username) && usersRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên đăng nhập đã tồn tại");
        }

        // Tạo user mới (chưa kích hoạt)
        Users user = new Users();
        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        user.setRole(role);
        user.setPasswordHash("TEAMP123"); // gán mật khẩu tạm thời
        user.setStatus(UserStatus.INACTIVE); // chưa kích hoạt
        user.setEmailVerified(false);
        user.setVerificationToken(UUID.randomUUID().toString());

        Users savedUser = usersRepository.save(user);
        log.info("User created successfully with ID: {}", savedUser.getId());

        // Tự động tạo Employee và gắn branch
        try {
            // Kiểm tra xem user đã là employee chưa (tránh duplicate)
            if (!employeeRepository.existsByUser_Id(savedUser.getId())) {
                Employees employee = new Employees();
                employee.setUser(savedUser);
                employee.setBranch(branch);
                employee.setRole(role);
                employee.setStatus(EmployeeStatus.ACTIVE); // Mặc định ACTIVE
                
                Employees savedEmployee = employeeRepository.save(employee);
                log.info("Employee created automatically with ID: {} for user ID: {} in branch ID: {}", 
                        savedEmployee.getEmployeeId(), savedUser.getId(), branch.getId());
            } else {
                log.warn("User {} is already an employee, skipping employee creation", savedUser.getId());
            }
        } catch (Exception e) {
            log.error("Failed to create employee for user {}: {}", savedUser.getId(), e.getMessage(), e);
            // Không throw exception để không rollback user creation
            // Có thể tạo employee sau bằng cách thủ công
        }

        // Tạo đường dẫn xác thực (URL base theo domain)
        String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
        String verificationUrl = baseUrl + "/api/auth/verify?token=" + user.getVerificationToken();

        try {
            emailService.sendVerificationEmail(
                    user.getEmail(),
                    user.getFullName(),
                    user.getUsername(), // Truyền username vào email
                    verificationUrl
            );
            log.info("Verification email sent successfully");
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send verification email: {}", e.getMessage(), e);
            // Không throw exception để không rollback user creation
        }

        log.info("User and Employee created successfully for user ID: {}", savedUser.getId());

        return savedUser.getId();
    }

    @Override
    @Transactional
    public Integer updateUser(Integer id, UpdateUserRequest request) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        
        // Chỉ Admin mới được gọi method này (đã check ở Controller)
        
        // Validation: Kiểm tra phone trùng với user khác (trừ chính user hiện tại)
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            String phone = request.getPhone().trim();
            Optional<Users> existingUserWithPhone = usersRepository.findByPhone(phone);
            if (existingUserWithPhone.isPresent() && !existingUserWithPhone.get().getId().equals(id)) {
                throw new RuntimeException("Số điện thoại đã được sử dụng bởi người dùng khác. Vui lòng sử dụng số điện thoại khác.");
            }
        }
        
        // Validation: Kiểm tra email trùng với user khác (trừ chính user hiện tại)
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String email = request.getEmail().trim();
            Optional<Users> existingUserWithEmail = usersRepository.findByEmail(email);
            if (existingUserWithEmail.isPresent() && !existingUserWithEmail.get().getId().equals(id)) {
                throw new RuntimeException("Email đã được sử dụng bởi người dùng khác. Vui lòng sử dụng email khác.");
            }
        }
        
        // Admin có thể cập nhật tất cả thông tin
        user.setFullName(request.getFullName());
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }
        
        // Cập nhật role
        if (request.getRoleId() != null) {
            Roles role = rolesRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò"));
            user.setRole(role);
            
            // Đồng bộ role sang employee (nếu có)
            Employees employee = employeeRepository.findByUserId(id).orElse(null);
            if (employee != null) {
                employee.setRole(role);
                employeeRepository.save(employee);
            }
        }
        
        // Cập nhật status
        if (request.getStatus() != null)
            user.setStatus(request.getStatus());
        
        // Cập nhật branch (nếu có)
        if (request.getBranchId() != null) {
            Branches branch = branchesRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh"));
            
            // Tìm hoặc tạo employee record
            Employees employee = employeeRepository.findByUserId(id).orElse(null);
            if (employee != null) {
                employee.setBranch(branch);
                employeeRepository.save(employee);
            }
        }
        
        try {
            usersRepository.save(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Catch database constraint violations (unique key violations)
            String errorMsg = e.getMessage();
            if (errorMsg != null && (errorMsg.contains("phone") || errorMsg.contains("Phone"))) {
                throw new RuntimeException("Số điện thoại đã được sử dụng bởi người dùng khác. Vui lòng sử dụng số điện thoại khác.");
            } else if (errorMsg != null && (errorMsg.contains("email") || errorMsg.contains("Email"))) {
                throw new RuntimeException("Email đã được sử dụng bởi người dùng khác. Vui lòng sử dụng email khác.");
            } else {
                throw new RuntimeException("Dữ liệu không hợp lệ hoặc đã tồn tại trong hệ thống: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()));
            }
        }
        
        return user.getId();
    }

    @Override
    @Transactional
    public Integer updateProfile(Integer id, org.example.ptcmssbackend.dto.request.User.UpdateProfileRequest request) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        
        // Chỉ cho phép user tự cập nhật profile của mình (đã check ở Controller)
        
        // Validation: Kiểm tra phone trùng với user khác (trừ chính user hiện tại)
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            String phone = request.getPhone().trim();
            Optional<Users> existingUserWithPhone = usersRepository.findByPhone(phone);
            if (existingUserWithPhone.isPresent() && !existingUserWithPhone.get().getId().equals(id)) {
                throw new RuntimeException("Số điện thoại đã được sử dụng bởi người dùng khác. Vui lòng sử dụng số điện thoại khác.");
            }
            user.setPhone(phone);
        }
        
        // Cập nhật address
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }
        
        try {
            usersRepository.save(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String errorMsg = e.getMessage();
            if (errorMsg != null && (errorMsg.contains("phone") || errorMsg.contains("Phone"))) {
                throw new RuntimeException("Số điện thoại đã được sử dụng bởi người dùng khác. Vui lòng sử dụng số điện thoại khác.");
            } else {
                throw new RuntimeException("Dữ liệu không hợp lệ: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()));
            }
        }
        
        return user.getId();
    }

    @Override
    @Transactional
    public void changePassword(Integer id, ChangePasswordRequest request) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        
        // Kiểm tra mật khẩu hiện tại
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu hiện tại không đúng");
        }
        
        // Kiểm tra mật khẩu mới và xác nhận mật khẩu khớp nhau
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu mới và xác nhận mật khẩu không khớp");
        }
        
        // Kiểm tra mật khẩu mới khác mật khẩu hiện tại
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        
        // Cập nhật mật khẩu mới
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        usersRepository.save(user);
        
        log.info("Password changed successfully for user ID: {}", id);
    }

    @Override
    public List<UserResponse> getAllUsers(String keyword, Integer roleId, UserStatus status) {
        return usersRepository.findAll().stream()
                .filter(u -> (keyword == null || u.getFullName().toLowerCase().contains(keyword.toLowerCase())
                        || (u.getEmail() != null && u.getEmail().contains(keyword)))
                        && (roleId == null || (u.getRole() != null && u.getRole().getId().equals(roleId)))
                        && (status == null || u.getStatus() == status))
                .map(u -> UserResponse.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .phone(u.getPhone())
                        .roleName(u.getRole() != null ? u.getRole().getRoleName() : null)
                        .status(u.getStatus() != null ? u.getStatus().name() : null)
                        .build())
                .toList();
    }

    @Override
    public UserResponse getUserById(Integer id) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        Employees employee = employeeRepository.findByUserId(id).orElse(null);
        Integer branchId = null;
        String branchName = null;
        if (employee != null && employee.getBranch() != null) {
            branchId = employee.getBranch().getId();
            branchName = employee.getBranch().getBranchName();
        }

        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .imgUrl(user.getAvatar())
                .roleName(user.getRole() != null ? user.getRole().getRoleName() : null)
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .branchId(branchId)
                .branchName(branchName)
                .build();
    }

    @Override
    public void toggleUserStatus(Integer id) {
        Users user = usersRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        
        // Validation: Không cho phép vô hiệu hóa admin
        if (user.getRole() != null && "ADMIN".equals(user.getRole().getRoleName())) {
            if (user.getStatus() == UserStatus.ACTIVE) {
                throw new RuntimeException("Không thể vô hiệu hóa tài khoản Admin. Phải có ít nhất một tài khoản Admin hoạt động trong hệ thống.");
            }
        }
        
        user.setStatus(user.getStatus() == UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE);
        usersRepository.save(user);
    }

    @Override
    public String updateAvatar(Integer userId, MultipartFile file) {
        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        // Lưu ảnh mới
        String imageUrl = localImageService.saveImage(file);
        user.setAvatar(imageUrl);
        usersRepository.save(user);

        log.info("update avatar thành công");

        return imageUrl;
    }

    @Override
    public List<UserResponse> searchUsers(String keyword, Integer roleId, Integer branchId, UserStatus status) {

        // Keyword rỗng thì set NULL để query ko bị lỗi
        if (keyword != null && keyword.trim().isEmpty()) {
            keyword = null;
        }

        List<Users> users = usersRepository.searchUsers(keyword, roleId, branchId, status);

        return users.stream()
                .map(u -> UserResponse.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .phone(u.getPhone())
                        .address(u.getAddress())
                        .imgUrl(u.getAvatar())
                        .roleName(u.getRole().getRoleName())
                        .status(u.getStatus().name())
                        .build()
                ).toList();
    }

    @Override
    public List<UserResponse> getUsersByBranch(Integer branchId) {
        List<Users> users = usersRepository.findUsersByBranchId(branchId);

        return users.stream().map(u ->
                UserResponse.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .phone(u.getPhone())
                        .address(u.getAddress())
                        .imgUrl(u.getAvatar())
                        .roleName(u.getRole().getRoleName())
                        .status(u.getStatus().name())
                        .build()
        ).toList();
    }

}

