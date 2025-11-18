package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.HireTypes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HireTypesRepository extends JpaRepository<HireTypes, Integer> {

    // Lấy danh sách loại thuê đang active
    List<HireTypes> findByIsActiveTrue();

    // Tìm theo code
    HireTypes findByCode(String code);
}
