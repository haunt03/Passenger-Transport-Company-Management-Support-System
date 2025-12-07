package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BranchesRepository extends JpaRepository<Branches, Integer> {
    List<Branches> findByStatus(BranchStatus status);
    
    boolean existsByBranchNameIgnoreCase(String branchName);
    
    boolean existsByBranchNameIgnoreCaseAndIdNot(String branchName, Integer id);
    
    // Tìm chi nhánh theo manager employeeId
    Branches findByManager_EmployeeId(Integer employeeId);
}
