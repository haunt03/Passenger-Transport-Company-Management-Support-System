
package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.entity.Employees;

import java.util.List;

public interface EmployeeService {
    List<Employees> findAll();

    Employees findById(Integer id);

    Employees save(Employees employee);

    void delete(Employees employee);

    List<Employees> findByRoleName(String roleName);

}

