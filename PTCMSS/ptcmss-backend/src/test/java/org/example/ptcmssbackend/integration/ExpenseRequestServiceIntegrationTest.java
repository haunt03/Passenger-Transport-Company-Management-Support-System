package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.expense.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.response.expense.ExpenseRequestResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.ExpenseRequests;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.entity.VehicleCategoryPricing;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.enums.VehicleCategoryStatus;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.ExpenseRequestRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.repository.VehicleCategoryPricingRepository;
import org.example.ptcmssbackend.repository.VehicleRepository;
import org.example.ptcmssbackend.service.ExpenseRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ExpenseRequestServiceIntegrationTest {

    @Autowired
    private ExpenseRequestService expenseRequestService;

    @Autowired
    private ExpenseRequestRepository expenseRequestRepository;

    @Autowired
    private BranchesRepository branchesRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private VehicleCategoryPricingRepository categoryRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Branches testBranch;
    private Vehicles testVehicle;
    private Users testUser;

    @BeforeEach
    void setUp() {
        // Create test branch
        testBranch = new Branches();
        testBranch.setBranchName("Test Branch");
        testBranch.setLocation("123 Test Street");
        testBranch.setStatus(BranchStatus.ACTIVE);
        testBranch = branchesRepository.save(testBranch);

        // Create test vehicle category
        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setCategoryName("4 Seater");
        category.setSeats(4);
        category.setStatus(VehicleCategoryStatus.ACTIVE);
        category = categoryRepository.save(category);

        // Create test vehicle
        testVehicle = new Vehicles();
        testVehicle.setCategory(category);
        testVehicle.setBranch(testBranch);
        testVehicle.setLicensePlate("30A-12345");
        testVehicle.setStatus(VehicleStatus.AVAILABLE);
        testVehicle = vehicleRepository.save(testVehicle);

        // Create test role
        Roles role = new Roles();
        role.setRoleName("DRIVER");
        role.setDescription("Driver Role");
        role = rolesRepository.save(role);

        // Create test user
        testUser = new Users();
        testUser.setFullName("Test Driver");
        testUser.setUsername("testdriver");
        testUser.setEmail("driver@example.com");
        testUser.setPhone("0987654321");
        testUser.setPasswordHash(passwordEncoder.encode("password123"));
        testUser.setStatus(UserStatus.ACTIVE);
        testUser.setRole(role);
        testUser = usersRepository.save(testUser);
    }

    @Test
    void createExpenseRequest_shouldCreateRequestSuccessfully() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("fuel");
        request.setVehicleId(testVehicle.getId());
        request.setAmount(new BigDecimal("500000"));
        request.setNote("Test expense");
        request.setBranchId(testBranch.getId());
        request.setRequesterUserId(testUser.getId());

        // When
        ExpenseRequestResponse result = expenseRequestService.createExpenseRequest(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getType()).isEqualTo("fuel");
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("500000"));
        assertThat(result.getStatus()).isEqualTo("PENDING");
        assertThat(result.getBranchId()).isEqualTo(testBranch.getId());
        assertThat(result.getVehicleId()).isEqualTo(testVehicle.getId());
        assertThat(result.getRequesterUserId()).isEqualTo(testUser.getId());
    }

    @Test
    void createExpenseRequest_withoutVehicle_shouldCreateRequest() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("toll");
        request.setAmount(new BigDecimal("100000"));
        request.setNote("Toll fee");
        request.setBranchId(testBranch.getId());
        request.setRequesterUserId(testUser.getId());

        // When
        ExpenseRequestResponse result = expenseRequestService.createExpenseRequest(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getType()).isEqualTo("toll");
        assertThat(result.getVehicleId()).isNull();
    }

    @Test
    void createExpenseRequest_withInvalidBranchId_shouldThrowException() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("fuel");
        request.setAmount(new BigDecimal("500000"));
        request.setBranchId(99999);

        // When & Then
        assertThatThrownBy(() -> expenseRequestService.createExpenseRequest(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    @Test
    void createExpenseRequest_withInvalidVehicleId_shouldThrowException() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("fuel");
        request.setVehicleId(99999);
        request.setAmount(new BigDecimal("500000"));
        request.setBranchId(testBranch.getId());

        // When & Then
        assertThatThrownBy(() -> expenseRequestService.createExpenseRequest(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy xe");
    }

    @Test
    void getByDriverId_shouldReturnDriverExpenses() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("fuel");
        request.setVehicleId(testVehicle.getId());
        request.setAmount(new BigDecimal("500000"));
        request.setBranchId(testBranch.getId());
        request.setRequesterUserId(testUser.getId());
        expenseRequestService.createExpenseRequest(request);

        // When
        List<ExpenseRequestResponse> result = expenseRequestService.getByDriverId(testUser.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
        assertThat(result.get(0).getRequesterUserId()).isEqualTo(testUser.getId());
    }

    @Test
    void getByDriverId_withNoExpenses_shouldReturnEmptyList() {
        // When
        List<ExpenseRequestResponse> result = expenseRequestService.getByDriverId(testUser.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    @Test
    void getPendingRequests_shouldReturnPendingRequests() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("fuel");
        request.setVehicleId(testVehicle.getId());
        request.setAmount(new BigDecimal("500000"));
        request.setBranchId(testBranch.getId());
        request.setRequesterUserId(testUser.getId());
        expenseRequestService.createExpenseRequest(request);

        // When
        List<ExpenseRequestResponse> result = expenseRequestService.getPendingRequests(testBranch.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
        assertThat(result.get(0).getStatus()).isEqualTo("PENDING");
    }

    @Test
    void getPendingRequests_withNullBranchId_shouldReturnAllPending() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("fuel");
        request.setVehicleId(testVehicle.getId());
        request.setAmount(new BigDecimal("500000"));
        request.setBranchId(testBranch.getId());
        request.setRequesterUserId(testUser.getId());
        expenseRequestService.createExpenseRequest(request);

        // When
        List<ExpenseRequestResponse> result = expenseRequestService.getPendingRequests(null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void approveRequest_shouldApproveRequest() {
        // Given
        CreateExpenseRequest createRequest = new CreateExpenseRequest();
        createRequest.setType("fuel");
        createRequest.setVehicleId(testVehicle.getId());
        createRequest.setAmount(new BigDecimal("500000"));
        createRequest.setBranchId(testBranch.getId());
        createRequest.setRequesterUserId(testUser.getId());
        ExpenseRequestResponse created = expenseRequestService.createExpenseRequest(createRequest);

        // When
        ExpenseRequestResponse result = expenseRequestService.approveRequest(created.getId(), "Approved");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("APPROVED");
        assertThat(result.getNote()).contains("Duyệt: Approved");
    }

    @Test
    void approveRequest_withoutNote_shouldApproveRequest() {
        // Given
        CreateExpenseRequest createRequest = new CreateExpenseRequest();
        createRequest.setType("fuel");
        createRequest.setVehicleId(testVehicle.getId());
        createRequest.setAmount(new BigDecimal("500000"));
        createRequest.setBranchId(testBranch.getId());
        createRequest.setRequesterUserId(testUser.getId());
        ExpenseRequestResponse created = expenseRequestService.createExpenseRequest(createRequest);

        // When
        ExpenseRequestResponse result = expenseRequestService.approveRequest(created.getId(), null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("APPROVED");
    }

    @Test
    void approveRequest_withInvalidId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> expenseRequestService.approveRequest(99999, "Note"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy yêu cầu chi phí");
    }

    @Test
    void rejectRequest_shouldRejectRequest() {
        // Given
        CreateExpenseRequest createRequest = new CreateExpenseRequest();
        createRequest.setType("fuel");
        createRequest.setVehicleId(testVehicle.getId());
        createRequest.setAmount(new BigDecimal("500000"));
        createRequest.setBranchId(testBranch.getId());
        createRequest.setRequesterUserId(testUser.getId());
        ExpenseRequestResponse created = expenseRequestService.createExpenseRequest(createRequest);

        // When
        ExpenseRequestResponse result = expenseRequestService.rejectRequest(created.getId(), "Rejected");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("REJECTED");
        assertThat(result.getNote()).contains("Từ chối: Rejected");
    }

    @Test
    void rejectRequest_withInvalidId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> expenseRequestService.rejectRequest(99999, "Note"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy yêu cầu chi phí");
    }

    @Test
    void getAllRequests_withStatusFilter_shouldReturnFilteredRequests() {
        // Given
        CreateExpenseRequest request1 = new CreateExpenseRequest();
        request1.setType("fuel");
        request1.setVehicleId(testVehicle.getId());
        request1.setAmount(new BigDecimal("500000"));
        request1.setBranchId(testBranch.getId());
        request1.setRequesterUserId(testUser.getId());
        ExpenseRequestResponse created1 = expenseRequestService.createExpenseRequest(request1);
        expenseRequestService.approveRequest(created1.getId(), "Approved");

        CreateExpenseRequest request2 = new CreateExpenseRequest();
        request2.setType("toll");
        request2.setAmount(new BigDecimal("100000"));
        request2.setBranchId(testBranch.getId());
        request2.setRequesterUserId(testUser.getId());
        expenseRequestService.createExpenseRequest(request2);

        // When
        List<ExpenseRequestResponse> approved = expenseRequestService.getAllRequests("APPROVED", testBranch.getId());
        List<ExpenseRequestResponse> pending = expenseRequestService.getAllRequests("PENDING", testBranch.getId());

        // Then
        assertThat(approved).isNotNull();
        assertThat(approved.size()).isGreaterThanOrEqualTo(1);
        assertThat(approved.get(0).getStatus()).isEqualTo("APPROVED");

        assertThat(pending).isNotNull();
        assertThat(pending.size()).isGreaterThanOrEqualTo(1);
        assertThat(pending.get(0).getStatus()).isEqualTo("PENDING");
    }

    @Test
    void getAllRequests_withNullStatus_shouldReturnAllRequests() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("fuel");
        request.setVehicleId(testVehicle.getId());
        request.setAmount(new BigDecimal("500000"));
        request.setBranchId(testBranch.getId());
        request.setRequesterUserId(testUser.getId());
        expenseRequestService.createExpenseRequest(request);

        // When
        List<ExpenseRequestResponse> result = expenseRequestService.getAllRequests(null, testBranch.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void createExpenseRequest_shouldSetStatusToPending() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("fuel");
        request.setAmount(new BigDecimal("500000"));
        request.setBranchId(testBranch.getId());
        request.setRequesterUserId(testUser.getId());

        // When
        ExpenseRequestResponse result = expenseRequestService.createExpenseRequest(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("PENDING");
        
        // Verify in database
        ExpenseRequests entity = expenseRequestRepository.findById(result.getId()).orElseThrow();
        assertThat(entity.getStatus()).isEqualTo(ExpenseRequestStatus.PENDING);
    }

    @Test
    void approveRequest_shouldUpdateNote() {
        // Given
        CreateExpenseRequest createRequest = new CreateExpenseRequest();
        createRequest.setType("fuel");
        createRequest.setAmount(new BigDecimal("500000"));
        createRequest.setBranchId(testBranch.getId());
        createRequest.setRequesterUserId(testUser.getId());
        createRequest.setNote("Original note");
        ExpenseRequestResponse created = expenseRequestService.createExpenseRequest(createRequest);

        // When
        ExpenseRequestResponse result = expenseRequestService.approveRequest(created.getId(), "Approval note");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getNote()).contains("Original note");
        assertThat(result.getNote()).contains("Duyệt: Approval note");
    }
}

