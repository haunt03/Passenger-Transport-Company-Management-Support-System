package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Customers;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customers, Integer> {

    // Tìm customer theo phone (unique identifier)
    Optional<Customers> findByPhone(String phone);

    // Tìm customer theo email
    Optional<Customers> findByEmail(String email);

    // Tìm customer theo phone hoặc email
    @Query("SELECT c FROM Customers c WHERE c.phone = :phone OR c.email = :email")
    Optional<Customers> findByPhoneOrEmail(@Param("phone") String phone, @Param("email") String email);

    // Tìm customer theo phone (không phân biệt hoa thường)
    @Query("SELECT c FROM Customers c WHERE LOWER(c.phone) = LOWER(:phone)")
    Optional<Customers> findByPhoneIgnoreCase(@Param("phone") String phone);

    // Danh sách customer với filter
    @Query("SELECT c FROM Customers c LEFT JOIN c.createdBy e LEFT JOIN e.branch b WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR " +
            "LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(c.phone) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(c.email) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
            "(:branchId IS NULL OR b.id = :branchId) AND " +
            "(:fromDate IS NULL OR c.createdAt >= :fromDate) AND " +
            "(:toDate IS NULL OR c.createdAt <= :toDate)")
    Page<Customers> findWithFilters(
            @Param("keyword") String keyword,
            @Param("branchId") Integer branchId,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable);
}
