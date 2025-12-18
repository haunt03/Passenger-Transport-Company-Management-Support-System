package org.example.ptcmssbackend.service;

import java.time.Instant;

/**
 * Tính khoảng thời gian xe/tài xế bị chiếm dụng dựa trên distance + vận tốc trung bình + buffer.
 */
public interface TripOccupancyService {

    /**
     * @return vận tốc trung bình (km/h), fallback mặc định nếu chưa cấu hình.
     */
    int getAverageSpeedKmph();

    /**
     * Tính thời điểm "rảnh" (busy-until) cho 1 trip dựa trên hireType.
     *
     * @param hireTypeCode ONE_WAY / ROUND_TRIP / DAILY / MULTI_DAY / FIXED_ROUTE
     * @param startTime thời gian bắt đầu (đi)
     * @param endTime semantics:
     *                - ONE_WAY: có thể là endTime do user nhập (nếu có)
     *                - ROUND_TRIP: được hiểu là thời gian "bắt đầu về" (return start)
     *                - MULTI_DAY: có thể là endTime do user nhập (nếu có)
     * @param distanceKm khoảng cách (km). Nếu null/<=0 có thể fallback theo logic implement.
     * @param startLocation điểm đi (để fallback tính distance nếu cần)
     * @param endLocation điểm đến (để fallback tính distance nếu cần)
     */
    Instant computeBusyUntil(
            String hireTypeCode,
            Instant startTime,
            Instant endTime,
            Double distanceKm,
            String startLocation,
            String endLocation
    );
}


