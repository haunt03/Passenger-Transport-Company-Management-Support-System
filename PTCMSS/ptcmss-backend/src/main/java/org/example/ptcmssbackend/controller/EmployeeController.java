package org.example.ptcmssbackend.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.Employee.CreateEmployeeRequest;
import org.example.ptcmssbackend.dto.request.Employee.UpdateEmployeeRequest;
import org.example.ptcmssbackend.dto.response.Employee.EmployeeResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.mapper.EmployeeMapper;
import org.example.ptcmssbackend.service.EmployeeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@Tag(name = "Employee Management", description = "API quản lý thông tin nhân viên (Employees)")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeMapper employeeMapper;

    // ----------- API: Lấy tất cả nhân viên -----------
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Lấy danh sách tất cả nhân viên")
    @GetMapping
    public ResponseData<List<EmployeeResponse>> getAllEmployees() {
        List<EmployeeResponse> result = employeeService.findAll()
                .stream()
                .map(employeeMapper::toDTO)
                .collect(Collectors.toList());
        return new ResponseData<>(
                HttpStatus.OK.value(),
                "Get all employees successfully",
                result
        );
    }

    // ----------- API: Lọc nhân viên theo role -----------
    @Operation(
            summary = "Lọc nhân viên theo vai trò",
            description = "Trả về danh sách nhân viên có role cụ thể, ví dụ: 'Manager', 'Driver', 'Admin'..."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công"),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy nhân viên cho vai trò này")
    })
    @GetMapping("/role/{roleName}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<EmployeeResponse>> getEmployeesByRole(
            @Parameter(description = "Tên vai trò (roleName), ví dụ: Manager, Driver, Admin", example = "Manager")
            @PathVariable String roleName) {

        List<Employees> employees = employeeService.findByRoleName(roleName);
        if (employees.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<EmployeeResponse> result = employees.stream()
                .map(employeeMapper::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ----------- API: Lọc nhân viên theo chi nhánh -----------
    @Operation(
            summary = "Lọc nhân viên theo chi nhánh",
            description = "Trả về danh sách nhân viên thuộc chi nhánh cụ thể"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lấy danh sách thành công"),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy nhân viên cho chi nhánh này")
    })
    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<List<EmployeeResponse>> getEmployeesByBranch(
            @Parameter(description = "ID chi nhánh", example = "1")
            @PathVariable Integer branchId) {

        List<Employees> employees = employeeService.findByBranchId(branchId);
        List<EmployeeResponse> result = employees.stream()
                .map(employeeMapper::toDTO)
                .collect(Collectors.toList());

        return new ResponseData<>(
                HttpStatus.OK.value(),
                "Get employees by branch successfully",
                result
        );
    }

    // ----------- API: Lấy chi tiết nhân viên -----------
    @Operation(summary = "Lấy thông tin nhân viên theo ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<EmployeeResponse> getEmployeeById(@PathVariable Integer id) {
        Employees employee = employeeService.findById(id);
        if (employee == null) {
            throw new RuntimeException("Employee not found with id: " + id);
        }
        return new ResponseData<>(
                HttpStatus.OK.value(),
                "Get employee successfully",
                employeeMapper.toDTO(employee)
        );
    }

    // ----------- API: Lấy nhân viên theo User ID -----------
    @Operation(summary = "Lấy thông tin nhân viên theo User ID")
    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseData<EmployeeResponse> getEmployeeByUserId(@PathVariable Integer userId) {
        Employees employee = employeeService.findByUserId(userId);
        if (employee == null) {
            throw new RuntimeException("Employee not found for user id: " + userId);
        }
        return new ResponseData<>(
                HttpStatus.OK.value(),
                "Get employee by user id successfully",
                employeeMapper.toDTO(employee)
        );
    }

    // ----------- API: Tạo nhân viên mới (với User ID có sẵn) -----------
    @Operation(
            summary = "Tạo mới nhân viên từ User có sẵn",
            description = "Tạo nhân viên cho User đã tồn tại trong hệ thống"
    )
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<EmployeeResponse> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) {
        try {
            System.out.println("Controller received request: " + request);
            Employees saved = employeeService.createEmployee(request);
            return new ResponseData<>(
                    HttpStatus.OK.value(),
                    "Create employee successfully",
                    employeeMapper.toDTO(saved)
            );
        } catch (Exception e) {
            System.err.println("Error creating employee: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to create employee: " + e.getMessage());
        }
    }

    // ----------- API: Tạo nhân viên mới (kèm tạo User) -----------
    @Operation(
            summary = "Tạo mới nhân viên kèm tài khoản User",
            description = "Tạo cả User và Employee trong một lần. Phù hợp cho tuyển dụng nhân viên mới."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tạo thành công"),
            @ApiResponse(responseCode = "400", description = "Dữ liệu không hợp lệ hoặc username/email/phone đã tồn tại")
    })
    @PostMapping("/create-with-user")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<EmployeeResponse> createEmployeeWithUser(
            @Valid @RequestBody org.example.ptcmssbackend.dto.request.Employee.CreateEmployeeWithUserRequest request) {
        try {
            System.out.println("Controller received create-with-user request: " + request.getUsername());
            Employees saved = employeeService.createEmployeeWithUser(request);
            return new ResponseData<>(
                    HttpStatus.OK.value(),
                    "Create employee with user successfully",
                    employeeMapper.toDTO(saved)
            );
        } catch (RuntimeException e) {
            // Re-throw RuntimeException để GlobalExceptionHandler xử lý
            throw e;
        } catch (Exception e) {
            System.err.println("Error creating employee with user: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Không thể tạo nhân viên: " + (e.getMessage() != null ? e.getMessage() : "Đã xảy ra lỗi không xác định"));
        }
    }

    // ----------- API: Cập nhật nhân viên -----------
    @Operation(summary = "Cập nhật thông tin nhân viên")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseData<EmployeeResponse> updateEmployee(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateEmployeeRequest request) {
        try {
            System.out.println("Controller received update request for ID: " + id);
            Employees updated = employeeService.updateEmployee(id, request);
            return new ResponseData<>(
                    HttpStatus.OK.value(),
                    "Update employee successfully",
                    employeeMapper.toDTO(updated)
            );
        } catch (Exception e) {
            System.err.println("Error updating employee: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update employee: " + e.getMessage());
        }
    }

    // ----------- API: Vô hiệu hóa/Kích hoạt nhân viên -----------
    // Sử dụng PUT /{id} với status INACTIVE/ACTIVE thay vì DELETE
}