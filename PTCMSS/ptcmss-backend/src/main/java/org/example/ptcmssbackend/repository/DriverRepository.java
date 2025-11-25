package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.dto.response.Driver.DriverResponse;
import org.example.ptcmssbackend.entity.Drivers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Drivers, Integer> {
    Optional<Drivers> findByEmployee_EmployeeId(Integer employeeId);
    boolean existsByLicenseNumber(String licenseNumber);


    @Query("SELECT d FROM Drivers d WHERE d.employee.branch.id = :branchId AND d.status = 'ACTIVE'")
    List<Drivers> findAvailableDrivers(Integer branchId);


    // Lấy tất cả driver của 1 chi nhánh
    @Query("SELECT d FROM Drivers d WHERE d.branch.id = :branchId")
    List<Drivers> findByBranchId(Integer branchId);

    @Query("SELECT new org.example.ptcmssbackend.dto.response.Driver.DriverResponse(d) FROM Drivers d WHERE d.branch.id = :branchId")
    List<DriverResponse> findAllByBranchId(Integer branchId);

    // Lấy tất cả driver của 1 chi nhánh

}