package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsersRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByUsername(String username);
    boolean existsByUsername(String username);

    List<Users> findByRole_Id(Integer roleId);
    List<Users> findByStatus(UserStatus status);

    Optional<Users> findByVerificationToken(String token);


}