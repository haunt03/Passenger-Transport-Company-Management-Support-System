package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Driver.CreateDriverRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.response.Driver.DriverResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.DriverRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.DriverService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DriverServiceIntegrationTest {

    @Autowired
    private DriverService driverService;

    @Autowired
    private BranchesRepository branchesRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Branches testBranch;
    private Employees testEmployee;

    @BeforeEach
    void setUp() {
        // Create test branch
        testBranch = new Branches();
        testBranch.setBranchName("Chi nhánh Test");
        testBranch.setLocation("123 Test Street");
        testBranch.setStatus(BranchStatus.ACTIVE);
        testBranch = branchesRepository.save(testBranch);

        // Create test role
        Roles role = new Roles();
        role.setRoleName("DRIVER");
        role.setDescription("Driver Role");
        role = rolesRepository.save(role);

        // Create test user
        Users user = new Users();
        user.setFullName("Test Driver");
        user.setUsername("testdriver");
        user.setEmail("driver@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(role);
        user = usersRepository.save(user);

        // Create test employee
        testEmployee = new Employees();
        testEmployee.setUser(user);
        testEmployee.setBranch(testBranch);
        testEmployee.setRole(role);
        testEmployee.setStatus(EmployeeStatus.ACTIVE);
        testEmployee = employeeRepository.save(testEmployee);
    }

    @Test
    void createDriver_shouldCreateDriverSuccessfully() {
        // Given
        CreateDriverRequest request = new CreateDriverRequest();
        request.setBranchId(testBranch.getId());
        request.setEmployeeId(testEmployee.getEmployeeId());
        request.setLicenseNumber("DL123456");
        request.setLicenseClass("C");
        request.setLicenseExpiry(LocalDate.now().plusYears(5));
        request.setHealthCheckDate(LocalDate.now());
        request.setPriorityLevel(1);

        // When
        DriverResponse response = driverService.createDriver(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isNotNull();
        assertThat(response.getLicenseNumber()).isEqualTo("DL123456");
    }

    @Test
    void getDriversByBranchId_shouldReturnDrivers() {
        // Given
        CreateDriverRequest request = new CreateDriverRequest();
        request.setBranchId(testBranch.getId());
        request.setEmployeeId(testEmployee.getEmployeeId());
        request.setLicenseNumber("DL123456");
        request.setLicenseClass("C");
        request.setLicenseExpiry(LocalDate.now().plusYears(5));
        request.setHealthCheckDate(LocalDate.now());
        request.setPriorityLevel(1);
        driverService.createDriver(request);

        // When
        java.util.List<DriverResponse> result = driverService.getDriversByBranchId(testBranch.getId());

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void updateProfile_shouldUpdateProfileSuccessfully() {
        // Given
        CreateDriverRequest createRequest = new CreateDriverRequest();
        createRequest.setBranchId(testBranch.getId());
        createRequest.setEmployeeId(testEmployee.getEmployeeId());
        createRequest.setLicenseNumber("DL123456");
        createRequest.setLicenseClass("C");
        createRequest.setLicenseExpiry(LocalDate.now().plusYears(5));
        createRequest.setHealthCheckDate(LocalDate.now());
        createRequest.setPriorityLevel(1);
        DriverResponse driver = driverService.createDriver(createRequest);

        DriverProfileUpdateRequest updateRequest = new DriverProfileUpdateRequest();
        updateRequest.setNote("Updated note");

        // When
        org.example.ptcmssbackend.dto.response.Driver.DriverProfileResponse response = 
                driverService.updateProfile(driver.getId(), updateRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getDriverId()).isEqualTo(driver.getId());
    }
}
