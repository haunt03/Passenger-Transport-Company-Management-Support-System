package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.response.GraphHopper.DistanceResult;
import org.example.ptcmssbackend.enums.HireTypeCode;
import org.example.ptcmssbackend.service.GraphHopperService;
import org.example.ptcmssbackend.service.SystemSettingService;
import org.example.ptcmssbackend.service.TripOccupancyService;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class TripOccupancyServiceImpl implements TripOccupancyService {

    private static final String AVG_SPEED_KEY = "AVG_VEHICLE_SPEED_KMPH";
    private static final int DEFAULT_AVG_SPEED_KMPH = 60;
    private static final Duration BUFFER_AFTER_ARRIVAL = Duration.ofMinutes(10);

    private final SystemSettingService systemSettingService;
    private final GraphHopperService graphHopperService;

    @Override
    public int getAverageSpeedKmph() {
        try {
            var setting = systemSettingService.getByKey(AVG_SPEED_KEY);
            if (setting != null && setting.getSettingValue() != null && !setting.getSettingValue().isBlank()) {
                int v = Integer.parseInt(setting.getSettingValue().trim());
                return v > 0 ? v : DEFAULT_AVG_SPEED_KMPH;
            }
        } catch (Exception e) {
            log.warn("[TripOccupancy] Cannot read {}, using default {} km/h: {}", AVG_SPEED_KEY, DEFAULT_AVG_SPEED_KMPH, e.getMessage());
        }
        return DEFAULT_AVG_SPEED_KMPH;
    }

    @Override
    public Instant computeBusyUntil(
            String hireTypeCode,
            Instant startTime,
            Instant endTime,
            Double distanceKm,
            String startLocation,
            String endLocation
    ) {
        if (startTime == null) return null;

        final HireTypeCode type = parseHireType(hireTypeCode);
        final double km = resolveDistanceKm(distanceKm, startLocation, endLocation);
        final Duration travel = km > 0 ? estimateTravelDuration(km) : Duration.ZERO;

        // ONE_WAY: busy until max(userEndTime, start + travel) + buffer
        if (type == HireTypeCode.ONE_WAY || type == HireTypeCode.FIXED_ROUTE) {
            Instant base = startTime.plus(travel);
            Instant chosen = (endTime != null && endTime.isAfter(base)) ? endTime : base;
            return chosen.plus(BUFFER_AFTER_ARRIVAL);
        }

        // ROUND_TRIP: endTime được hiểu là "bắt đầu về" (return start)
        if (type == HireTypeCode.ROUND_TRIP) {
            if (endTime != null) {
                return endTime.plus(travel).plus(BUFFER_AFTER_ARRIVAL);
            }
            // Fallback: nếu thiếu endTime, giả định đi-về ngay (2 chặng)
            return startTime.plus(travel.multipliedBy(2)).plus(BUFFER_AFTER_ARRIVAL);
        }

        // DAILY/MULTI_DAY: đặt theo ngày -> xe bận đến đầu ngày kế tiếp (sau ngày kết thúc) + buffer
        if (type == HireTypeCode.DAILY || type == HireTypeCode.MULTI_DAY) {
            Instant effectiveEnd = endTime != null ? endTime : startTime;
            ZonedDateTime zEnd = effectiveEnd.atZone(ZoneId.systemDefault());
            Instant nextDayStart = zEnd.toLocalDate().plusDays(1).atStartOfDay(zEnd.getZone()).toInstant();
            return nextDayStart.plus(BUFFER_AFTER_ARRIVAL);
        }

        // default: hành vi như ONE_WAY
        Instant base = startTime.plus(travel);
        Instant chosen = (endTime != null && endTime.isAfter(base)) ? endTime : base;
        return chosen.plus(BUFFER_AFTER_ARRIVAL);
    }

    private HireTypeCode parseHireType(String hireTypeCode) {
        if (hireTypeCode == null || hireTypeCode.isBlank()) return HireTypeCode.ONE_WAY;
        try {
            return HireTypeCode.valueOf(hireTypeCode.trim().toUpperCase());
        } catch (Exception ignore) {
            return HireTypeCode.ONE_WAY;
        }
    }

    private double resolveDistanceKm(Double distanceKm, String from, String to) {
        if (distanceKm != null && distanceKm > 0) return distanceKm;
        if (from == null || from.isBlank() || to == null || to.isBlank()) return 0;
        try {
            DistanceResult result = graphHopperService.calculateDistance(from, to);
            if (result != null && result.getDistanceKm() != null) {
                return result.getDistanceKm();
            }
        } catch (Exception e) {
            log.warn("[TripOccupancy] Cannot calculate distance via GraphHopper: {}", e.getMessage());
        }
        return 0;
    }

    private Duration estimateTravelDuration(double distanceKm) {
        int speed = getAverageSpeedKmph();
        // hours = km / kmph
        double hours = distanceKm / Math.max(1, speed);
        long seconds = Math.max(0, (long) Math.ceil(hours * 3600.0));
        return Duration.ofSeconds(seconds);
    }
}


