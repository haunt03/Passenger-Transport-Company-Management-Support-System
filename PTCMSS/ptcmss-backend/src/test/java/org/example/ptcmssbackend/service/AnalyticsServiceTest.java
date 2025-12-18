package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.analytics.AdminDashboardResponse;
import org.example.ptcmssbackend.dto.analytics.BranchComparisonDTO;
import org.example.ptcmssbackend.dto.analytics.RevenueTrendDTO;
import org.example.ptcmssbackend.dto.analytics.SystemAlertDTO;
import org.example.ptcmssbackend.entity.ExpenseRequests;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.example.ptcmssbackend.repository.ExpenseRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ExpenseRequestRepository expenseRequestRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    // ==================== getAdminDashboard() Tests ====================

    @Test
    void getAdminDashboard_whenValidPeriod_shouldReturnDashboardData() {
        // Given
        String period = "THIS_MONTH";
        
        // Mock financial query
        Map<String, Object> financialMap = Map.of(
            "totalRevenue", new BigDecimal("10000000"),
            "totalExpense", new BigDecimal("5000000")
        );
        
        // Mock trip stats
        Map<String, Object> tripStatsMap = Map.of(
            "totalTrips", 100L,
            "completedTrips", 80L,
            "ongoingTrips", 10L,
            "scheduledTrips", 10L
        );
        
        // Mock fleet stats
        Map<String, Object> fleetStatsMap = Map.of(
            "inUse", 15L,
            "available", 20L,
            "maintenance", 5L,
            "total", 40L
        );
        
        // Mock driver stats
        Map<String, Object> driverStatsMap = Map.of(
            "totalDrivers", 30L,
            "driversOnTrip", 10L,
            "driversAvailable", 20L
        );
        
        when(jdbcTemplate.queryForMap(anyString(), any(), any())).thenReturn(
            financialMap, tripStatsMap, fleetStatsMap, driverStatsMap
        );
        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.APPROVED))
            .thenReturn(Collections.emptyList());

        // When
        AdminDashboardResponse result = analyticsService.getAdminDashboard(period);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalRevenue()).isEqualTo(new BigDecimal("10000000"));
        assertThat(result.getTotalExpense()).isEqualTo(new BigDecimal("5000000"));
        assertThat(result.getNetProfit()).isEqualTo(new BigDecimal("5000000"));
        assertThat(result.getTotalTrips()).isEqualTo(100);
        assertThat(result.getCompletedTrips()).isEqualTo(80);
        assertThat(result.getFleetUtilization()).isEqualTo(37.5); // 15/40 * 100
        assertThat(result.getPeriod()).isEqualTo(period);
        verify(jdbcTemplate, atLeast(1)).queryForMap(anyString(), any(Object.class), any(Object.class));
    }

    @Test
    void getAdminDashboard_whenIncludesExpenseRequests_shouldAddToTotalExpense() {
        // Given
        String period = "THIS_MONTH";
        
        ExpenseRequests expenseRequest1 = new ExpenseRequests();
        expenseRequest1.setAmount(new BigDecimal("1000000"));
        expenseRequest1.setCreatedAt(Instant.now());
        
        ExpenseRequests expenseRequest2 = new ExpenseRequests();
        expenseRequest2.setAmount(new BigDecimal("2000000"));
        expenseRequest2.setCreatedAt(Instant.now());
        
        Map<String, Object> financialMap = Map.of(
            "totalRevenue", new BigDecimal("10000000"),
            "totalExpense", new BigDecimal("5000000")
        );
        
        Map<String, Object> tripStatsMap = Map.of(
            "totalTrips", 100L,
            "completedTrips", 80L,
            "ongoingTrips", 10L,
            "scheduledTrips", 10L
        );
        
        Map<String, Object> fleetStatsMap = Map.of(
            "inUse", 15L,
            "available", 20L,
            "maintenance", 5L,
            "total", 40L
        );
        
        Map<String, Object> driverStatsMap = Map.of(
            "totalDrivers", 30L,
            "driversOnTrip", 10L,
            "driversAvailable", 20L
        );
        
        when(jdbcTemplate.queryForMap(anyString(), any(), any())).thenReturn(
            financialMap, tripStatsMap, fleetStatsMap, driverStatsMap
        );
        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.APPROVED))
            .thenReturn(List.of(expenseRequest1, expenseRequest2));

        // When
        AdminDashboardResponse result = analyticsService.getAdminDashboard(period);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalExpense()).isEqualTo(new BigDecimal("8000000")); // 5000000 + 1000000 + 2000000
        verify(expenseRequestRepository).findByStatus(ExpenseRequestStatus.APPROVED);
    }

    @Test
    void getAdminDashboard_whenNoVehicles_shouldReturnZeroUtilization() {
        // Given
        String period = "THIS_MONTH";
        
        Map<String, Object> financialMap = Map.of(
            "totalRevenue", new BigDecimal("10000000"),
            "totalExpense", new BigDecimal("5000000")
        );
        
        Map<String, Object> tripStatsMap = Map.of(
            "totalTrips", 100L,
            "completedTrips", 80L,
            "ongoingTrips", 10L,
            "scheduledTrips", 10L
        );
        
        Map<String, Object> fleetStatsMap = Map.of(
            "inUse", 0L,
            "available", 0L,
            "maintenance", 0L,
            "total", 0L
        );
        
        Map<String, Object> driverStatsMap = Map.of(
            "totalDrivers", 30L,
            "driversOnTrip", 10L,
            "driversAvailable", 20L
        );
        
        when(jdbcTemplate.queryForMap(anyString(), any(), any())).thenReturn(
            financialMap, tripStatsMap, fleetStatsMap, driverStatsMap
        );
        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.APPROVED))
            .thenReturn(Collections.emptyList());

        // When
        AdminDashboardResponse result = analyticsService.getAdminDashboard(period);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getFleetUtilization()).isEqualTo(0.0);
    }

    // ==================== getRevenueTrend() Tests ====================

    @Test
    void getRevenueTrend_whenValidData_shouldReturnTrendList() throws SQLException {
        // Given
        ResultSet rs = mock(ResultSet.class);
        when(rs.next()).thenReturn(true, true, false);
        
        when(rs.getString("month")).thenReturn("2025-01", "2025-02");
        when(rs.getBigDecimal("revenue")).thenReturn(
            new BigDecimal("5000000"),
            new BigDecimal("6000000")
        );
        when(rs.getBigDecimal("expense")).thenReturn(
            new BigDecimal("2000000"),
            new BigDecimal("2500000")
        );
        when(rs.getBigDecimal("netProfit")).thenReturn(
            new BigDecimal("3000000"),
            new BigDecimal("3500000")
        );
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<RevenueTrendDTO> results = new ArrayList<>();
            results.add((RevenueTrendDTO) mapper.mapRow(rs, 1));
            results.add((RevenueTrendDTO) mapper.mapRow(rs, 2));
            return results;
        });

        // When
        List<RevenueTrendDTO> result = analyticsService.getRevenueTrend();

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(2);
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class));
    }

    // ==================== getBranchComparison() Tests ====================

    @Test
    void getBranchComparison_whenValidPeriod_shouldReturnComparisonList() throws SQLException {
        // Given
        String period = "THIS_MONTH";
        
        ResultSet rs = mock(ResultSet.class);
        when(rs.next()).thenReturn(true, false);
        when(rs.getInt("branchId")).thenReturn(1);
        when(rs.getString("branchName")).thenReturn("Chi nhánh Hà Nội");
        when(rs.getString("location")).thenReturn("Hà Nội");
        when(rs.getBigDecimal("revenue")).thenReturn(new BigDecimal("5000000"));
        when(rs.getBigDecimal("expense")).thenReturn(new BigDecimal("2000000"));
        when(rs.getBigDecimal("netProfit")).thenReturn(new BigDecimal("3000000"));
        when(rs.getInt("totalBookings")).thenReturn(50);
        when(rs.getInt("totalTrips")).thenReturn(45);
        when(rs.getInt("completedTrips")).thenReturn(40);
        when(rs.getInt("totalVehicles")).thenReturn(20);
        when(rs.getInt("vehiclesInUse")).thenReturn(10);
        when(rs.getInt("totalDrivers")).thenReturn(15);
        when(rs.getInt("driversOnTrip")).thenReturn(8);
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), any(), any())).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<BranchComparisonDTO> results = new ArrayList<>();
            results.add((BranchComparisonDTO) mapper.mapRow(rs, 1));
            return results;
        });

        // When
        List<BranchComparisonDTO> result = analyticsService.getBranchComparison(period);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBranchId()).isEqualTo(1);
        assertThat(result.get(0).getBranchName()).isEqualTo("Chi nhánh Hà Nội");
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class), any(), any(), any(), any());
    }

    // ==================== getSystemAlerts() Tests ====================

    @Test
    void getSystemAlerts_whenNoSeverityFilter_shouldReturnAllAlerts() throws SQLException {
        // Given
        String severity = null;
        
        // Mock vehicle alerts
        ResultSet vehicleRs = mock(ResultSet.class);
        when(vehicleRs.next()).thenReturn(true, false);
        when(vehicleRs.getInt("vehicleId")).thenReturn(1);
        when(vehicleRs.getString("licensePlate")).thenReturn("30A-12345");
        when(vehicleRs.getString("model")).thenReturn("Toyota Hiace");
        when(vehicleRs.getString("brand")).thenReturn("Toyota");
        when(vehicleRs.getString("branchName")).thenReturn("Chi nhánh Hà Nội");
        when(vehicleRs.getInt("branchId")).thenReturn(1);
        when(vehicleRs.getInt("daysUntilExpiry")).thenReturn(5);
        when(vehicleRs.getDate("inspectionExpiry")).thenReturn(
            java.sql.Date.valueOf(LocalDate.now().plusDays(5))
        );
        
        // Mock driver alerts
        ResultSet driverRs = mock(ResultSet.class);
        when(driverRs.next()).thenReturn(true, false);
        when(driverRs.getInt("driverId")).thenReturn(1);
        when(driverRs.getString("fullName")).thenReturn("Nguyễn Văn A");
        when(driverRs.getString("licenseNumber")).thenReturn("DL-123456");
        when(driverRs.getString("licenseClass")).thenReturn("B2");
        when(driverRs.getString("branchName")).thenReturn("Chi nhánh Hà Nội");
        when(driverRs.getInt("branchId")).thenReturn(1);
        when(driverRs.getInt("daysUntilExpiry")).thenReturn(10);
        when(driverRs.getDate("licenseExpiry")).thenReturn(
            java.sql.Date.valueOf(LocalDate.now().plusDays(10))
        );
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class))).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0).toString();
            RowMapper<?> mapper = invocation.getArgument(1);
            List<SystemAlertDTO> results = new ArrayList<>();
            
            if (sql.contains("vehicles")) {
                results.add((SystemAlertDTO) mapper.mapRow(vehicleRs, 1));
            } else if (sql.contains("drivers")) {
                results.add((SystemAlertDTO) mapper.mapRow(driverRs, 1));
            }
            return results;
        });

        // When
        List<SystemAlertDTO> result = analyticsService.getSystemAlerts(severity);

        // Then
        assertThat(result).isNotNull();
        verify(jdbcTemplate, atLeast(2)).query(anyString(), any(RowMapper.class));
    }

    @Test
    void getSystemAlerts_whenSeverityFilter_shouldFilterAlerts() throws SQLException {
        // Given
        String severity = "CRITICAL";
        
        ResultSet vehicleRs = mock(ResultSet.class);
        when(vehicleRs.next()).thenReturn(true, true, false);
        when(vehicleRs.getInt("vehicleId")).thenReturn(1, 2);
        when(vehicleRs.getString("licensePlate")).thenReturn("30A-12345", "30A-67890");
        when(vehicleRs.getString("model")).thenReturn("Toyota Hiace", "Ford Transit");
        when(vehicleRs.getString("brand")).thenReturn("Toyota", "Ford");
        when(vehicleRs.getString("branchName")).thenReturn("Chi nhánh Hà Nội", "Chi nhánh HCM");
        when(vehicleRs.getInt("branchId")).thenReturn(1, 2);
        when(vehicleRs.getInt("daysUntilExpiry")).thenReturn(5, 20); // 5 = CRITICAL, 20 = MEDIUM
        when(vehicleRs.getDate("inspectionExpiry")).thenReturn(
            java.sql.Date.valueOf(LocalDate.now().plusDays(5)),
            java.sql.Date.valueOf(LocalDate.now().plusDays(20))
        );
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<SystemAlertDTO> results = new ArrayList<>();
            results.add((SystemAlertDTO) mapper.mapRow(vehicleRs, 1));
            results.add((SystemAlertDTO) mapper.mapRow(vehicleRs, 2));
            return results;
        });

        // When
        List<SystemAlertDTO> result = analyticsService.getSystemAlerts(severity);

        // Then
        assertThat(result).isNotNull();
        // Should only contain CRITICAL alerts (days <= 7)
        assertThat(result).allMatch(alert -> "CRITICAL".equals(alert.getSeverity()));
    }

    // ==================== getManagerDashboard() Tests ====================

    @Test
    void getManagerDashboard_whenValidBranchAndPeriod_shouldReturnDashboardData() {
        // Given
        Integer branchId = 1;
        String period = "THIS_MONTH";
        
        Map<String, Object> financialMap = Map.of(
            "totalRevenue", new BigDecimal("5000000"),
            "totalExpense", new BigDecimal("2000000")
        );
        
        Map<String, Object> tripStatsMap = Map.of(
            "totalTrips", 50L,
            "completedTrips", 40L,
            "ongoingTrips", 5L,
            "scheduledTrips", 5L,
            "totalKm", new BigDecimal("10000")
        );
        
        Map<String, Object> fleetStatsMap = Map.of(
            "inUse", 8L,
            "available", 12L,
            "maintenance", 2L,
            "total", 22L
        );
        
        Map<String, Object> driverStatsMap = Map.of(
            "totalDrivers", 15L,
            "driversOnTrip", 5L,
            "driversAvailable", 10L
        );
        
        when(jdbcTemplate.queryForMap(anyString(), eq(branchId), any(), any())).thenReturn(financialMap);
        when(jdbcTemplate.queryForMap(anyString(), eq(branchId), any(), any())).thenReturn(tripStatsMap);
        when(jdbcTemplate.queryForMap(anyString(), eq(branchId))).thenReturn(fleetStatsMap, driverStatsMap);
        when(expenseRequestRepository.findByStatusAndBranch_Id(ExpenseRequestStatus.APPROVED, branchId))
            .thenReturn(Collections.emptyList());

        // When
        AdminDashboardResponse result = analyticsService.getManagerDashboard(branchId, period);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalRevenue()).isEqualTo(new BigDecimal("5000000"));
        assertThat(result.getTotalTrips()).isEqualTo(50);
        assertThat(result.getPeriod()).isEqualTo(period);
        verify(expenseRequestRepository).findByStatusAndBranch_Id(ExpenseRequestStatus.APPROVED, branchId);
    }

    // ==================== getBranchRevenueTrend() Tests ====================

    @Test
    void getBranchRevenueTrend_whenValidBranchId_shouldReturnTrendList() throws SQLException {
        // Given
        Integer branchId = 1;
        
        ResultSet rs = mock(ResultSet.class);
        when(rs.next()).thenReturn(true, false);
        when(rs.getString("month")).thenReturn("2025-01");
        when(rs.getBigDecimal("revenue")).thenReturn(new BigDecimal("5000000"));
        when(rs.getBigDecimal("expense")).thenReturn(new BigDecimal("2000000"));
        when(rs.getBigDecimal("netProfit")).thenReturn(new BigDecimal("3000000"));
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(branchId))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<RevenueTrendDTO> results = new ArrayList<>();
            results.add((RevenueTrendDTO) mapper.mapRow(rs, 1));
            return results;
        });

        // When
        List<RevenueTrendDTO> result = analyticsService.getBranchRevenueTrend(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class), eq(branchId));
    }

    // ==================== getDriverPerformance() Tests ====================

    @Test
    void getDriverPerformance_whenValidParams_shouldReturnPerformanceList() throws SQLException {
        // Given
        Integer branchId = 1;
        Integer limit = 10;
        String period = "THIS_MONTH";
        
        ResultSet rs = mock(ResultSet.class);
        when(rs.next()).thenReturn(true, false);
        when(rs.getInt("driverId")).thenReturn(1);
        when(rs.getString("driverName")).thenReturn("Nguyễn Văn A");
        when(rs.getLong("totalTrips")).thenReturn(50L);
        when(rs.getBigDecimal("totalKm")).thenReturn(new BigDecimal("5000"));
        when(rs.getLong("completedTrips")).thenReturn(45L);
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), eq(branchId), eq(limit))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<Map<String, Object>> results = new ArrayList<>();
            results.add((Map<String, Object>) mapper.mapRow(rs, 1));
            return results;
        });

        // When
        List<Map<String, Object>> result = analyticsService.getDriverPerformance(branchId, limit, period);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("driverId")).isEqualTo(1);
        assertThat(result.get(0).get("driverName")).isEqualTo("Nguyễn Văn A");
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class), any(), any(), eq(branchId), eq(limit));
    }

    // ==================== getVehicleUtilization() Tests ====================

    @Test
    void getVehicleUtilization_whenValidBranchId_shouldReturnUtilizationData() {
        // Given
        Integer branchId = 1;
        
        Map<String, Object> statsMap = Map.of(
            "vehiclesAvailable", 10L,
            "vehiclesMaintenance", 2L,
            "totalVehicles", 20L,
            "vehiclesOnTrip", 8L
        );
        
        when(jdbcTemplate.queryForMap(anyString(), eq(branchId))).thenReturn(statsMap);

        // When
        Map<String, Object> result = analyticsService.getVehicleUtilization(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.get("totalVehicles")).isEqualTo(20L);
        assertThat(result.get("vehiclesOnTrip")).isEqualTo(8L);
        assertThat(result.get("utilizationRate")).isEqualTo(40.0); // 8/20 * 100
        verify(jdbcTemplate).queryForMap(anyString(), eq(branchId));
    }

    @Test
    void getVehicleUtilization_whenNoVehicles_shouldReturnZeroUtilization() {
        // Given
        Integer branchId = 1;
        
        Map<String, Object> statsMap = Map.of(
            "vehiclesAvailable", 0L,
            "vehiclesMaintenance", 0L,
            "totalVehicles", 0L,
            "vehiclesOnTrip", 0L
        );
        
        when(jdbcTemplate.queryForMap(anyString(), eq(branchId))).thenReturn(statsMap);

        // When
        Map<String, Object> result = analyticsService.getVehicleUtilization(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.get("utilizationRate")).isEqualTo(0.0);
    }

    // ==================== getPendingApprovals() Tests ====================

    @Test
    void getPendingApprovals_whenBranchIdProvided_shouldReturnBranchApprovals() throws SQLException {
        // Given
        Integer branchId = 1;
        
        ResultSet rs = mock(ResultSet.class);
        when(rs.next()).thenReturn(true, false);
        when(rs.getInt("approvalId")).thenReturn(1);
        when(rs.getString("approvalType")).thenReturn("EXPENSE");
        when(rs.getInt("relatedEntityId")).thenReturn(100);
        when(rs.getString("requestReason")).thenReturn("Chi phí nhiên liệu");
        when(rs.getTimestamp("requestedAt")).thenReturn(java.sql.Timestamp.valueOf(java.time.LocalDateTime.now()));
        when(rs.getString("requestedBy")).thenReturn("Nguyễn Văn A");
        when(rs.getString("branchName")).thenReturn("Chi nhánh Hà Nội");
        when(rs.getInt("branchId")).thenReturn(1);
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(branchId))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<Map<String, Object>> results = new ArrayList<>();
            results.add((Map<String, Object>) mapper.mapRow(rs, 1));
            return results;
        });

        // When
        List<Map<String, Object>> result = analyticsService.getPendingApprovals(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("approvalId")).isEqualTo(1);
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class), eq(branchId));
    }

    @Test
    void getPendingApprovals_whenNoBranchId_shouldReturnAllApprovals() throws SQLException {
        // Given
        Integer branchId = null;
        
        ResultSet rs = mock(ResultSet.class);
        when(rs.next()).thenReturn(true, false);
        when(rs.getInt("approvalId")).thenReturn(1);
        when(rs.getString("approvalType")).thenReturn("EXPENSE");
        when(rs.getInt("relatedEntityId")).thenReturn(100);
        when(rs.getString("requestReason")).thenReturn("Chi phí nhiên liệu");
        when(rs.getTimestamp("requestedAt")).thenReturn(java.sql.Timestamp.valueOf(java.time.LocalDateTime.now()));
        when(rs.getString("requestedBy")).thenReturn("Nguyễn Văn A");
        when(rs.getString("branchName")).thenReturn("Chi nhánh Hà Nội");
        when(rs.getInt("branchId")).thenReturn(1);
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<Map<String, Object>> results = new ArrayList<>();
            results.add((Map<String, Object>) mapper.mapRow(rs, 1));
            return results;
        });

        // When
        List<Map<String, Object>> result = analyticsService.getPendingApprovals(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class));
    }

    @Test
    void getPendingApprovals_whenException_shouldReturnEmptyList() {
        // Given
        Integer branchId = 1;
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(branchId)))
            .thenThrow(new RuntimeException("Database error"));

        // When
        List<Map<String, Object>> result = analyticsService.getPendingApprovals(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ==================== getTopRoutes() Tests ====================

    @Test
    void getTopRoutes_whenValidParams_shouldReturnTopRoutes() throws SQLException {
        // Given
        String period = "THIS_MONTH";
        Integer limit = 10;
        
        ResultSet rs = mock(ResultSet.class);
        when(rs.next()).thenReturn(true, false);
        when(rs.getString("startLocation")).thenReturn("Hà Nội");
        when(rs.getString("endLocation")).thenReturn("Hồ Chí Minh");
        when(rs.getLong("tripCount")).thenReturn(50L);
        when(rs.getBigDecimal("totalDistance")).thenReturn(new BigDecimal("50000"));
        when(rs.getBigDecimal("totalRevenue")).thenReturn(new BigDecimal("10000000"));
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), eq(limit))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<Map<String, Object>> results = new ArrayList<>();
            results.add((Map<String, Object>) mapper.mapRow(rs, 1));
            return results;
        });

        // When
        List<Map<String, Object>> result = analyticsService.getTopRoutes(period, limit);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("startLocation")).isEqualTo("Hà Nội");
        assertThat(result.get(0).get("endLocation")).isEqualTo("Hồ Chí Minh");
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class), any(), any(), eq(limit));
    }

    @Test
    void getTopRoutes_whenException_shouldReturnEmptyList() {
        // Given
        String period = "THIS_MONTH";
        Integer limit = 10;
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(), any(), eq(limit)))
            .thenThrow(new RuntimeException("Database error"));

        // When
        List<Map<String, Object>> result = analyticsService.getTopRoutes(period, limit);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ==================== getBranchAlerts() Tests ====================

    @Test
    void getBranchAlerts_whenValidBranchId_shouldReturnAlerts() throws SQLException {
        // Given
        Integer branchId = 1;
        String severity = null;
        
        ResultSet vehicleRs = mock(ResultSet.class);
        when(vehicleRs.next()).thenReturn(true, false);
        when(vehicleRs.getInt("vehicleId")).thenReturn(1);
        when(vehicleRs.getString("licensePlate")).thenReturn("30A-12345");
        when(vehicleRs.getString("model")).thenReturn("Toyota Hiace");
        when(vehicleRs.getString("brand")).thenReturn("Toyota");
        when(vehicleRs.getString("branchName")).thenReturn("Chi nhánh Hà Nội");
        when(vehicleRs.getInt("branchId")).thenReturn(1);
        when(vehicleRs.getInt("daysUntilExpiry")).thenReturn(5);
        when(vehicleRs.getDate("inspectionExpiry")).thenReturn(
            java.sql.Date.valueOf(LocalDate.now().plusDays(5))
        );
        
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(branchId))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<SystemAlertDTO> results = new ArrayList<>();
            results.add((SystemAlertDTO) mapper.mapRow(vehicleRs, 1));
            return results;
        });

        // When
        List<SystemAlertDTO> result = analyticsService.getBranchAlerts(branchId, severity);

        // Then
        assertThat(result).isNotNull();
        verify(jdbcTemplate, atLeast(1)).query(anyString(), any(RowMapper.class), eq(branchId));
    }
}

