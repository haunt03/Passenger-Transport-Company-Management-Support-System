package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.ExpenseRequests;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRequestRepository extends JpaRepository<ExpenseRequests, Integer> {
    
    // Tìm tất cả expense requests theo status
    List<ExpenseRequests> findByStatus(ExpenseRequestStatus status);
}
