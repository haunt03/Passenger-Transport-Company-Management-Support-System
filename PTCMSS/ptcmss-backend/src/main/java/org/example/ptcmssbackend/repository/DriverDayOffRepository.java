package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.DriverDayOff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DriverDayOffRepository extends JpaRepository<DriverDayOff, Integer> {
    List<DriverDayOff> findByDriver_Id(Integer driverId);
}