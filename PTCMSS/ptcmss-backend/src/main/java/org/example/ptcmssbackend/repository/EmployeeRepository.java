package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Employees;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employees, Integer> {

    // Override findAll để load eager tất cả relationships
    @Query("SELECT e FROM Employees e " +
            "LEFT JOIN FETCH e.user " +
            "LEFT JOIN FETCH e.branch " +
            "LEFT JOIN FETCH e.role")
    List<Employees> findAll();

    //  Tìm nhân viên theo user_id (khi có mối quan hệ 1-1 với bảng users)
    @Query("SELECT e FROM Employees e WHERE e.user.id = :userId")
    Optional<Employees> findByUserId(Integer userId);

    //  Tìm nhân viên theo user_id với JOIN FETCH
    @Query("SELECT e FROM Employees e " +
            "LEFT JOIN FETCH e.user " +
            "LEFT JOIN FETCH e.branch " +
            "LEFT JOIN FETCH e.role " +
            "WHERE e.user.id = :userId")
    Optional<Employees> findByUser_Id(Integer userId);

    //  Tìm danh sách nhân viên theo branch_id với JOIN FETCH để load eager
    @Query("SELECT e FROM Employees e " +
            "LEFT JOIN FETCH e.user " +
            "LEFT JOIN FETCH e.branch " +
            "LEFT JOIN FETCH e.role " +
            "WHERE e.branch.id = :branchId")
    List<Employees> findByBranchId(Integer branchId);

    //  Tìm danh sách nhân viên theo role_id
    @Query("SELECT e FROM Employees e WHERE e.role.id = :roleId")
    List<Employees> findByRoleId(Integer roleId);

    //  Kiểm tra xem nhân viên có thuộc về user cụ thể hay không
    boolean existsByUser_Id(Integer userId);

    //  Tìm tất cả nhân viên đang hoạt động
    List<Employees> findByStatus(String status);

    // lọc theo vai trò với JOIN FETCH
    @Query("SELECT e FROM Employees e " +
            "LEFT JOIN FETCH e.user " +
            "LEFT JOIN FETCH e.branch " +
            "LEFT JOIN FETCH e.role " +
            "WHERE e.role.roleName = :roleName")
    List<Employees> findByRoleName(String roleName);

    // Tìm employee theo ID với JOIN FETCH để load eager
    @Query("SELECT e FROM Employees e " +
            "LEFT JOIN FETCH e.user " +
            "LEFT JOIN FETCH e.branch " +
            "LEFT JOIN FETCH e.role " +
            "WHERE e.employeeId = :id")
    Optional<Employees> findByIdWithDetails(Integer id);
}