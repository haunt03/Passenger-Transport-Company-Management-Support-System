package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.service.EmployeeService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;

    @Override
    public List<Employees> findAll() {
        return employeeRepository.findAll();
    }

    @Override
    public Employees findById(Integer id) {
        Optional<Employees> employeeOpt = employeeRepository.findById(id);
        return employeeOpt.orElse(null);
    }

    @Override
    public Employees save(Employees employee) {
        return employeeRepository.save(employee);
    }

    @Override
    public void delete(Employees employee) {
        employeeRepository.delete(employee);
    }

    @Override
    public List<Employees> findByRoleName(String roleName) {
        return employeeRepository.findByRoleName(roleName);
    }

}