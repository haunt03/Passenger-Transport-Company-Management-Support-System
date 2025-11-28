package org.example.ptcmssbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.analytics.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/**
 * Analytics Service for Module 7
 * Handles all dashboard and reporting logic
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Get Admin Dashboard data
     */
    public AdminDashboardResponse getAdminDashboard(String period) {
        log.info("Getting admin dashboard for period: {}", period);

        Map<String, LocalDateTime> dates = getPeriodDates(period);
        LocalDateTime startDate = dates.get("start");
        LocalDateTime endDate = dates.get("end");

        // Query total revenue & expense
        String financialSql = "SELECT " +
                "COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as totalRevenue, " +
                "COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as totalExpense " +
                "FROM invoices " +
                "WHERE status = 'ACTIVE' AND invoiceDate BETWEEN ? AND ?";

        Map<String, Object> financial = jdbcTemplate.queryForMap(financialSql, startDate, endDate);
        BigDecimal totalRevenue = (BigDecimal) financial.get("totalRevenue");
        BigDecimal totalExpense = (BigDecimal) financial.get("totalExpense");
        BigDecimal netProfit = totalRevenue.subtract(totalExpense);

        // Query trip stats
        String tripSql = "SELECT " +
                "COUNT(*) as totalTrips, " +
                "COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedTrips, " +
                "COUNT(CASE WHEN status = 'ONGOING' THEN 1 END) as ongoingTrips, " +
                "COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as scheduledTrips " +
                "FROM trips " +
                "WHERE startTime BETWEEN ? AND ?";

        Map<String, Object> tripStats = jdbcTemplate.queryForMap(tripSql, startDate, endDate);

        // Query fleet utilization (count vehicles assigned to active/scheduled trips)
        String fleetSql = "SELECT " +
                "COUNT(DISTINCT CASE WHEN tv.tripId IS NOT NULL AND t.status IN ('SCHEDULED', 'ASSIGNED', 'ONGOING') THEN v.vehicleId END) as inUse, "
                +
                "COUNT(DISTINCT CASE WHEN v.status = 'AVAILABLE' THEN v.vehicleId END) as available, " +
                "COUNT(DISTINCT CASE WHEN v.status = 'MAINTENANCE' THEN v.vehicleId END) as maintenance, "
                +
                "COUNT(DISTINCT v.vehicleId) as total " +
                "FROM vehicles v " +
                "LEFT JOIN trip_vehicles tv ON v.vehicleId = tv.vehicleId " +
                "LEFT JOIN trips t ON tv.tripId = t.tripId " +
                "WHERE v.status != 'INACTIVE'";

        Map<String, Object> fleetStats = jdbcTemplate.queryForMap(fleetSql);
        Long inUse = (Long) fleetStats.get("inUse");
        Long total = (Long) fleetStats.get("total");
        Double utilizationRate = total > 0 ? (inUse * 100.0 / total) : 0.0;

        // Query driver stats
        String driverSql = "SELECT " +
                "COUNT(*) as totalDrivers, " +
                "COUNT(CASE WHEN status = 'ONTRIP' THEN 1 END) as driversOnTrip, " +
                "COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as driversAvailable " +
                "FROM drivers " +
                "WHERE status != 'INACTIVE'";

        Map<String, Object> driverStats = jdbcTemplate.queryForMap(driverSql);

        return AdminDashboardResponse.builder()
                .totalRevenue(totalRevenue)
                .totalExpense(totalExpense)
                .netProfit(netProfit)
                .totalTrips(((Long) tripStats.get("totalTrips")).intValue())
                .completedTrips(((Long) tripStats.get("completedTrips")).intValue())
                .ongoingTrips(((Long) tripStats.get("ongoingTrips")).intValue())
                .scheduledTrips(((Long) tripStats.get("scheduledTrips")).intValue())
                .fleetUtilization(utilizationRate)
                .totalVehicles(((Long) fleetStats.get("total")).intValue())
                .vehiclesInUse(inUse.intValue())
                .vehiclesAvailable(((Long) fleetStats.get("available")).intValue())
                .vehiclesMaintenance(((Long) fleetStats.get("maintenance")).intValue())
                .totalDrivers(((Long) driverStats.get("totalDrivers")).intValue())
                .driversOnTrip(((Long) driverStats.get("driversOnTrip")).intValue())
                .driversAvailable(((Long) driverStats.get("driversAvailable")).intValue())
                .period(period)
                .periodStart(startDate.toString())
                .periodEnd(endDate.toString())
                .build();
    }

    /**
     * Get revenue trend for last 12 months
     */
    public List<RevenueTrendDTO> getRevenueTrend() {
        String sql = "SELECT " +
                "DATE_FORMAT(invoiceDate, '%Y-%m') as month, " +
                "SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as revenue, " +
                "SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense, " +
                "SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) - " +
                "SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as netProfit " +
                "FROM invoices " +
                "WHERE status = 'ACTIVE' AND invoiceDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) " +
                "GROUP BY DATE_FORMAT(invoiceDate, '%Y-%m') " +
                "ORDER BY month";

        return jdbcTemplate.query(sql, (rs, rowNum) -> RevenueTrendDTO.builder()
                .month(rs.getString("month"))
                .revenue(rs.getBigDecimal("revenue"))
                .expense(rs.getBigDecimal("expense"))
                .netProfit(rs.getBigDecimal("netProfit"))
                .build());
    }

    /**
     * Get branch comparison data
     */
    public List<BranchComparisonDTO> getBranchComparison(String period) {
        Map<String, LocalDateTime> dates = getPeriodDates(period);
        LocalDateTime startDate = dates.get("start");
        LocalDateTime endDate = dates.get("end");

        String sql = "SELECT " +
                "b.branchId, b.branchName, b.location, " +
                "COALESCE(SUM(CASE WHEN i.type = 'INCOME' THEN i.amount ELSE 0 END), 0) as revenue, " +
                "COALESCE(SUM(CASE WHEN i.type = 'EXPENSE' THEN i.amount ELSE 0 END), 0) as expense, " +
                "COALESCE(SUM(CASE WHEN i.type = 'INCOME' THEN i.amount ELSE 0 END), 0) - " +
                "COALESCE(SUM(CASE WHEN i.type = 'EXPENSE' THEN i.amount ELSE 0 END), 0) as netProfit, "
                +
                "COUNT(DISTINCT bk.bookingId) as totalBookings, " +
                "COUNT(DISTINCT t.tripId) as totalTrips, " +
                "COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.tripId END) as completedTrips, "
                +
                "COUNT(DISTINCT v.vehicleId) as totalVehicles, " +
                "COUNT(DISTINCT CASE WHEN tv.tripId IS NOT NULL AND t2.status IN ('SCHEDULED', 'ASSIGNED', 'ONGOING') THEN v.vehicleId END) as vehiclesInUse, "
                +
                "COUNT(DISTINCT d.driverId) as totalDrivers, " +
                "COUNT(DISTINCT CASE WHEN d.status = 'ONTRIP' THEN d.driverId END) as driversOnTrip " +
                "FROM branches b " +
                "LEFT JOIN invoices i ON b.branchId = i.branchId AND i.status = 'ACTIVE' AND i.invoiceDate BETWEEN ? AND ? "
                +
                "LEFT JOIN bookings bk ON b.branchId = bk.branchId AND bk.bookingDate BETWEEN ? AND ? "
                +
                "LEFT JOIN trips t ON bk.bookingId = t.bookingId " +
                "LEFT JOIN vehicles v ON b.branchId = v.branchId AND v.status != 'INACTIVE' " +
                "LEFT JOIN trip_vehicles tv ON v.vehicleId = tv.vehicleId " +
                "LEFT JOIN trips t2 ON tv.tripId = t2.tripId " +
                "LEFT JOIN drivers d ON b.branchId = d.branchId " +
                "WHERE b.status = 'ACTIVE' " +
                "GROUP BY b.branchId, b.branchName, b.location " +
                "ORDER BY revenue DESC";

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Integer totalVehicles = rs.getInt("totalVehicles");
            Integer vehiclesInUse = rs.getInt("vehiclesInUse");
            Double vehicleUtilRate = totalVehicles > 0 ? (vehiclesInUse * 100.0 / totalVehicles) : 0.0;

            Integer totalDrivers = rs.getInt("totalDrivers");
            Integer driversOnTrip = rs.getInt("driversOnTrip");
            Double driverUtilRate = totalDrivers > 0 ? (driversOnTrip * 100.0 / totalDrivers) : 0.0;

            return BranchComparisonDTO.builder()
                    .branchId(rs.getInt("branchId"))
                    .branchName(rs.getString("branchName"))
                    .location(rs.getString("location"))
                    .revenue(rs.getBigDecimal("revenue"))
                    .expense(rs.getBigDecimal("expense"))
                    .netProfit(rs.getBigDecimal("netProfit"))
                    .totalBookings(rs.getInt("totalBookings"))
                    .totalTrips(rs.getInt("totalTrips"))
                    .completedTrips(rs.getInt("completedTrips"))
                    .totalVehicles(totalVehicles)
                    .vehiclesInUse(vehiclesInUse)
                    .vehicleUtilizationRate(vehicleUtilRate)
                    .totalDrivers(totalDrivers)
                    .driversOnTrip(driversOnTrip)
                    .driverUtilizationRate(driverUtilRate)
                    .build();
        }, startDate, endDate, startDate, endDate);
    }

    /**
     * Get system alerts
     */
    public List<SystemAlertDTO> getSystemAlerts(String severity) {
        // Vehicle inspection expiring (within 30 days)
        String vehicleSql = "SELECT " +
                "v.vehicleId, v.licensePlate, v.model, v.brand, " +
                "b.branchName, b.branchId, v.inspectionExpiry, " +
                "DATEDIFF(v.inspectionExpiry, CURDATE()) as daysUntilExpiry " +
                "FROM vehicles v " +
                "INNER JOIN branches b ON v.branchId = b.branchId " +
                "WHERE v.status != 'INACTIVE' AND v.inspectionExpiry IS NOT NULL " +
                "AND v.inspectionExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) " +
                "ORDER BY v.inspectionExpiry";

        List<SystemAlertDTO> alerts = jdbcTemplate.query(vehicleSql, (rs, rowNum) -> {
            int days = rs.getInt("daysUntilExpiry");
            String sev = days <= 7 ? "CRITICAL" : days <= 15 ? "HIGH" : "MEDIUM";

            return SystemAlertDTO.builder()
                    .alertType("VEHICLE_INSPECTION_EXPIRING")
                    .severity(sev)
                    .licensePlate(rs.getString("licensePlate"))
                    .expiryDate(rs.getDate("inspectionExpiry").toLocalDate())
                    .daysUntilExpiry(days)
                    .branchName(rs.getString("branchName"))
                    .branchId(rs.getInt("branchId"))
                    .relatedEntityId(rs.getInt("vehicleId"))
                    .relatedEntityType("VEHICLE")
                    .message(String.format("Xe %s sắp hết hạn đăng kiểm (%d ngày)",
                            rs.getString("licensePlate"), days))
                    .build();
        });

        // Driver license expiring
        String driverSql = "SELECT " +
                "d.driverId, u.fullName, d.licenseNumber, d.licenseClass, d.licenseExpiry, " +
                "b.branchName, b.branchId, " +
                "DATEDIFF(d.licenseExpiry, CURDATE()) as daysUntilExpiry " +
                "FROM drivers d " +
                "INNER JOIN employees e ON d.employeeId = e.employeeId " +
                "INNER JOIN users u ON e.userId = u.userId " +
                "INNER JOIN branches b ON d.branchId = b.branchId " +
                "WHERE d.status != 'INACTIVE' AND d.licenseExpiry IS NOT NULL " +
                "AND d.licenseExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) " +
                "ORDER BY d.licenseExpiry";

        alerts.addAll(jdbcTemplate.query(driverSql, (rs, rowNum) -> {
            int days = rs.getInt("daysUntilExpiry");
            String sev = days <= 7 ? "CRITICAL" : days <= 15 ? "HIGH" : "MEDIUM";

            return SystemAlertDTO.builder()
                    .alertType("DRIVER_LICENSE_EXPIRING")
                    .severity(sev)
                    .driverName(rs.getString("fullName"))
                    .licenseNumber(rs.getString("licenseNumber"))
                    .expiryDate(rs.getDate("licenseExpiry").toLocalDate())
                    .daysUntilExpiry(days)
                    .branchName(rs.getString("branchName"))
                    .branchId(rs.getInt("branchId"))
                    .relatedEntityId(rs.getInt("driverId"))
                    .relatedEntityType("DRIVER")
                    .message(String.format("Bằng lái của %s sắp hết hạn (%d ngày)",
                            rs.getString("fullName"), days))
                    .build();
        }));

        // Filter by severity if specified
        if (severity != null && !severity.isEmpty()) {
            List<String> severities = List.of(severity.split(","));
            alerts.removeIf(alert -> !severities.contains(alert.getSeverity()));
        }

        return alerts;
    }

    /**
     * Get Manager Dashboard data (filtered by branch)
     */
    public AdminDashboardResponse getManagerDashboard(Integer branchId, String period) {
        log.info("Getting manager dashboard for branchId: {}, period: {}", branchId, period);

        Map<String, LocalDateTime> dates = getPeriodDates(period);
        LocalDateTime startDate = dates.get("start");
        LocalDateTime endDate = dates.get("end");

        // Query total revenue & expense for branch
        String financialSql = "SELECT " +
                "COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as totalRevenue, " +
                "COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as totalExpense " +
                "FROM invoices " +
                "WHERE status = 'ACTIVE' AND branchId = ? AND invoiceDate BETWEEN ? AND ?";

        Map<String, Object> financial = jdbcTemplate.queryForMap(financialSql, branchId, startDate, endDate);
        BigDecimal totalRevenue = (BigDecimal) financial.get("totalRevenue");
        BigDecimal totalExpense = (BigDecimal) financial.get("totalExpense");
        BigDecimal netProfit = totalRevenue.subtract(totalExpense);

        // Query trip stats for branch
        String tripSql = "SELECT " +
                "COUNT(*) as totalTrips, " +
                "COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completedTrips, " +
                "COUNT(CASE WHEN t.status = 'ONGOING' THEN 1 END) as ongoingTrips, " +
                "COUNT(CASE WHEN t.status = 'SCHEDULED' THEN 1 END) as scheduledTrips, " +
                "COALESCE(SUM(CASE WHEN t.status = 'COMPLETED' THEN t.distance ELSE 0 END), 0) as totalKm "
                +
                "FROM trips t " +
                "INNER JOIN bookings bk ON t.bookingId = bk.bookingId " +
                "WHERE bk.branchId = ? AND t.startTime BETWEEN ? AND ?";

        Map<String, Object> tripStats = jdbcTemplate.queryForMap(tripSql, branchId, startDate, endDate);

        // Query fleet utilization for branch (count vehicles assigned to active/scheduled trips)
        String fleetSql = "SELECT " +
                "COUNT(DISTINCT CASE WHEN tv.tripId IS NOT NULL AND t.status IN ('SCHEDULED', 'ASSIGNED', 'ONGOING') THEN v.vehicleId END) as inUse, "
                +
                "COUNT(DISTINCT CASE WHEN v.status = 'AVAILABLE' THEN v.vehicleId END) as available, " +
                "COUNT(DISTINCT CASE WHEN v.status = 'MAINTENANCE' THEN v.vehicleId END) as maintenance, "
                +
                "COUNT(DISTINCT v.vehicleId) as total " +
                "FROM vehicles v " +
                "LEFT JOIN trip_vehicles tv ON v.vehicleId = tv.vehicleId " +
                "LEFT JOIN trips t ON tv.tripId = t.tripId " +
                "WHERE v.branchId = ? AND v.status != 'INACTIVE'";

        Map<String, Object> fleetStats = jdbcTemplate.queryForMap(fleetSql, branchId);
        Long inUse = (Long) fleetStats.get("inUse");
        Long total = (Long) fleetStats.get("total");
        Double utilizationRate = total > 0 ? (inUse * 100.0 / total) : 0.0;

        // Query driver stats for branch
        String driverSql = "SELECT " +
                "COUNT(*) as totalDrivers, " +
                "COUNT(CASE WHEN status = 'ONTRIP' THEN 1 END) as driversOnTrip, " +
                "COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as driversAvailable " +
                "FROM drivers " +
                "WHERE branchId = ? AND status != 'INACTIVE'";

        Map<String, Object> driverStats = jdbcTemplate.queryForMap(driverSql, branchId);

        BigDecimal totalKm = (BigDecimal) tripStats.get("totalKm");
        if (totalKm == null)
            totalKm = BigDecimal.ZERO;

        return AdminDashboardResponse.builder()
                .totalRevenue(totalRevenue)
                .totalExpense(totalExpense)
                .netProfit(netProfit)
                .totalTrips(((Long) tripStats.get("totalTrips")).intValue())
                .completedTrips(((Long) tripStats.get("completedTrips")).intValue())
                .ongoingTrips(((Long) tripStats.get("ongoingTrips")).intValue())
                .scheduledTrips(((Long) tripStats.get("scheduledTrips")).intValue())
                .fleetUtilization(utilizationRate)
                .totalVehicles(((Long) fleetStats.get("total")).intValue())
                .vehiclesInUse(inUse.intValue())
                .vehiclesAvailable(((Long) fleetStats.get("available")).intValue())
                .vehiclesMaintenance(((Long) fleetStats.get("maintenance")).intValue())
                .totalDrivers(((Long) driverStats.get("totalDrivers")).intValue())
                .driversOnTrip(((Long) driverStats.get("driversOnTrip")).intValue())
                .driversAvailable(((Long) driverStats.get("driversAvailable")).intValue())
                .period(period)
                .periodStart(startDate.toString())
                .periodEnd(endDate.toString())
                .build();
    }

    /**
     * Get revenue trend for branch (last 12 months)
     */
    public List<RevenueTrendDTO> getBranchRevenueTrend(Integer branchId) {
        String sql = "SELECT " +
                "DATE_FORMAT(invoiceDate, '%Y-%m') as month, " +
                "SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as revenue, " +
                "SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense, " +
                "SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) - " +
                "SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as netProfit " +
                "FROM invoices " +
                "WHERE status = 'ACTIVE' AND branchId = ? AND invoiceDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) "
                +
                "GROUP BY DATE_FORMAT(invoiceDate, '%Y-%m') " +
                "ORDER BY month";

        return jdbcTemplate.query(sql, (rs, rowNum) -> RevenueTrendDTO.builder()
                .month(rs.getString("month"))
                .revenue(rs.getBigDecimal("revenue"))
                .expense(rs.getBigDecimal("expense"))
                .netProfit(rs.getBigDecimal("netProfit"))
                .build(), branchId);
    }

    /**
     * Get driver performance for branch (filtered by period)
     */
    public List<Map<String, Object>> getDriverPerformance(Integer branchId, Integer limit, String period) {
        Map<String, LocalDateTime> dates = getPeriodDates(period);
        LocalDateTime startDate = dates.get("start");
        LocalDateTime endDate = dates.get("end");

        String sql = "SELECT " +
                "d.driverId, " +
                "u.fullName as driverName, " +
                "COUNT(DISTINCT t.tripId) as totalTrips, " +
                "COALESCE(SUM(t.distance), 0) as totalKm, " +
                "COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.tripId END) as completedTrips " +
                "FROM drivers d " +
                "INNER JOIN employees e ON d.employeeId = e.employeeId " +
                "INNER JOIN users u ON e.userId = u.userId " +
                "LEFT JOIN trip_drivers td ON d.driverId = td.driverId " +
                "LEFT JOIN trips t ON td.tripId = t.tripId AND t.status = 'COMPLETED' " +
                "AND t.endTime BETWEEN ? AND ? " +
                "LEFT JOIN bookings bk ON t.bookingId = bk.bookingId " +
                "WHERE d.branchId = ? AND d.status != 'INACTIVE' " +
                "GROUP BY d.driverId, u.fullName " +
                "ORDER BY totalTrips DESC, totalKm DESC " +
                "LIMIT ?";

        return jdbcTemplate.query(sql, (rs, rowNum) -> Map.of(
                "driverId", rs.getInt("driverId"),
                "driverName", rs.getString("driverName"),
                "totalTrips", rs.getLong("totalTrips"),
                "completedTrips", rs.getLong("completedTrips"),
                "totalKm", rs.getBigDecimal("totalKm")), startDate, endDate, branchId, limit);
    }

    /**
     * Get vehicle utilization for branch
     */
    public Map<String, Object> getVehicleUtilization(Integer branchId) {
        String sql = "SELECT " +
                "COUNT(DISTINCT CASE WHEN v.status = 'AVAILABLE' THEN v.vehicleId END) as vehiclesAvailable, "
                +
                "COUNT(DISTINCT CASE WHEN v.status = 'MAINTENANCE' THEN v.vehicleId END) as vehiclesMaintenance, "
                +
                "COUNT(DISTINCT v.vehicleId) as totalVehicles, " +
                "COUNT(DISTINCT CASE WHEN tv.tripId IS NOT NULL AND t.status = 'ONGOING' THEN v.vehicleId END) as vehiclesOnTrip "
                +
                "FROM vehicles v " +
                "LEFT JOIN trip_vehicles tv ON v.vehicleId = tv.vehicleId " +
                "LEFT JOIN trips t ON tv.tripId = t.tripId AND t.status = 'ONGOING' " +
                "WHERE v.branchId = ? AND v.status != 'INACTIVE'";

        Map<String, Object> stats = jdbcTemplate.queryForMap(sql, branchId);
        Long total = (Long) stats.get("totalVehicles");
        Long onTrip = (Long) stats.get("vehiclesOnTrip");
        Double utilizationRate = total > 0 ? (onTrip * 100.0 / total) : 0.0;

        return Map.of(
                "totalVehicles", stats.get("totalVehicles"),
                "vehiclesInUse", onTrip, // Use vehiclesOnTrip as vehiclesInUse
                "vehiclesAvailable", stats.get("vehiclesAvailable"),
                "vehiclesMaintenance", stats.get("vehiclesMaintenance"),
                "vehiclesOnTrip", stats.get("vehiclesOnTrip"),
                "utilizationRate", utilizationRate);
    }

    /**
     * Get vehicle efficiency (cost per km) for branch
     */
    public List<Map<String, Object>> getVehicleEfficiency(Integer branchId, String period) {
        Map<String, LocalDateTime> dates = getPeriodDates(period);
        LocalDateTime startDate = dates.get("start");
        LocalDateTime endDate = dates.get("end");

        // Convert to Timestamp for JDBC compatibility
        Timestamp tripStart = Timestamp.valueOf(startDate);
        Timestamp tripEnd = Timestamp.valueOf(endDate);
        Timestamp invoiceStart = Timestamp.valueOf(startDate);
        Timestamp invoiceEnd = Timestamp.valueOf(endDate);

        String sql = """
                                SELECT
                                        v.licensePlate AS licensePlate,
                                        COALESCE(trips.totalKm, 0) AS totalKm,
                                        COALESCE(costs.totalCost, 0) AS totalCost,
                                        CASE
                                                WHEN COALESCE(trips.totalKm, 0) > 0 THEN COALESCE(costs.totalCost, 0) / COALESCE(trips.totalKm, 1)
                                                ELSE 0
                                        END AS costPerKm
                                FROM vehicles v
                                LEFT JOIN (
                                        SELECT
                                                tv.vehicleId AS vehicleId,
                                                SUM(t.distance) AS totalKm
                                        FROM trip_vehicles tv
                                        INNER JOIN trips t ON tv.tripId = t.tripId
                                                AND t.status = 'COMPLETED'
                                                AND t.startTime BETWEEN ? AND ?
                                        GROUP BY tv.vehicleId
                                ) trips ON v.vehicleId = trips.vehicleId
                                LEFT JOIN (
                                        SELECT
                                                e.vehicleId AS vehicleId,
                                                SUM(e.amount) AS totalCost
                                        FROM expenses e
                                        WHERE e.vehicleId IS NOT NULL
                                          AND e.branchId = ?
                                          AND e.category IN ('FUEL', 'MAINTENANCE', 'TOLL')
                                          AND e.status IN ('APPROVED', 'PAID')
                                          AND e.expenseDate BETWEEN ? AND ?
                                        GROUP BY e.vehicleId
                                ) costs ON v.vehicleId = costs.vehicleId
                                WHERE v.branchId = ?
                                  AND v.status <> 'INACTIVE'
                                  AND COALESCE(trips.totalKm, 0) > 0
                                ORDER BY costPerKm ASC, totalKm DESC
                                LIMIT 10
                                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> Map.of(
                        "licensePlate", rs.getString("licensePlate"),
                        "totalKm", rs.getBigDecimal("totalKm"),
                        "totalCost", rs.getBigDecimal("totalCost"),
                        "costPerKm", rs.getBigDecimal("costPerKm")), tripStart, tripEnd, branchId, invoiceStart,
                invoiceEnd, branchId);
    }

    /**
     * Get expense breakdown by category for branch
     */
    public List<Map<String, Object>> getExpenseBreakdown(Integer branchId) {
        Map<String, LocalDateTime> dates = getPeriodDates("THIS_MONTH");
        LocalDateTime startDate = dates.get("start");
        LocalDateTime endDate = dates.get("end");

        // Convert LocalDateTime to Instant for database comparison
        Instant startInstant = startDate.atZone(ZoneId.systemDefault()).toInstant();
        Instant endInstant = endDate.atZone(ZoneId.systemDefault()).toInstant();

        String sql = "SELECT " +
                "i.costType, " +
                "COALESCE(SUM(i.amount), 0) as totalAmount, " +
                "COUNT(*) as count " +
                "FROM invoices i " +
                "WHERE i.status = 'ACTIVE' AND i.type = 'EXPENSE' " +
                "AND i.branchId = ? AND i.invoiceDate BETWEEN ? AND ? " +
                "GROUP BY i.costType " +
                "ORDER BY totalAmount DESC";

        return jdbcTemplate.query(sql, (rs, rowNum) -> Map.of(
                "category",
                rs.getString("costType") != null ? rs.getString("costType") : "UNCATEGORIZED",
                "totalAmount", rs.getBigDecimal("totalAmount"),
                "count", rs.getLong("count")), branchId, startInstant, endInstant);
    }

    /**
     * Get pending approvals (all branches for admin, specific branch for manager)
     */
    public List<Map<String, Object>> getPendingApprovals(Integer branchId) {
        try {
            String sql;
            List<Map<String, Object>> results;

            if (branchId != null) {
                // Manager: filter by branch
                sql = "SELECT " +
                        "ah.historyId as approvalId, " +
                        "ah.approvalType, " +
                        "ah.relatedEntityId, " +
                        "ah.requestReason, " +
                        "ah.requestedAt, " +
                        "u.fullName as requestedBy, " +
                        "b.branchName, " +
                        "b.branchId " +
                        "FROM approval_history ah " +
                        "INNER JOIN users u ON ah.requestedBy = u.userId " +
                        "INNER JOIN branches b ON ah.branchId = b.branchId " +
                        "WHERE ah.status = 'PENDING' AND ah.branchId = ? " +
                        "ORDER BY ah.requestedAt DESC";
                results = jdbcTemplate.query(sql, (rs, rowNum) -> Map.of(
                        "approvalId", rs.getInt("approvalId"),
                        "approvalType", rs.getString("approvalType"),
                        "relatedEntityId", rs.getInt("relatedEntityId"),
                        "requestReason",
                        rs.getString("requestReason") != null ? rs.getString("requestReason")
                                : "",
                        "requestedAt", rs.getTimestamp("requestedAt").toString(),
                        "requestedBy", rs.getString("requestedBy"),
                        "branchName", rs.getString("branchName"),
                        "branchId", rs.getInt("branchId")), branchId);
            } else {
                // Admin: all branches
                sql = "SELECT " +
                        "ah.historyId as approvalId, " +
                        "ah.approvalType, " +
                        "ah.relatedEntityId, " +
                        "ah.requestReason, " +
                        "ah.requestedAt, " +
                        "u.fullName as requestedBy, " +
                        "b.branchName, " +
                        "b.branchId " +
                        "FROM approval_history ah " +
                        "INNER JOIN users u ON ah.requestedBy = u.userId " +
                        "INNER JOIN branches b ON ah.branchId = b.branchId " +
                        "WHERE ah.status = 'PENDING' " +
                        "ORDER BY ah.requestedAt DESC";
                results = jdbcTemplate.query(sql, (rs, rowNum) -> Map.of(
                        "approvalId", rs.getInt("approvalId"),
                        "approvalType", rs.getString("approvalType"),
                        "relatedEntityId", rs.getInt("relatedEntityId"),
                        "requestReason",
                        rs.getString("requestReason") != null ? rs.getString("requestReason")
                                : "",
                        "requestedAt", rs.getTimestamp("requestedAt").toString(),
                        "requestedBy", rs.getString("requestedBy"),
                        "branchName", rs.getString("branchName"),
                        "branchId", rs.getInt("branchId")));
            }

            return results;
        } catch (Exception e) {
            log.error("Error getting pending approvals for branchId: {}", branchId, e);
            return List.of(); // Return empty list instead of throwing exception
        }
    }

    /**
     * Get top routes
     */
    public List<Map<String, Object>> getTopRoutes(String period, Integer limit) {
        try {
            Map<String, LocalDateTime> dates = getPeriodDates(period);
            LocalDateTime startDate = dates.get("start");
            LocalDateTime endDate = dates.get("end");

            String sql = "SELECT " +
                    "t.startLocation, " +
                    "t.endLocation, " +
                    "COUNT(DISTINCT t.tripId) as tripCount, " +
                    "COALESCE(SUM(t.distance), 0) as totalDistance, " +
                    "COALESCE(SUM(CASE WHEN i.type = 'INCOME' THEN i.amount ELSE 0 END), 0) as totalRevenue "
                    +
                    "FROM trips t " +
                    "INNER JOIN bookings bk ON t.bookingId = bk.bookingId " +
                    "LEFT JOIN invoices i ON bk.bookingId = i.bookingId AND i.type = 'INCOME' " +
                    "WHERE bk.bookingDate BETWEEN ? AND ? AND t.status = 'COMPLETED' " +
                    "GROUP BY t.startLocation, t.endLocation " +
                    "ORDER BY tripCount DESC, totalRevenue DESC " +
                    "LIMIT ?";

            return jdbcTemplate.query(sql, (rs, rowNum) -> Map.of(
                    "startLocation",
                    rs.getString("startLocation") != null ? rs.getString("startLocation") : "",
                    "endLocation",
                    rs.getString("endLocation") != null ? rs.getString("endLocation") : "",
                    "tripCount", rs.getLong("tripCount"),
                    "totalDistance", rs.getBigDecimal("totalDistance"),
                    "totalRevenue", rs.getBigDecimal("totalRevenue")), startDate, endDate, limit);
        } catch (Exception e) {
            log.error("Error getting top routes for period: {}, limit: {}", period, limit, e);
            return List.of(); // Return empty list instead of throwing exception
        }
    }

    /**
     * Get system alerts filtered by branch
     */
    public List<SystemAlertDTO> getBranchAlerts(Integer branchId, String severity) {
        List<SystemAlertDTO> alerts = new java.util.ArrayList<>();

        // Vehicle inspection expiring
        String vehicleSql = "SELECT " +
                "v.vehicleId, v.licensePlate, v.model, v.brand, " +
                "b.branchName, b.branchId, v.inspectionExpiry, " +
                "DATEDIFF(v.inspectionExpiry, CURDATE()) as daysUntilExpiry " +
                "FROM vehicles v " +
                "INNER JOIN branches b ON v.branchId = b.branchId " +
                "WHERE v.branchId = ? AND v.status != 'INACTIVE' AND v.inspectionExpiry IS NOT NULL " +
                "AND v.inspectionExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) " +
                "ORDER BY v.inspectionExpiry";

        alerts.addAll(jdbcTemplate.query(vehicleSql, (rs, rowNum) -> {
            int days = rs.getInt("daysUntilExpiry");
            String sev = days <= 7 ? "CRITICAL" : days <= 15 ? "HIGH" : "MEDIUM";

            return SystemAlertDTO.builder()
                    .alertType("VEHICLE_INSPECTION_EXPIRING")
                    .severity(sev)
                    .licensePlate(rs.getString("licensePlate"))
                    .expiryDate(rs.getDate("inspectionExpiry").toLocalDate())
                    .daysUntilExpiry(days)
                    .branchName(rs.getString("branchName"))
                    .branchId(rs.getInt("branchId"))
                    .relatedEntityId(rs.getInt("vehicleId"))
                    .relatedEntityType("VEHICLE")
                    .message(String.format("Xe %s sắp hết hạn đăng kiểm (%d ngày)",
                            rs.getString("licensePlate"), days))
                    .build();
        }, branchId));

        // Driver license expiring
        String driverSql = "SELECT " +
                "d.driverId, u.fullName, d.licenseNumber, d.licenseClass, d.licenseExpiry, " +
                "b.branchName, b.branchId, " +
                "DATEDIFF(d.licenseExpiry, CURDATE()) as daysUntilExpiry " +
                "FROM drivers d " +
                "INNER JOIN employees e ON d.employeeId = e.employeeId " +
                "INNER JOIN users u ON e.userId = u.userId " +
                "INNER JOIN branches b ON d.branchId = b.branchId " +
                "WHERE d.branchId = ? AND d.status != 'INACTIVE' AND d.licenseExpiry IS NOT NULL " +
                "AND d.licenseExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) " +
                "ORDER BY d.licenseExpiry";

        alerts.addAll(jdbcTemplate.query(driverSql, (rs, rowNum) -> {
            int days = rs.getInt("daysUntilExpiry");
            String sev = days <= 7 ? "CRITICAL" : days <= 15 ? "HIGH" : "MEDIUM";

            return SystemAlertDTO.builder()
                    .alertType("DRIVER_LICENSE_EXPIRING")
                    .severity(sev)
                    .driverName(rs.getString("fullName"))
                    .licenseNumber(rs.getString("licenseNumber"))
                    .expiryDate(rs.getDate("licenseExpiry").toLocalDate())
                    .daysUntilExpiry(days)
                    .branchName(rs.getString("branchName"))
                    .branchId(rs.getInt("branchId"))
                    .relatedEntityId(rs.getInt("driverId"))
                    .relatedEntityType("DRIVER")
                    .message(String.format("Bằng lái của %s sắp hết hạn (%d ngày)",
                            rs.getString("fullName"), days))
                    .build();
        }, branchId));

        // Filter by severity if specified
        if (severity != null && !severity.isEmpty()) {
            List<String> severities = List.of(severity.split(","));
            alerts.removeIf(alert -> !severities.contains(alert.getSeverity()));
        }

        return alerts;
    }

    /**
     * Helper: Get date range for period
     */
    private Map<String, LocalDateTime> getPeriodDates(String period) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start;
        LocalDateTime end = now;

        switch (period != null ? period : "THIS_MONTH") {
            case "TODAY":
                start = now.toLocalDate().atStartOfDay();
                break;
            case "THIS_WEEK":
                start = now.minusDays(now.getDayOfWeek().getValue() - 1).toLocalDate().atStartOfDay();
                break;
            case "THIS_QUARTER":
                int quarter = (now.getMonthValue() - 1) / 3;
                start = LocalDateTime.of(now.getYear(), quarter * 3 + 1, 1, 0, 0);
                break;
            case "YTD":
                start = LocalDateTime.of(now.getYear(), 1, 1, 0, 0);
                break;
            case "THIS_MONTH":
            default:
                start = YearMonth.from(now).atDay(1).atStartOfDay();
                break;
        }

        return Map.of("start", start, "end", end);
    }
}