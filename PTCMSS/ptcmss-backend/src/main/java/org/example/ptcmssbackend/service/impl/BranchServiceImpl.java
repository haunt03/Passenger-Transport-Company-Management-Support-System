package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Branch.CreateBranchRequest;
import org.example.ptcmssbackend.dto.request.Branch.UpdateBranchRequest;
import org.example.ptcmssbackend.dto.response.Branch.BranchResponse;
import org.example.ptcmssbackend.dto.response.Branch.ManagerDashboardStatsResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.TripStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.BranchService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "BRANCH_SERVICE")
public class BranchServiceImpl implements BranchService {

    private final BranchesRepository branchesRepository;
    private final EmployeeRepository employeeRepository;
    private final BookingRepository bookingRepository;
    private final TripRepository tripRepository;
    private final InvoiceRepository invoiceRepository;
    private final TripDriverRepository tripDriverRepository;
    private final TripVehicleRepository tripVehicleRepository;

    @Override
    public BranchResponse createBranch(CreateBranchRequest request) {
        Branches branch = new Branches();
        branch.setBranchName(request.getBranchName());
        branch.setLocation(request.getLocation());
        if (request.getManagerId() != null) {
            Employees manager = employeeRepository.findByUserId(request.getManagerId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy employee tương ứng với userId: " + request.getManagerId()));
            branch.setManager(manager);
        }
        branch.setStatus(BranchStatus.ACTIVE);
        branchesRepository.save(branch);
        return BranchResponse.builder()
                .id(branch.getId())
                .branchName(branch.getBranchName())
                .managerId(branch.getManager() != null ? branch.getManager().getEmployeeId() : null)
                .managerName(branch.getManager() != null && branch.getManager().getUser() != null
                        ? branch.getManager().getUser().getFullName() : null)
                .location(branch.getLocation())
                .status(branch.getStatus().name())
                .build();
    }

    @Override
    public Integer updateBranch(Integer id, UpdateBranchRequest request) {
        Branches branch = branchesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        branch.setBranchName(request.getBranchName());
        branch.setLocation(request.getLocation());
        branch.setStatus(request.getStatus());
        if (request.getManagerId() != null) {
            Employees manager = employeeRepository.findByUserId(request.getManagerId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy employee tương ứng với userId: " + request.getManagerId()));
            branch.setManager(manager);
        }
        branchesRepository.save(branch);
        return branch.getId();
    }

    @Override
    public PageResponse<?> getAllBranches(String keyword, int pageNo, int pageSize, String sortBy) {
        log.info("Find all users with keyword: {}", keyword);
        int p = pageNo > 0 ? pageNo - 1 : 0;
        List<Sort.Order> sorts = new ArrayList<>();
        // Sort by ID
        if (StringUtils.hasLength(sortBy)) {
            Pattern pattern = Pattern.compile("(\\w+?)(:)(.*)");
            Matcher matcher = pattern.matcher(sortBy);
            if (matcher.find()) {
                if (matcher.group(3).equalsIgnoreCase("asc")) {
                    sorts.add(new Sort.Order(Sort.Direction.ASC, matcher.group(1)));
                } else {
                    sorts.add(new Sort.Order(Sort.Direction.DESC, matcher.group(1)));
                }
            }
        }

        //pagging
        Pageable pageable = PageRequest.of(p, pageSize, Sort.by(sorts));
        Page<Branches> page = branchesRepository.findAll(pageable);

        if(StringUtils.hasLength(keyword)) {
            keyword = "%" + keyword + "%";
            page = branchesRepository.findAll(pageable);
        }else {
            page = branchesRepository.findAll(pageable);
        }
        return getBranchPageResponse(pageNo, pageSize, page);
    }

    @Override
    public BranchResponse getBranchById(Integer id) {
        Branches branch = branchesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        return BranchResponse.builder()
                .id(branch.getId())
                .branchName(branch.getBranchName())
                .managerId(branch.getManager() != null ? branch.getManager().getEmployeeId() : null)
                .managerName(branch.getManager() != null && branch.getManager().getUser() != null
                        ? branch.getManager().getUser().getFullName() : null)
                .location(branch.getLocation())
                .status(branch.getStatus().name())
                .build();
    }

    @Override
    public Integer deleteBranch(Integer id) {
        Branches branch = branchesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        branch.setStatus(BranchStatus.INACTIVE);
        branchesRepository.save(branch);
        return branch.getId();
    }

    @Override
    public BranchResponse getBranchByUserId(Integer userId) {

        Employees employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User không thuộc chi nhánh nào"));

        Branches branch = employee.getBranch();

        if (branch == null) {
            throw new RuntimeException("Employee chưa được gán chi nhánh");
        }

        return BranchResponse.builder()
                .id(branch.getId())
                .branchName(branch.getBranchName())
                .location(branch.getLocation())
                .status(branch.getStatus().name())
                .managerId(
                        branch.getManager() != null ?
                                branch.getManager().getEmployeeId() : null
                )
                .build();
    }

    private static PageResponse<List<BranchResponse>> getBranchPageResponse(int pageNo, int pageSize, Page<Branches> branches) {
        List<BranchResponse> branchResponse = branches.stream()
                .map(branch -> BranchResponse.builder()
                        .id(branch.getId())
                        .branchName(branch.getBranchName())
                        .managerId(branch.getManager() != null ? branch.getManager().getEmployeeId() : null)
                        .managerName(branch.getManager() != null && branch.getManager().getUser() != null
                                ? branch.getManager().getUser().getFullName() : null)
                        .location(branch.getLocation())
                        .status(branch.getStatus().name())
                        .build())
                .toList();
        return PageResponse.<List<BranchResponse>>builder()
                .items(branchResponse)
                .totalPages(branches.getTotalPages())
                .totalElements(branches.getTotalElements())
                .pageNo(pageNo)
                .pageSize(pageSize)
                .build();
    }

    @Override
    public ManagerDashboardStatsResponse getManagerDashboardStats(Integer branchId, String period) {
        log.info("Getting dashboard stats for branch {} and period {}", branchId, period);

        // Parse period (format: "2025-10")
        YearMonth yearMonth = YearMonth.parse(period);
        Instant startOfMonth = yearMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfMonth = yearMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        // Previous period for comparison
        YearMonth prevYearMonth = yearMonth.minusMonths(1);
        Instant prevStartOfMonth = prevYearMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant prevEndOfMonth = prevYearMonth.atEndOfMonth().atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        // Get branch info
        Branches branch = branchesRepository.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        ManagerDashboardStatsResponse.BranchInfo branchInfo = ManagerDashboardStatsResponse.BranchInfo.builder()
                .branchId(branch.getId())
                .branchName(branch.getBranchName())
                .location(branch.getLocation())
                .build();

        // Calculate financial metrics
        ManagerDashboardStatsResponse.FinancialMetrics financialMetrics = calculateFinancialMetrics(
                branchId, startOfMonth, endOfMonth, prevStartOfMonth, prevEndOfMonth);

        // Calculate trip metrics
        ManagerDashboardStatsResponse.TripMetrics tripMetrics = calculateTripMetrics(
                branchId, startOfMonth, endOfMonth);

        // Get top drivers
        List<ManagerDashboardStatsResponse.DriverPerformance> topDrivers = getTopDrivers(
                branchId, startOfMonth, endOfMonth);

        // Get vehicle efficiency
        List<ManagerDashboardStatsResponse.VehicleEfficiency> vehicleEfficiency = getVehicleEfficiency(
                branchId, startOfMonth, endOfMonth);

        return ManagerDashboardStatsResponse.builder()
                .branchInfo(branchInfo)
                .financialMetrics(financialMetrics)
                .tripMetrics(tripMetrics)
                .topDrivers(topDrivers)
                .vehicleEfficiency(vehicleEfficiency)
                .build();
    }

    private ManagerDashboardStatsResponse.FinancialMetrics calculateFinancialMetrics(
            Integer branchId, Instant start, Instant end, Instant prevStart, Instant prevEnd) {

        // Current period revenue (from INCOME invoices)
        BigDecimal revenue = invoiceRepository.sumAmountByBranchAndTypeAndDateRange(
                branchId, InvoiceType.INCOME, start, end);
        if (revenue == null) revenue = BigDecimal.ZERO;

        // Current period expense (from EXPENSE invoices)
        BigDecimal expense = invoiceRepository.sumAmountByBranchAndTypeAndDateRange(
                branchId, InvoiceType.EXPENSE, start, end);
        if (expense == null) expense = BigDecimal.ZERO;

        // Previous period
        BigDecimal prevRevenue = invoiceRepository.sumAmountByBranchAndTypeAndDateRange(
                branchId, InvoiceType.INCOME, prevStart, prevEnd);
        if (prevRevenue == null) prevRevenue = BigDecimal.ZERO;

        BigDecimal prevExpense = invoiceRepository.sumAmountByBranchAndTypeAndDateRange(
                branchId, InvoiceType.EXPENSE, prevStart, prevEnd);
        if (prevExpense == null) prevExpense = BigDecimal.ZERO;

        // Calculate profit
        BigDecimal profit = revenue.subtract(expense);
        BigDecimal prevProfit = prevRevenue.subtract(prevExpense);

        // Calculate percentage changes
        Double changeRevenuePct = calculatePercentageChange(prevRevenue, revenue);
        Double changeExpensePct = calculatePercentageChange(prevExpense, expense);
        Double changeProfitPct = calculatePercentageChange(prevProfit, profit);

        return ManagerDashboardStatsResponse.FinancialMetrics.builder()
                .revenue(revenue)
                .expense(expense)
                .profit(profit)
                .changeRevenuePct(changeRevenuePct)
                .changeExpensePct(changeExpensePct)
                .changeProfitPct(changeProfitPct)
                .build();
    }

    private ManagerDashboardStatsResponse.TripMetrics calculateTripMetrics(
            Integer branchId, Instant start, Instant end) {

        // Get all trips in the period for this branch
        List<org.example.ptcmssbackend.entity.Trips> trips = tripRepository
                .findByBooking_Branch_IdAndStartTimeBetween(branchId, start, end);

        long completed = trips.stream()
                .filter(t -> t.getStatus() == TripStatus.COMPLETED)
                .count();

        long cancelled = trips.stream()
                .filter(t -> t.getStatus() == TripStatus.CANCELLED)
                .count();

        BigDecimal totalKm = trips.stream()
                .filter(t -> t.getDistance() != null)
                .map(org.example.ptcmssbackend.entity.Trips::getDistance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ManagerDashboardStatsResponse.TripMetrics.builder()
                .completed(completed)
                .cancelled(cancelled)
                .totalKm(totalKm)
                .build();
    }

    private List<ManagerDashboardStatsResponse.DriverPerformance> getTopDrivers(
            Integer branchId, Instant start, Instant end) {

        // Get all trips in the period
        List<org.example.ptcmssbackend.entity.Trips> trips = tripRepository
                .findByBooking_Branch_IdAndStartTimeBetween(branchId, start, end);

        // Group by driver and calculate stats
        java.util.Map<Integer, ManagerDashboardStatsResponse.DriverPerformance> driverStats = new java.util.HashMap<>();

        for (org.example.ptcmssbackend.entity.Trips trip : trips) {
            if (trip.getStatus() != TripStatus.COMPLETED) continue;

            // Get drivers for this trip
            List<org.example.ptcmssbackend.entity.TripDrivers> tripDrivers =
                    tripDriverRepository.findByTrip_Id(trip.getId());

            for (org.example.ptcmssbackend.entity.TripDrivers td : tripDrivers) {
                Integer driverId = td.getDriver().getId();
                String driverName = td.getDriver().getEmployee() != null &&
                        td.getDriver().getEmployee().getUser() != null ?
                        td.getDriver().getEmployee().getUser().getFullName() : "Unknown";

                ManagerDashboardStatsResponse.DriverPerformance perf = driverStats.getOrDefault(driverId,
                        ManagerDashboardStatsResponse.DriverPerformance.builder()
                                .driverId(driverId)
                                .driverName(driverName)
                                .trips(0L)
                                .km(BigDecimal.ZERO)
                                .build());

                perf.setTrips(perf.getTrips() + 1);
                if (trip.getDistance() != null) {
                    perf.setKm(perf.getKm().add(trip.getDistance()));
                }

                driverStats.put(driverId, perf);
            }
        }

        // Sort by trips and return top 4
        return driverStats.values().stream()
                .sorted((a, b) -> Long.compare(b.getTrips(), a.getTrips()))
                .limit(4)
                .toList();
    }

    private List<ManagerDashboardStatsResponse.VehicleEfficiency> getVehicleEfficiency(
            Integer branchId, Instant start, Instant end) {

        // Get all trips in the period
        List<org.example.ptcmssbackend.entity.Trips> trips = tripRepository
                .findByBooking_Branch_IdAndStartTimeBetween(branchId, start, end);

        // Group by vehicle and calculate stats
        java.util.Map<Integer, VehicleStats> vehicleStatsMap = new java.util.HashMap<>();

        for (org.example.ptcmssbackend.entity.Trips trip : trips) {
            if (trip.getStatus() != TripStatus.COMPLETED) continue;

            // Get vehicles for this trip
            List<org.example.ptcmssbackend.entity.TripVehicles> tripVehicles =
                    tripVehicleRepository.findByTrip_Id(trip.getId());

            for (org.example.ptcmssbackend.entity.TripVehicles tv : tripVehicles) {
                Integer vehicleId = tv.getVehicle().getId();
                String licensePlate = tv.getVehicle().getLicensePlate();

                VehicleStats stats = vehicleStatsMap.getOrDefault(vehicleId,
                        new VehicleStats(licensePlate, BigDecimal.ZERO, BigDecimal.ZERO));

                if (trip.getDistance() != null) {
                    stats.totalKm = stats.totalKm.add(trip.getDistance());
                }

                // Get expenses for this trip (fuel, maintenance, etc.)
                BigDecimal tripExpenses = invoiceRepository.sumExpensesByTrip(trip.getId());
                if (tripExpenses != null) {
                    stats.totalCost = stats.totalCost.add(tripExpenses);
                }

                vehicleStatsMap.put(vehicleId, stats);
            }
        }

        // Calculate cost per km and return top 4
        return vehicleStatsMap.entrySet().stream()
                .map(entry -> {
                    VehicleStats stats = entry.getValue();
                    BigDecimal costPerKm = BigDecimal.ZERO;
                    if (stats.totalKm.compareTo(BigDecimal.ZERO) > 0) {
                        costPerKm = stats.totalCost.divide(stats.totalKm, 2, RoundingMode.HALF_UP);
                    }
                    return ManagerDashboardStatsResponse.VehicleEfficiency.builder()
                            .licensePlate(stats.licensePlate)
                            .costPerKm(costPerKm)
                            .totalKm(stats.totalKm)
                            .build();
                })
                .sorted((a, b) -> a.getCostPerKm().compareTo(b.getCostPerKm()))
                .limit(4)
                .toList();
    }

    private Double calculatePercentageChange(BigDecimal oldValue, BigDecimal newValue) {
        if (oldValue.compareTo(BigDecimal.ZERO) == 0) {
            return newValue.compareTo(BigDecimal.ZERO) == 0 ? 0.0 : 100.0;
        }
        BigDecimal change = newValue.subtract(oldValue);
        BigDecimal percentage = change.divide(oldValue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        return percentage.doubleValue();
    }

    // Helper class for vehicle statistics
    private static class VehicleStats {
        String licensePlate;
        BigDecimal totalKm;
        BigDecimal totalCost;

        VehicleStats(String licensePlate, BigDecimal totalKm, BigDecimal totalCost) {
            this.licensePlate = licensePlate;
            this.totalKm = totalKm;
            this.totalCost = totalCost;
        }
    }
}