package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Drivers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Drivers, Integer> {
    Optional<Drivers> findByEmployee_Id(Integer employeeId);
    boolean existsByLicenseNumber(String licenseNumber);
}
