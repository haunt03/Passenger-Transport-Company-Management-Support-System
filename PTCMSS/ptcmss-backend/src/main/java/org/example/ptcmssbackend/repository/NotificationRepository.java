package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Notifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notifications, Integer> {
    
    // Find notifications by user ID, ordered by creation date desc
    List<Notifications> findByUser_IdOrderByCreatedAtDesc(Integer userId);
    
    // Find notifications by user ID with pagination
    Page<Notifications> findByUser_IdOrderByCreatedAtDesc(Integer userId, Pageable pageable);
    
    // Count unread notifications for user
    long countByUser_IdAndIsReadFalse(Integer userId);
}