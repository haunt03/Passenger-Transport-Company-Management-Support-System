package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.DriverDayOff;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DriverDayOffRepository extends JpaRepository<DriverDayOff, Integer> {
    List<DriverDayOff> findByDriver_Id(Integer driverId);

    // Tìm các đơn nghỉ đã APPROVED, trùng khoảng ngày
    @Query("SELECT d FROM DriverDayOff d WHERE d.driver.id = :driverId AND d.status = :status AND d.startDate <= :date AND d.endDate >= :date")
    List<DriverDayOff> findApprovedDayOffOnDate(Integer driverId, DriverDayOffStatus status, LocalDate date);

    // Tìm tất cả đơn nghỉ theo status
    List<DriverDayOff> findByStatus(DriverDayOffStatus status);
}
