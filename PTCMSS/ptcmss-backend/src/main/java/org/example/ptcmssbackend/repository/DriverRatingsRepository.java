package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.DriverRatings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRatingsRepository extends JpaRepository<DriverRatings, Integer> {
    
    // Tìm rating theo trip
    @Query("SELECT dr FROM DriverRatings dr WHERE dr.trip.id = :tripId")
    Optional<DriverRatings> findByTrip_Id(Integer tripId);
    
    // Lấy tất cả ratings của driver
    List<DriverRatings> findByDriver_IdOrderByRatedAtDesc(Integer driverId);
    
    // Lấy ratings trong khoảng thời gian
    List<DriverRatings> findByDriver_IdAndRatedAtAfterOrderByRatedAtDesc(Integer driverId, Instant after);
    
    // Tính rating trung bình của driver
    @Query("SELECT AVG(dr.overallRating) FROM DriverRatings dr WHERE dr.driver.id = :driverId AND dr.ratedAt >= :since")
    BigDecimal getAverageRatingForDriver(@Param("driverId") Integer driverId, @Param("since") Instant since);
    
    // Đếm số ratings của driver
    long countByDriver_Id(Integer driverId);
    
    // Lấy ratings theo branch
    @Query("SELECT dr FROM DriverRatings dr WHERE dr.driver.branch.id = :branchId ORDER BY dr.ratedAt DESC")
    List<DriverRatings> findByBranchId(@Param("branchId") Integer branchId);
}
