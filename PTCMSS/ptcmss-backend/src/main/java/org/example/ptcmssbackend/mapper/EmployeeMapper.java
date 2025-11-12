package org.example.ptcmssbackend.mapper;

import org.example.ptcmssbackend.dto.EmployeeDTO;
import org.example.ptcmssbackend.entity.Employees;
import org.springframework.stereotype.Component;

@Component
public class EmployeeMapper {

    public EmployeeDTO toDTO(Employees employee) {
        if (employee == null) return null;

        return EmployeeDTO.builder()
                .id(employee.getId())
                .userId(employee.getUser() != null ? employee.getUser().getId() : null)
                .userFullName(employee.getUser() != null ? employee.getUser().getFullName() : null)
                .branchId(employee.getBranch() != null ? employee.getBranch().getId() : null)
                .branchName(employee.getBranch() != null ? employee.getBranch().getBranchName() : null)
                .roleId(employee.getRole() != null ? employee.getRole().getId() : null)
                .roleName(employee.getRole() != null ? employee.getRole().getRoleName() : null)
                .status(employee.getStatus() != null ? employee.getStatus().name() : null)
                .build();
    }

    public Employees toEntity(EmployeeDTO dto) {
        if (dto == null) return null;

        Employees employee = new Employees();
        employee.setId(dto.getId());
        // phần này có thể được xử lý ở service khi gán entity user, branch, role
        return employee;
    }
}