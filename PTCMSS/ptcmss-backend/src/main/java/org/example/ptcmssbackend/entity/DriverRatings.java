package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * DriverRatings - Đánh giá tài xế sau mỗi chuyến
 * 
 * Tiêu chí đánh giá (1-5 sao):
 * - Punctuality: Đúng giờ
 * - Attitude: Thái độ
 * - Safety: An toàn
 * - Compliance: Tuân thủ quy trình
 */
@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "driver_ratings")
public class DriverRatings {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ratingId")
    private Integer id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tripId", nullable = false)
    private Trips trip;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driverId", nullable = false)
    private Drivers driver;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customerId")
    private Customers customer;
    
    // Các tiêu chí đánh giá (1-5)
    @Column(name = "punctualityRating")
    private Integer punctualityRating; // Đúng giờ
    
    @Column(name = "attitudeRating")
    private Integer attitudeRating; // Thái độ
    
    @Column(name = "safetyRating")
    private Integer safetyRating; // An toàn
    
    @Column(name = "complianceRating")
    private Integer complianceRating; // Tuân thủ quy trình

    @Column(name = "overallRating", precision = 3, scale = 2)
    private BigDecimal overallRating;
    
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ratedBy")
    private Users ratedBy;
    
    @CreationTimestamp
    @Column(name = "ratedAt")
    private Instant ratedAt;
}
