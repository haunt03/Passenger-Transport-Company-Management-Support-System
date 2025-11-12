package org.example.ptcmssbackend.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.EmployeeDTO;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.mapper.EmployeeMapper;
import org.example.ptcmssbackend.service.EmployeeService;
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
    public ResponseEntity<List<EmployeeDTO>> getAllEmployees() {
        List<EmployeeDTO> result = employeeService.findAll()
                .stream()
                .map(employeeMapper::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
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
    public ResponseEntity<List<EmployeeDTO>> getEmployeesByRole(
            @Parameter(description = "Tên vai trò (roleName), ví dụ: Manager, Driver, Admin", example = "Manager")
            @PathVariable String roleName) {

        List<Employees> employees = employeeService.findByRoleName(roleName);
        if (employees.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<EmployeeDTO> result = employees.stream()
                .map(employeeMapper::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ----------- API: Lấy chi tiết nhân viên -----------
    @Operation(summary = "Lấy thông tin nhân viên theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDTO> getEmployeeById(@PathVariable Integer id) {
        Employees employee = employeeService.findById(id);
        if (employee == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(employeeMapper.toDTO(employee));
    }

    // ----------- API: Tạo hoặc cập nhật nhân viên -----------
    @Operation(summary = "Tạo mới hoặc cập nhật nhân viên")
    @PostMapping
    public ResponseEntity<EmployeeDTO> createOrUpdateEmployee(@RequestBody Employees employee) {
        Employees saved = employeeService.save(employee);
        return ResponseEntity.ok(employeeMapper.toDTO(saved));
    }

    // ----------- API: Xóa nhân viên -----------
    @Operation(summary = "Xóa nhân viên theo ID")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Integer id) {
        Employees employee = employeeService.findById(id);
        if (employee == null) {
            return ResponseEntity.notFound().build();
        }
        employeeService.delete(employee);
        return ResponseEntity.noContent().build();
    }
}