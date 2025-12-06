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
    
    // Tìm expense requests theo requester user ID
    List<ExpenseRequests> findByRequester_Id(Integer requesterId);
    
    // Tìm expense requests theo branch ID
    List<ExpenseRequests> findByBranch_Id(Integer branchId);
    
    // Tìm expense requests theo status và branch
    List<ExpenseRequests> findByStatusAndBranch_Id(ExpenseRequestStatus status, Integer branchId);
    
    // Tìm expense requests theo status và vehicle (dùng cho màn hình chi phí xe)
    List<ExpenseRequests> findByStatusAndVehicle_Id(ExpenseRequestStatus status, Integer vehicleId);
}
