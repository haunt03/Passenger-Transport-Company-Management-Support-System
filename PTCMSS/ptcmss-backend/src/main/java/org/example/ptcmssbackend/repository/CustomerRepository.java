package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Customers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
