package org.example.ptcmssbackend.mapper;

import org.example.ptcmssbackend.dto.response.Employee.EmployeeResponse;
import org.example.ptcmssbackend.entity.Employees;
import org.springframework.stereotype.Component;

@Component
public class EmployeeMapper {

    public EmployeeResponse toDTO(Employees employee) {
        if (employee == null) return null;

        return EmployeeResponse.builder()
                .id(employee.getEmployeeId())
                .userId(employee.getUser() != null ? employee.getUser().getId() : null)
                .userFullName(employee.getUser() != null ? employee.getUser().getFullName() : null)
                .userEmail(employee.getUser() != null ? employee.getUser().getEmail() : null)
                .userPhone(employee.getUser() != null ? employee.getUser().getPhone() : null)
                .branchId(employee.getBranch() != null ? employee.getBranch().getId() : null)
                .branchName(employee.getBranch() != null ? employee.getBranch().getBranchName() : null)
                .roleId(employee.getRole() != null ? employee.getRole().getId() : null)
                .roleName(employee.getRole() != null ? employee.getRole().getRoleName() : null)
                .status(employee.getStatus() != null ? employee.getStatus().name() : null)
                .build();
    }

    public Employees toEntity(EmployeeResponse dto) {
        if (dto == null) return null;

        Employees employee = new Employees();
        employee.setEmployeeId(dto.getId());
        // phần này có thể được xử lý ở service khi gán entity user, branch, role
        return employee;
    }
}