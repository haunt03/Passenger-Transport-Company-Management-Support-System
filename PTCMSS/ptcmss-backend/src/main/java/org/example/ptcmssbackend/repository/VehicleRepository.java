package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicles, Integer> {

    @Query("SELECT v FROM Vehicles v JOIN FETCH v.branch JOIN FETCH v.category WHERE LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :licensePlate, '%'))")
    List<Vehicles> findByLicensePlateContainingIgnoreCase(@Param("licensePlate") String licensePlate);

    Page<Vehicles> findByLicensePlateContainingIgnoreCase(String licensePlate, Pageable pageable);

    List<Vehicles> findByStatus(VehicleStatus status);

    @Query("SELECT v FROM Vehicles v JOIN FETCH v.branch JOIN FETCH v.category WHERE (:categoryId IS NULL OR v.category.id = :categoryId) " +
            "AND (:branchId IS NULL OR v.branch.id = :branchId) " +
            "AND (:status IS NULL OR v.status = :status)")
    List<Vehicles> filterVehicles(@Param("categoryId") Integer categoryId, @Param("branchId") Integer branchId, @Param("status") VehicleStatus status);

    @Query("SELECT v FROM Vehicles v WHERE (:categoryId IS NULL OR v.category.id = :categoryId) " +
            "AND (:branchId IS NULL OR v.branch.id = :branchId) " +
            "AND (:status IS NULL OR v.status = :status) " +
            "AND (:licensePlate IS NULL OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :licensePlate, '%')))")
    Page<Vehicles> filterVehiclesWithPagination(
            @Param("categoryId") Integer categoryId,
            @Param("branchId") Integer branchId,
            @Param("status") VehicleStatus status,
            @Param("licensePlate") String licensePlate,
            Pageable pageable);

    @Query("SELECT v FROM Vehicles v WHERE v.branch.id = :branchId AND v.status = 'AVAILABLE'")
    List<Vehicles> findAvailableVehicles(Integer branchId);

    List<Vehicles> findByBranch_IdAndStatus(Integer branchId, VehicleStatus status);


    @Query("SELECT v FROM Vehicles v JOIN FETCH v.branch JOIN FETCH v.category WHERE v.branch.id = :branchId")
    List<Vehicles> findAllByBranchId(@Param("branchId") Integer branchId);

    boolean existsByBranch_IdAndLicensePlateIgnoreCase(Integer branchId, String licensePlate);

    @Query("SELECT v FROM Vehicles v JOIN FETCH v.branch JOIN FETCH v.category")
    List<Vehicles> findAllWithBranchAndCategory();

    @Query("SELECT COUNT(v) FROM Vehicles v WHERE v.category.id = :categoryId")
    long countByCategoryId(@Param("categoryId") Integer categoryId);

}