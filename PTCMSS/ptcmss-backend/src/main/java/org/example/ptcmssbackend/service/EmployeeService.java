
package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.entity.Employees;

import java.util.List;

public interface EmployeeService {
    List<Employees> findAll();

    Employees findById(Integer id);

    Employees save(Employees employee);

    void delete(Employees employee);

    List<Employees> findByRoleName(String roleName);

    List<Employees> findByBranchId(Integer branchId);

    Employees createEmployee(org.example.ptcmssbackend.dto.request.Employee.CreateEmployeeRequest request);

    Employees updateEmployee(Integer id, org.example.ptcmssbackend.dto.request.Employee.UpdateEmployeeRequest request);

    Employees createEmployeeWithUser(org.example.ptcmssbackend.dto.request.Employee.CreateEmployeeWithUserRequest request);

    Employees findByUserId(Integer userId);

    /**
     * Lấy danh sách managers chưa được gán cho chi nhánh nào
     * @param excludeBranchId ID chi nhánh cần loại trừ (dùng khi update chi nhánh)
     * @return Danh sách managers available
     */
    List<Employees> findAvailableManagers(Integer excludeBranchId);
}


