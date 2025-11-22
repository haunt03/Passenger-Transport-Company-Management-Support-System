package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsersRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByUsername(String username);
    Optional<Users> findByEmail(String email);
    boolean existsByUsername(String username);
    //    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    List<Users> findByRole_Id(Integer roleId);
    List<Users> findByStatus(UserStatus status);

    Optional<Users> findByVerificationToken(String token);




    @Query("""
        SELECT u 
        FROM Users u 
        JOIN Employees e ON e.user.id = u.id
        WHERE e.branch.id = :branchId
    """)
    List<Users> findUsersByBranchId(Integer branchId);

    @Query("""
        SELECT u FROM Users u
        JOIN Employees e ON e.user.id = u.id
        WHERE
            (:keyword IS NULL 
                OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(u.phone) LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
            AND (:roleId IS NULL OR e.role.id = :roleId)
            AND (:branchId IS NULL OR e.branch.id = :branchId)
            AND (:status IS NULL OR u.status = :status)
        ORDER BY u.fullName ASC
    """)
    List<Users> searchUsers(
            String keyword,
            Integer roleId,
            Integer branchId,
            UserStatus status
    );

    boolean existsByEmailIgnoreCase(String email);


}