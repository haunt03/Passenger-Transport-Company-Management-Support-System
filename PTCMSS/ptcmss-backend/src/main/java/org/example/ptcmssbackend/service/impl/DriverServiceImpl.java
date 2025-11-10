package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Driver.CreateDriverRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverDayOffRequest;
import org.example.ptcmssbackend.dto.request.Driver.DriverProfileUpdateRequest;
import org.example.ptcmssbackend.dto.request.Driver.ReportIncidentRequest;
import org.example.ptcmssbackend.dto.response.*;
import org.example.ptcmssbackend.entity.DriverDayOff;
import org.example.ptcmssbackend.entity.Drivers;
import org.example.ptcmssbackend.entity.TripIncidents;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.DriverService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "DRIVER_SERVICE")
@Transactional
public class DriverServiceImpl implements DriverService {


    private final TripDriverRepository tripDriverRepository;


    @Override
    public DriverDashboardResponse getDashboard(Integer driverId) {
        log.info("[DriverDashboard] Fetching dashboard for driver {}", driverId);
        var driverTrips = tripDriverRepository.findAllByDriverId(driverId);
        return driverTrips.stream()
                .filter(td -> td.getTrip().getStatus() == TripStatus.SCHEDULED
                        || td.getTrip().getStatus() == TripStatus.ONGOING)
                .findFirst()
                .map(td -> new DriverDashboardResponse(
                        td.getTrip().getId(),
                        td.getTrip().getStartLocation(),
                        td.getTrip().getEndLocation(),
                        td.getTrip().getStartTime(),
                        td.getTrip().getEndTime(),
                        td.getTrip().getStatus()))
                .orElse(null);
    }

    @Override
    public List<DriverScheduleResponse> getSchedule(Integer driverId) {
        log.info("[DriverSchedule] Loading schedule for driver {}", driverId);
        return tripDriverRepository.findAllByDriverId(driverId).stream()
                .map(td -> new DriverScheduleResponse(
                        td.getTrip().getId(),
                        td.getTrip().getStartLocation(),
                        td.getTrip().getEndLocation(),
                        td.getTrip().getStartTime(),
                        td.getTrip().getStatus()))
                .toList();
    }


}
