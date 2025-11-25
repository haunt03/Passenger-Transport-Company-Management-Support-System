package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, Integer> {
    boolean existsBySettingKey(String settingKey);

    Optional<SystemSetting> findBySettingKeyAndStatus(String settingKey,
                                                      org.example.ptcmssbackend.enums.SettingStatus status);

    List<SystemSetting> findByCategoryAndStatus(String category,
                                                org.example.ptcmssbackend.enums.SettingStatus status);
}
