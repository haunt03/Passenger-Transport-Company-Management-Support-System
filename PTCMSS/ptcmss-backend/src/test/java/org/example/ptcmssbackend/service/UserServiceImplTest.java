package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.User.CreateUserRequest;
import org.example.ptcmssbackend.dto.request.User.UpdateUserRequest;
import org.example.ptcmssbackend.dto.response.User.UserResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.impl.UserServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UsersRepository usersRepository;

    @Mock
    private RolesRepository rolesRepository;

    @Mock
    private BranchesRepository branchesRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private LocalImageService localImageService;

    @InjectMocks
    private UserServiceImpl userService;

    // ==================== createUser() Tests ====================

    @Test
    void createUser_whenValidRequest_shouldCreateUserAndEmployee() throws Exception {
        // Setup mock request context
        MockHttpServletRequest mockRequest = new MockHttpServletRequest();
        mockRequest.setScheme("http");
        mockRequest.setServerName("localhost");
        mockRequest.setServerPort(8080);
        mockRequest.setContextPath("/api");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(mockRequest));
        
        // Given
        CreateUserRequest request = new CreateUserRequest();
        request.setFullName("Nguyễn Văn A");
        request.setUsername("nguyenvana");
        request.setEmail("nguyenvana@example.com");
        request.setPhone("0123456789");
        request.setAddress("Hà Nội");
        request.setRoleId(1);
        request.setBranchId(1);

        Roles role = new Roles();
        role.setId(1);
        role.setRoleName("EMPLOYEE");

        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");

        Users savedUser = new Users();
        savedUser.setId(100);
        savedUser.setFullName("Nguyễn Văn A");
        savedUser.setUsername("nguyenvana");
        savedUser.setEmail("nguyenvana@example.com");
        savedUser.setPhone("0123456789");
        savedUser.setStatus(UserStatus.INACTIVE);
        savedUser.setVerificationToken("token-123");

        Employees savedEmployee = new Employees();
        savedEmployee.setEmployeeId(50);
        savedEmployee.setUser(savedUser);
        savedEmployee.setBranch(branch);

        when(rolesRepository.findById(1)).thenReturn(Optional.of(role));
        when(branchesRepository.findById(1)).thenReturn(Optional.of(branch));
        when(usersRepository.existsByEmailIgnoreCase("nguyenvana@example.com")).thenReturn(false);
        when(usersRepository.existsByPhone("0123456789")).thenReturn(false);
        when(usersRepository.existsByUsername("nguyenvana")).thenReturn(false);
        when(usersRepository.save(any(Users.class))).thenReturn(savedUser);
        when(employeeRepository.existsByUser_Id(100)).thenReturn(false);
        when(employeeRepository.save(any(Employees.class))).thenReturn(savedEmployee);
        doNothing().when(emailService).sendVerificationEmail(anyString(), anyString(), anyString(), anyString());

        // When
        Integer result = userService.createUser(request);

        // Then
        assertThat(result).isEqualTo(100);
        verify(rolesRepository).findById(1);
        verify(branchesRepository).findById(1);
        verify(usersRepository).save(any(Users.class));
        verify(employeeRepository).save(any(Employees.class));
        verify(emailService).sendVerificationEmail(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void createUser_whenEmailExists_shouldThrowException() {
        // Given
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("existing@example.com");
        request.setRoleId(1);
        request.setBranchId(1);

        Roles role = new Roles();
        role.setId(1);

        Branches branch = new Branches();
        branch.setId(1);

        when(rolesRepository.findById(1)).thenReturn(Optional.of(role));
        when(branchesRepository.findById(1)).thenReturn(Optional.of(branch));
        when(usersRepository.existsByEmailIgnoreCase("existing@example.com")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Email đã tồn tại");
    }

    @Test
    void createUser_whenPhoneExists_shouldThrowException() {
        // Given
        CreateUserRequest request = new CreateUserRequest();
        request.setPhone("0123456789");
        request.setRoleId(1);
        request.setBranchId(1);

        Roles role = new Roles();
        role.setId(1);

        Branches branch = new Branches();
        branch.setId(1);

        when(rolesRepository.findById(1)).thenReturn(Optional.of(role));
        when(branchesRepository.findById(1)).thenReturn(Optional.of(branch));
        when(usersRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(usersRepository.existsByPhone("0123456789")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Số điện thoại đã tồn tại");
    }

    @Test
    void createUser_whenUsernameExists_shouldThrowException() {
        // Given
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("existinguser");
        request.setRoleId(1);
        request.setBranchId(1);

        Roles role = new Roles();
        role.setId(1);

        Branches branch = new Branches();
        branch.setId(1);

        when(rolesRepository.findById(1)).thenReturn(Optional.of(role));
        when(branchesRepository.findById(1)).thenReturn(Optional.of(branch));
        when(usersRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(usersRepository.existsByPhone(anyString())).thenReturn(false);
        when(usersRepository.existsByUsername("existinguser")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Tên đăng nhập đã tồn tại");
    }

    @Test
    void createUser_whenRoleNotFound_shouldThrowException() {
        // Given
        CreateUserRequest request = new CreateUserRequest();
        request.setRoleId(999);
        request.setBranchId(1);

        when(rolesRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy vai trò");
    }

    @Test
    void createUser_whenBranchNotFound_shouldThrowException() {
        // Given
        CreateUserRequest request = new CreateUserRequest();
        request.setRoleId(1);
        request.setBranchId(999);

        Roles role = new Roles();
        role.setId(1);

        when(rolesRepository.findById(1)).thenReturn(Optional.of(role));
        when(branchesRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    // ==================== updateUser() Tests ====================

    @Test
    void updateUser_whenValidRequest_shouldUpdateUser() {
        // Given
        Integer userId = 100;
        UpdateUserRequest request = new UpdateUserRequest();
        request.setFullName("Nguyễn Văn B");
        request.setEmail("nguyenvanb@example.com");
        request.setPhone("0987654321");
        request.setAddress("Hồ Chí Minh");
        request.setRoleId(2);
        request.setStatus(UserStatus.ACTIVE);

        Users existingUser = new Users();
        existingUser.setId(userId);
        existingUser.setFullName("Nguyễn Văn A");
        existingUser.setEmail("nguyenvana@example.com");
        existingUser.setPhone("0123456789");

        Roles newRole = new Roles();
        newRole.setId(2);
        newRole.setRoleName("MANAGER");

        when(usersRepository.findById(userId)).thenReturn(Optional.of(existingUser));
        when(usersRepository.findByPhone("0987654321")).thenReturn(Optional.empty());
        when(usersRepository.findByEmail("nguyenvanb@example.com")).thenReturn(Optional.empty());
        when(rolesRepository.findById(2)).thenReturn(Optional.of(newRole));
        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(usersRepository.save(any(Users.class))).thenReturn(existingUser);

        // When
        Integer result = userService.updateUser(userId, request);

        // Then
        assertThat(result).isEqualTo(userId);
        verify(usersRepository).findById(userId);
        verify(usersRepository).save(existingUser);
    }

    @Test
    void updateUser_whenPhoneExistsForOtherUser_shouldThrowException() {
        // Given
        Integer userId = 100;
        UpdateUserRequest request = new UpdateUserRequest();
        request.setPhone("0987654321");

        Users existingUser = new Users();
        existingUser.setId(userId);

        Users otherUser = new Users();
        otherUser.setId(200);
        otherUser.setPhone("0987654321");

        when(usersRepository.findById(userId)).thenReturn(Optional.of(existingUser));
        when(usersRepository.findByPhone("0987654321")).thenReturn(Optional.of(otherUser));

        // When & Then
        assertThatThrownBy(() -> userService.updateUser(userId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Số điện thoại đã được sử dụng");
    }

    @Test
    void updateUser_whenUserNotFound_shouldThrowException() {
        // Given
        Integer userId = 999;
        UpdateUserRequest request = new UpdateUserRequest();

        when(usersRepository.findById(userId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateUser(userId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy người dùng");
    }

    // ==================== getUserById() Tests ====================

    @Test
    void getUserById_whenUserExists_shouldReturnUserResponse() {
        // Given
        Integer userId = 100;

        Users user = new Users();
        user.setId(userId);
        user.setFullName("Nguyễn Văn A");
        user.setEmail("nguyenvana@example.com");
        user.setPhone("0123456789");
        user.setAddress("Hà Nội");
        user.setStatus(UserStatus.ACTIVE);

        Roles role = new Roles();
        role.setId(1);
        role.setRoleName("EMPLOYEE");
        user.setRole(role);

        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");

        Employees employee = new Employees();
        employee.setUser(user);
        employee.setBranch(branch);

        when(usersRepository.findById(userId)).thenReturn(Optional.of(user));
        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.of(employee));

        // When
        UserResponse result = userService.getUserById(userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(userId);
        assertThat(result.getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(result.getEmail()).isEqualTo("nguyenvana@example.com");
        assertThat(result.getRoleName()).isEqualTo("EMPLOYEE");
        assertThat(result.getBranchId()).isEqualTo(1);
        assertThat(result.getBranchName()).isEqualTo("Chi nhánh Hà Nội");
    }

    @Test
    void getUserById_whenUserNotFound_shouldThrowException() {
        // Given
        Integer userId = 999;

        when(usersRepository.findById(userId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.getUserById(userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy người dùng");
    }

    // ==================== toggleUserStatus() Tests ====================

    @Test
    void toggleUserStatus_whenActiveUser_shouldSetToInactive() {
        // Given
        Integer userId = 100;

        Users user = new Users();
        user.setId(userId);
        user.setStatus(UserStatus.ACTIVE);

        Roles role = new Roles();
        role.setRoleName("EMPLOYEE");
        user.setRole(role);

        when(usersRepository.findById(userId)).thenReturn(Optional.of(user));
        when(usersRepository.save(any(Users.class))).thenReturn(user);

        // When
        userService.toggleUserStatus(userId);

        // Then
        verify(usersRepository).save(user);
        assertThat(user.getStatus()).isEqualTo(UserStatus.INACTIVE);
    }

    @Test
    void toggleUserStatus_whenInactiveUser_shouldSetToActive() {
        // Given
        Integer userId = 100;

        Users user = new Users();
        user.setId(userId);
        user.setStatus(UserStatus.INACTIVE);

        Roles role = new Roles();
        role.setRoleName("EMPLOYEE");
        user.setRole(role);

        when(usersRepository.findById(userId)).thenReturn(Optional.of(user));
        when(usersRepository.save(any(Users.class))).thenReturn(user);

        // When
        userService.toggleUserStatus(userId);

        // Then
        verify(usersRepository).save(user);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void toggleUserStatus_whenAdminUser_shouldNotAllowDeactivation() {
        // Given
        Integer userId = 100;

        Users user = new Users();
        user.setId(userId);
        user.setStatus(UserStatus.ACTIVE);

        Roles role = new Roles();
        role.setRoleName("ADMIN");
        user.setRole(role);

        when(usersRepository.findById(userId)).thenReturn(Optional.of(user));

        // When & Then
        assertThatThrownBy(() -> userService.toggleUserStatus(userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không thể vô hiệu hóa tài khoản Admin");
    }

    // ==================== getAllUsers() Tests ====================

    @Test
    void getAllUsers_whenNoFilters_shouldReturnAllUsers() {
        // Given
        Users user1 = new Users();
        user1.setId(1);
        user1.setFullName("Nguyễn Văn A");
        user1.setEmail("a@example.com");
        user1.setStatus(UserStatus.ACTIVE);

        Roles role = new Roles();
        role.setRoleName("EMPLOYEE");
        user1.setRole(role);

        Users user2 = new Users();
        user2.setId(2);
        user2.setFullName("Trần Thị B");
        user2.setEmail("b@example.com");
        user2.setStatus(UserStatus.ACTIVE);
        user2.setRole(role);

        when(usersRepository.findAll()).thenReturn(List.of(user1, user2));

        // When
        List<UserResponse> result = userService.getAllUsers(null, null, null);

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(result.get(1).getFullName()).isEqualTo("Trần Thị B");
    }

    @Test
    void getAllUsers_whenKeywordFilter_shouldFilterByKeyword() {
        // Given
        Users user1 = new Users();
        user1.setId(1);
        user1.setFullName("Nguyễn Văn A");
        user1.setEmail("nguyenvana@example.com");
        user1.setStatus(UserStatus.ACTIVE);

        Roles role = new Roles();
        role.setRoleName("EMPLOYEE");
        user1.setRole(role);

        Users user2 = new Users();
        user2.setId(2);
        user2.setFullName("Trần Thị B");
        user2.setEmail("tranthib@example.com");
        user2.setStatus(UserStatus.ACTIVE);
        user2.setRole(role);

        when(usersRepository.findAll()).thenReturn(List.of(user1, user2));

        // When
        List<UserResponse> result = userService.getAllUsers("Nguyễn", null, null);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getFullName()).isEqualTo("Nguyễn Văn A");
    }

    // ==================== updateAvatar() Tests ====================

    @Test
    void updateAvatar_whenValidFile_shouldUpdateAvatar() {
        // Given
        Integer userId = 100;
        MultipartFile file = mock(MultipartFile.class);

        Users user = new Users();
        user.setId(userId);
        user.setAvatar("old-avatar.jpg");

        when(usersRepository.findById(userId)).thenReturn(Optional.of(user));
        when(localImageService.saveImage(file)).thenReturn("new-avatar.jpg");
        when(usersRepository.save(any(Users.class))).thenReturn(user);

        // When
        String result = userService.updateAvatar(userId, file);

        // Then
        assertThat(result).isEqualTo("new-avatar.jpg");
        assertThat(user.getAvatar()).isEqualTo("new-avatar.jpg");
        verify(localImageService).saveImage(file);
        verify(usersRepository).save(user);
    }

    @Test
    void updateAvatar_whenUserNotFound_shouldThrowException() {
        // Given
        Integer userId = 999;
        MultipartFile file = mock(MultipartFile.class);

        when(usersRepository.findById(userId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateAvatar(userId, file))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy người dùng");
    }
}

