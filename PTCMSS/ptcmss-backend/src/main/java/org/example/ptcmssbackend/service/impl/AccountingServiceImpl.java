package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Accounting.ExpenseReportRequest;
import org.example.ptcmssbackend.dto.request.Accounting.RevenueReportRequest;
import org.example.ptcmssbackend.dto.response.Accounting.AccountingDashboardResponse;
import org.example.ptcmssbackend.dto.response.Accounting.ExpenseReportResponse;
import org.example.ptcmssbackend.dto.response.Accounting.RevenueReportResponse;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse;
import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.entity.ExpenseRequests;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.repository.ExpenseRequestRepository;
import org.example.ptcmssbackend.service.AccountingService;
import org.example.ptcmssbackend.service.InvoiceService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountingServiceImpl implements AccountingService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final ExpenseRequestRepository expenseRequestRepository;
    private final InvoiceService invoiceService;

    @Override
    public AccountingDashboardResponse getDashboard(Integer branchId, String period) {
        log.info("[AccountingService] Getting dashboard for branch: {}, period: {}", branchId, period);

        LocalDate[] dateRange = getDateRange(period);
        LocalDate startDate = dateRange[0];
        LocalDate endDate = dateRange[1];

        AccountingDashboardResponse response = new AccountingDashboardResponse();

        // Calculate statistics
        response.setTotalRevenue(getTotalRevenue(branchId, startDate, endDate));
        response.setTotalExpense(getTotalExpense(branchId, startDate, endDate));
        response.setNetProfit(response.getTotalRevenue().subtract(response.getTotalExpense()));
        response.setArBalance(getARBalance(branchId));
        response.setApBalance(getAPBalance(branchId));
        response.setInvoicesDueIn7Days(getInvoicesDueIn7Days(branchId));
        response.setOverdueInvoices(getOverdueInvoices(branchId));
        response.setCollectionRate(getCollectionRate(branchId, startDate, endDate));
        response.setExpenseToRevenueRatio(getExpenseToRevenueRatio(branchId, startDate, endDate));

        // Chart data
        response.setRevenueChart(getRevenueChartData(branchId, startDate, endDate));
        response.setExpenseChart(getExpenseChartData(branchId, startDate, endDate));
        response.setExpenseByCategory(getExpenseByCategory(branchId, startDate, endDate));

        // Pending approvals
        response.setPendingApprovals(getPendingApprovals(branchId));

        // Top customers
        response.setTopCustomers(getTopCustomers(branchId, startDate, endDate));

        return response;
    }

    @Override
    public RevenueReportResponse getRevenueReport(RevenueReportRequest request) {
        log.info("[AccountingService] Getting revenue report: {}", request);

        LocalDate[] dateRange = getDateRangeFromRequest(request);
        LocalDate startDate = dateRange[0];
        LocalDate endDate = dateRange[1];

        RevenueReportResponse response = new RevenueReportResponse();

        // Get invoices
        List<Invoices> invoices = invoiceRepository.findInvoicesWithFilters(
                request.getBranchId(),
                InvoiceType.INCOME,
                InvoiceStatus.ACTIVE,
                startDate.atStartOfDay(ZoneId.systemDefault()).toInstant(),
                endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant(),
                request.getCustomerId(),
                null
        );

        // Calculate totals
        BigDecimal totalRevenue = invoices.stream()
                .map(Invoices::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPaid = invoices.stream()
                .filter(inv -> inv.getPaymentStatus() == PaymentStatus.PAID)
                .map(inv -> paymentHistoryRepository.sumConfirmedByInvoiceId(inv.getId()))
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalBalance = totalRevenue.subtract(totalPaid);

        response.setTotalRevenue(totalRevenue);
        response.setTotalPaid(totalPaid);
        response.setTotalBalance(totalBalance);
        response.setTotalInvoices(invoices.size());

        // Chart data
        response.setRevenueByDate(getRevenueByDate(invoices, startDate, endDate));
        response.setComparisonData(getComparisonData(request.getBranchId(), startDate, endDate));

        // Top customers
        response.setTopCustomers(getTopCustomersForReport(invoices));

        // Invoice list - convert to InvoiceListResponse
        List<InvoiceListResponse> invoiceList = invoices.stream()
                .map(this::mapInvoiceToListResponse)
                .collect(Collectors.toList());
        response.setInvoices(invoiceList);

        return response;
    }

    @Override
    public ExpenseReportResponse getExpenseReport(ExpenseReportRequest request) {
        log.info("[AccountingService] Getting expense report: {}", request);

        LocalDate[] dateRange = getDateRangeFromRequest(request);
        LocalDate startDate = dateRange[0];
        LocalDate endDate = dateRange[1];

        ExpenseReportResponse response = new ExpenseReportResponse();

        // Get expense invoices
        List<Invoices> expenses = invoiceRepository.findInvoicesWithFilters(
                request.getBranchId(),
                InvoiceType.EXPENSE,
                InvoiceStatus.ACTIVE,
                startDate.atStartOfDay(ZoneId.systemDefault()).toInstant(),
                endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant(),
                null,
                null
        );

        // Filter by expense type if provided
        if (request.getExpenseType() != null) {
            expenses = expenses.stream()
                    .filter(e -> request.getExpenseType().equals(e.getCostType()))
                    .collect(Collectors.toList());
        }

        // Get expense requests from drivers/coordinators (APPROVED only)
        List<ExpenseRequests> expenseRequests;
        if (request.getBranchId() != null) {
            expenseRequests = expenseRequestRepository.findByStatusAndBranch_Id(
                    ExpenseRequestStatus.APPROVED, request.getBranchId());
        } else {
            expenseRequests = expenseRequestRepository.findByStatus(ExpenseRequestStatus.APPROVED);
        }

        // Filter expense requests by date range
        Instant startInstant = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endInstant = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        expenseRequests = expenseRequests.stream()
                .filter(req -> req.getCreatedAt() != null
                        && !req.getCreatedAt().isBefore(startInstant)
                        && !req.getCreatedAt().isAfter(endInstant))
                .collect(Collectors.toList());

        // Filter by expense type if provided
        if (request.getExpenseType() != null) {
            expenseRequests = expenseRequests.stream()
                    .filter(e -> request.getExpenseType().equals(e.getType()))
                    .collect(Collectors.toList());
        }

        // Filter by vehicle if provided
        if (request.getVehicleId() != null) {
            expenseRequests = expenseRequests.stream()
                    .filter(e -> e.getVehicle() != null && request.getVehicleId().equals(e.getVehicle().getId()))
                    .collect(Collectors.toList());
        }

        // Calculate total expense (invoices + expense requests)
        BigDecimal invoiceExpense = expenses.stream()
                .map(Invoices::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal requestExpense = expenseRequests.stream()
                .map(ExpenseRequests::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalExpense = invoiceExpense.add(requestExpense);

        response.setTotalExpense(totalExpense);
        response.setTotalExpenseRequests(expenses.size() + expenseRequests.size());

        // Combine expenses and requests for category breakdown
        Map<String, BigDecimal> expenseByCategory = new HashMap<>();

        // Add invoice expenses
        expenses.forEach(inv -> {
            String category = inv.getCostType() != null ? inv.getCostType() : "OTHER";
            expenseByCategory.merge(category, inv.getAmount(), BigDecimal::add);
        });

        // Add expense requests
        expenseRequests.forEach(req -> {
            String category = req.getType() != null ? req.getType() : "OTHER";
            expenseByCategory.merge(category, req.getAmount(), BigDecimal::add);
        });

        response.setExpenseByCategory(expenseByCategory);
        response.setExpenseByDate(getExpenseByDateCombined(expenses, expenseRequests, startDate, endDate));
        response.setExpenseByCategoryDonut(getExpenseByCategoryDonutCombined(expenseByCategory));

        // Top items (combined)
        response.setTopExpenseItems(getTopExpenseItemsCombined(expenseByCategory));

        // Map expenses list for table display (invoices + requests)
        List<ExpenseReportResponse.ExpenseItem> expenseItems = new ArrayList<>();

        // Add invoice expenses
        expenseItems.addAll(expenses.stream()
                .map(inv -> {
                    ExpenseReportResponse.ExpenseItem item = new ExpenseReportResponse.ExpenseItem();
                    item.setInvoiceId(inv.getId());
                    item.setInvoiceDate(inv.getInvoiceDate() != null
                            ? inv.getInvoiceDate().toString()
                            : null);
                    item.setBranchName(inv.getBranch() != null
                            ? inv.getBranch().getBranchName()
                            : null);
                    item.setVehicleLicensePlate(null);
                    item.setCostType(inv.getCostType());
                    item.setAmount(inv.getAmount());
                    item.setNote(inv.getNote());
                    return item;
                })
                .collect(Collectors.toList()));

        // Add expense requests from drivers/coordinators
        expenseItems.addAll(expenseRequests.stream()
                .map(req -> {
                    ExpenseReportResponse.ExpenseItem item = new ExpenseReportResponse.ExpenseItem();
                    item.setInvoiceId(req.getId()); // Use expense request ID
                    item.setInvoiceDate(req.getCreatedAt() != null
                            ? req.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate().toString()
                            : null);
                    item.setBranchName(req.getBranch() != null
                            ? req.getBranch().getBranchName()
                            : null);
                    item.setVehicleLicensePlate(req.getVehicle() != null
                            ? req.getVehicle().getLicensePlate()
                            : null);
                    item.setCostType(req.getType());
                    item.setAmount(req.getAmount());
                    item.setNote(req.getNote());
                    return item;
                })
                .collect(Collectors.toList()));

        response.setExpenses(expenseItems);

        return response;
    }

    // Helper method for combined expense by date
    private List<ExpenseReportResponse.ChartDataPoint> getExpenseByDateCombined(
            List<Invoices> invoices, List<ExpenseRequests> requests, LocalDate startDate, LocalDate endDate) {
        Map<String, BigDecimal> expenseByDate = new HashMap<>();

        // Add invoice expenses
        invoices.stream()
                .filter(inv -> inv.getInvoiceDate() != null)
                .forEach(inv -> {
                    String dateKey = inv.getInvoiceDate().atZone(ZoneId.systemDefault()).toLocalDate().toString();
                    expenseByDate.merge(dateKey, inv.getAmount(), BigDecimal::add);
                });

        // Add expense requests
        requests.stream()
                .filter(req -> req.getCreatedAt() != null)
                .forEach(req -> {
                    String dateKey = req.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate().toString();
                    expenseByDate.merge(dateKey, req.getAmount(), BigDecimal::add);
                });

        List<ExpenseReportResponse.ChartDataPoint> points = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            ExpenseReportResponse.ChartDataPoint point = new ExpenseReportResponse.ChartDataPoint();
            point.setDate(current.toString());
            point.setValue(expenseByDate.getOrDefault(current.toString(), BigDecimal.ZERO));
            points.add(point);
            current = current.plusDays(1);
        }
        return points;
    }

    // Helper method for combined donut chart
    private List<ExpenseReportResponse.DonutChartData> getExpenseByCategoryDonutCombined(
            Map<String, BigDecimal> byCategory) {
        BigDecimal total = byCategory.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return byCategory.entrySet().stream()
                .map(entry -> {
                    ExpenseReportResponse.DonutChartData data = new ExpenseReportResponse.DonutChartData();
                    data.setCategory(entry.getKey());
                    data.setAmount(entry.getValue());
                    if (total.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal percentage = entry.getValue()
                                .divide(total, 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100));
                        data.setPercentage(percentage);
                    }
                    return data;
                })
                .collect(Collectors.toList());
    }

    // Helper method for combined top expense items
    private List<ExpenseReportResponse.TopExpenseItem> getTopExpenseItemsCombined(
            Map<String, BigDecimal> byCategory) {
        return byCategory.entrySet().stream()
                .map(entry -> {
                    ExpenseReportResponse.TopExpenseItem item = new ExpenseReportResponse.TopExpenseItem();
                    item.setExpenseType(entry.getKey());
                    item.setTotalAmount(entry.getValue());
                    item.setCount(1); // We don't track count separately in the map
                    return item;
                })
                .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
                .limit(5)
                .collect(Collectors.toList());
    }

    @Override
    public BigDecimal getTotalRevenue(Integer branchId, LocalDate startDate, LocalDate endDate) {
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        return invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.INCOME, start, end);
    }

    @Override
    public BigDecimal getTotalExpense(Integer branchId, LocalDate startDate, LocalDate endDate) {
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        return invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.EXPENSE, start, end);
    }

    @Override
    public BigDecimal getARBalance(Integer branchId) {
        List<Invoices> unpaidInvoices = invoiceRepository.findUnpaidInvoices(branchId);
        return unpaidInvoices.stream()
                .map(inv -> invoiceService.calculateBalance(inv.getId()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public BigDecimal getAPBalance(Integer branchId) {
        // Accounts Payable - not implemented yet
        return BigDecimal.ZERO;
    }

    @Override
    public int getInvoicesDueIn7Days(Integer branchId) {
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysLater = today.plusDays(7);
        List<Invoices> invoices = invoiceRepository.findInvoicesDueInRange(today, sevenDaysLater, branchId);
        return invoices.size();
    }

    @Override
    public int getOverdueInvoices(Integer branchId) {
        List<Invoices> overdue = invoiceRepository.findOverdueInvoices(branchId);
        return overdue.size();
    }

    @Override
    public BigDecimal getCollectionRate(Integer branchId, LocalDate startDate, LocalDate endDate) {
        BigDecimal totalRevenue = getTotalRevenue(branchId, startDate, endDate);
        if (totalRevenue.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        List<Invoices> invoices = invoiceRepository.findInvoicesWithFilters(
                branchId, InvoiceType.INCOME, InvoiceStatus.ACTIVE,
                startDate.atStartOfDay(ZoneId.systemDefault()).toInstant(),
                endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant(),
                null, PaymentStatus.PAID
        );

        BigDecimal paidAmount = invoices.stream()
                .map(inv -> paymentHistoryRepository.sumConfirmedByInvoiceId(inv.getId()))
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return paidAmount.divide(totalRevenue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    @Override
    public BigDecimal getExpenseToRevenueRatio(Integer branchId, LocalDate startDate, LocalDate endDate) {
        BigDecimal revenue = getTotalRevenue(branchId, startDate, endDate);
        if (revenue.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal expense = getTotalExpense(branchId, startDate, endDate);
        return expense.divide(revenue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    // Helper methods
    private LocalDate[] getDateRange(String period) {
        LocalDate today = LocalDate.now();
        LocalDate startDate, endDate;

        switch (period != null ? period.toUpperCase() : "THIS_MONTH") {
            case "TODAY":
                startDate = today;
                endDate = today;
                break;
            case "THIS_WEEK":
                startDate = today.minusDays(today.getDayOfWeek().getValue() - 1);
                endDate = today;
                break;
            case "THIS_MONTH":
                startDate = today.withDayOfMonth(1);
                endDate = today;
                break;
            case "THIS_QUARTER":
                int quarter = (today.getMonthValue() - 1) / 3;
                startDate = today.withMonth(quarter * 3 + 1).withDayOfMonth(1);
                endDate = today;
                break;
            case "YTD":
                startDate = today.withDayOfYear(1);
                endDate = today;
                break;
            default:
                startDate = today.withDayOfMonth(1);
                endDate = today;
        }

        return new LocalDate[]{startDate, endDate};
    }

    private LocalDate[] getDateRangeFromRequest(RevenueReportRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null) {
            return new LocalDate[]{request.getStartDate(), request.getEndDate()};
        }
        return getDateRange(request.getPeriod());
    }

    private LocalDate[] getDateRangeFromRequest(ExpenseReportRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null) {
            return new LocalDate[]{request.getStartDate(), request.getEndDate()};
        }
        return getDateRange("THIS_MONTH");
    }

    private List<AccountingDashboardResponse.ChartDataPoint> getRevenueChartData(
            Integer branchId, LocalDate startDate, LocalDate endDate) {
        // Simplified - group by day
        List<AccountingDashboardResponse.ChartDataPoint> points = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            BigDecimal revenue = getTotalRevenue(branchId, current, current);
            AccountingDashboardResponse.ChartDataPoint point = new AccountingDashboardResponse.ChartDataPoint();
            point.setDate(current.toString());
            point.setValue(revenue);
            points.add(point);
            current = current.plusDays(1);
        }
        return points;
    }

    private List<AccountingDashboardResponse.ChartDataPoint> getExpenseChartData(
            Integer branchId, LocalDate startDate, LocalDate endDate) {
        List<AccountingDashboardResponse.ChartDataPoint> points = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            BigDecimal expense = getTotalExpense(branchId, current, current);
            AccountingDashboardResponse.ChartDataPoint point = new AccountingDashboardResponse.ChartDataPoint();
            point.setDate(current.toString());
            point.setValue(expense);
            points.add(point);
            current = current.plusDays(1);
        }
        return points;
    }

    private Map<String, BigDecimal> getExpenseByCategory(Integer branchId, LocalDate startDate, LocalDate endDate) {
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        List<Invoices> expenses = invoiceRepository.findInvoicesWithFilters(
                branchId, InvoiceType.EXPENSE, InvoiceStatus.ACTIVE, start, end, null, null);

        return expenses.stream()
                .filter(e -> e.getCostType() != null)
                .collect(Collectors.groupingBy(
                        Invoices::getCostType,
                        Collectors.reducing(BigDecimal.ZERO, Invoices::getAmount, BigDecimal::add)
                ));
    }

    private List<AccountingDashboardResponse.PendingApprovalItem> getPendingApprovals(Integer branchId) {
        // Get invoices with payment status UNPAID that need approval
        List<Invoices> pending = invoiceRepository.findInvoicesWithFilters(
                branchId, null, InvoiceStatus.ACTIVE, null, null, null, PaymentStatus.UNPAID);

        return pending.stream()
                .limit(10)
                .map(inv -> {
                    AccountingDashboardResponse.PendingApprovalItem item =
                            new AccountingDashboardResponse.PendingApprovalItem();
                    item.setInvoiceId(inv.getId());
                    item.setInvoiceNumber(inv.getInvoiceNumber());
                    item.setType(inv.getType().toString());
                    item.setCustomerName(inv.getCustomer() != null ? inv.getCustomer().getFullName() : null);
                    item.setAmount(inv.getAmount());
                    item.setCreatedByName(inv.getCreatedBy() != null
                            ? (inv.getCreatedBy().getUser() != null ? inv.getCreatedBy().getUser().getFullName() : null)
                            : null);
                    item.setCreatedAt(inv.getCreatedAt() != null ? inv.getCreatedAt().toString() : null);
                    return item;
                })
                .collect(Collectors.toList());
    }

    private List<AccountingDashboardResponse.TopCustomer> getTopCustomers(
            Integer branchId, LocalDate startDate, LocalDate endDate) {
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        List<Invoices> invoices = invoiceRepository.findInvoicesWithFilters(
                branchId, InvoiceType.INCOME, InvoiceStatus.ACTIVE, start, end, null, null);

        Map<Integer, AccountingDashboardResponse.TopCustomer> customerMap = new HashMap<>();
        for (Invoices inv : invoices) {
            if (inv.getCustomer() == null) continue;
            Integer customerId = inv.getCustomer().getId();
            customerMap.computeIfAbsent(customerId, id -> {
                AccountingDashboardResponse.TopCustomer customer =
                        new AccountingDashboardResponse.TopCustomer();
                customer.setCustomerId(id);
                customer.setCustomerName(inv.getCustomer().getFullName());
                customer.setTotalRevenue(BigDecimal.ZERO);
                customer.setInvoiceCount(0);
                return customer;
            });
            AccountingDashboardResponse.TopCustomer customer = customerMap.get(customerId);
            customer.setTotalRevenue(customer.getTotalRevenue().add(inv.getAmount()));
            customer.setInvoiceCount(customer.getInvoiceCount() + 1);
        }

        return customerMap.values().stream()
                .sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
                .limit(5)
                .collect(Collectors.toList());
    }

    private List<RevenueReportResponse.ChartDataPoint> getRevenueByDate(
            List<Invoices> invoices, LocalDate startDate, LocalDate endDate) {
        Map<String, BigDecimal> revenueByDate = invoices.stream()
                .filter(inv -> inv.getInvoiceDate() != null)
                .collect(Collectors.groupingBy(
                        inv -> inv.getInvoiceDate().atZone(ZoneId.systemDefault()).toLocalDate().toString(),
                        Collectors.reducing(BigDecimal.ZERO, Invoices::getAmount, BigDecimal::add)
                ));

        List<RevenueReportResponse.ChartDataPoint> points = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            RevenueReportResponse.ChartDataPoint point = new RevenueReportResponse.ChartDataPoint();
            point.setDate(current.toString());
            point.setValue(revenueByDate.getOrDefault(current.toString(), BigDecimal.ZERO));
            points.add(point);
            current = current.plusDays(1);
        }
        return points;
    }

    private List<RevenueReportResponse.ChartDataPoint> getComparisonData(
            Integer branchId, LocalDate startDate, LocalDate endDate) {
        if (branchId == null) {
            return new ArrayList<>();
        }
        // MoM comparison - get previous month
        LocalDate prevStart = startDate.minusMonths(1);
        LocalDate prevEnd = endDate.minusMonths(1);

        BigDecimal currentRevenue = getTotalRevenue(branchId, startDate, endDate);
        BigDecimal previousRevenue = getTotalRevenue(branchId, prevStart, prevEnd);

        RevenueReportResponse.ChartDataPoint point = new RevenueReportResponse.ChartDataPoint();
        point.setDate("COMPARISON");
        point.setValue(currentRevenue);
        point.setPreviousValue(previousRevenue);
        if (previousRevenue.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal change = currentRevenue.subtract(previousRevenue)
                    .divide(previousRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            point.setChangePercent(change);
        }

        return Collections.singletonList(point);
    }

    private List<RevenueReportResponse.TopCustomer> getTopCustomersForReport(List<Invoices> invoices) {
        Map<Integer, RevenueReportResponse.TopCustomer> customerMap = new HashMap<>();
        for (Invoices inv : invoices) {
            if (inv.getCustomer() == null) continue;
            Integer customerId = inv.getCustomer().getId();
            customerMap.computeIfAbsent(customerId, id -> {
                RevenueReportResponse.TopCustomer customer = new RevenueReportResponse.TopCustomer();
                customer.setCustomerId(id);
                customer.setCustomerName(inv.getCustomer().getFullName());
                customer.setTotalRevenue(BigDecimal.ZERO);
                customer.setInvoiceCount(0);
                return customer;
            });
            RevenueReportResponse.TopCustomer customer = customerMap.get(customerId);
            customer.setTotalRevenue(customer.getTotalRevenue().add(inv.getAmount()));
            customer.setInvoiceCount(customer.getInvoiceCount() + 1);
        }

        return customerMap.values().stream()
                .peek(c -> c.setAverageInvoiceAmount(
                        c.getTotalRevenue().divide(BigDecimal.valueOf(c.getInvoiceCount()), 2, RoundingMode.HALF_UP)))
                .sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
                .limit(5)
                .collect(Collectors.toList());
    }

    private Map<String, BigDecimal> getExpenseByCategoryMap(List<Invoices> expenses) {
        return expenses.stream()
                .filter(e -> e.getCostType() != null)
                .collect(Collectors.groupingBy(
                        Invoices::getCostType,
                        Collectors.reducing(BigDecimal.ZERO, Invoices::getAmount, BigDecimal::add)
                ));
    }

    private List<ExpenseReportResponse.ChartDataPoint> getExpenseByDate(
            List<Invoices> expenses, LocalDate startDate, LocalDate endDate) {
        Map<String, BigDecimal> expenseByDate = expenses.stream()
                .filter(e -> e.getInvoiceDate() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getInvoiceDate().atZone(ZoneId.systemDefault()).toLocalDate().toString(),
                        Collectors.reducing(BigDecimal.ZERO, Invoices::getAmount, BigDecimal::add)
                ));

        List<ExpenseReportResponse.ChartDataPoint> points = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            ExpenseReportResponse.ChartDataPoint point = new ExpenseReportResponse.ChartDataPoint();
            point.setDate(current.toString());
            point.setValue(expenseByDate.getOrDefault(current.toString(), BigDecimal.ZERO));
            points.add(point);
            current = current.plusDays(1);
        }
        return points;
    }

    private List<ExpenseReportResponse.DonutChartData> getExpenseByCategoryDonut(List<Invoices> expenses) {
        Map<String, BigDecimal> byCategory = getExpenseByCategoryMap(expenses);
        BigDecimal total = byCategory.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return byCategory.entrySet().stream()
                .map(entry -> {
                    ExpenseReportResponse.DonutChartData data = new ExpenseReportResponse.DonutChartData();
                    data.setCategory(entry.getKey());
                    data.setAmount(entry.getValue());
                    if (total.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal percentage = entry.getValue()
                                .divide(total, 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100));
                        data.setPercentage(percentage);
                    }
                    return data;
                })
                .collect(Collectors.toList());
    }

    private List<ExpenseReportResponse.TopExpenseItem> getTopExpenseItems(List<Invoices> expenses) {
        Map<String, ExpenseReportResponse.TopExpenseItem> itemMap = new HashMap<>();
        for (Invoices exp : expenses) {
            String costType = exp.getCostType() != null ? exp.getCostType() : "OTHER";
            itemMap.computeIfAbsent(costType, type -> {
                ExpenseReportResponse.TopExpenseItem item = new ExpenseReportResponse.TopExpenseItem();
                item.setExpenseType(type);
                item.setTotalAmount(BigDecimal.ZERO);
                item.setCount(0);
                return item;
            });
            ExpenseReportResponse.TopExpenseItem item = itemMap.get(costType);
            item.setTotalAmount(item.getTotalAmount().add(exp.getAmount()));
            item.setCount(item.getCount() + 1);
        }

        return itemMap.values().stream()
                .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
                .limit(5)
                .collect(Collectors.toList());
    }

    private InvoiceListResponse mapInvoiceToListResponse(Invoices invoice) {
        InvoiceListResponse response = new InvoiceListResponse();
        response.setInvoiceId(invoice.getId());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        if (invoice.getBranch() != null) {
            response.setBranchId(invoice.getBranch().getId());
            response.setBranchName(invoice.getBranch().getBranchName());
        }
        if (invoice.getCustomer() != null) {
            response.setCustomerId(invoice.getCustomer().getId());
            response.setCustomerName(invoice.getCustomer().getFullName());
        }
        if (invoice.getBooking() != null) {
            response.setBookingId(invoice.getBooking().getId());
        }
        response.setType(invoice.getType() != null ? invoice.getType().toString() : null);
        response.setAmount(invoice.getAmount());
        response.setDueDate(invoice.getDueDate());
        response.setPaymentStatus(invoice.getPaymentStatus() != null ? invoice.getPaymentStatus().toString() : null);
        response.setStatus(invoice.getStatus() != null ? invoice.getStatus().toString() : null);
        response.setInvoiceDate(invoice.getInvoiceDate());

        // Calculate paid amount and balance (only CONFIRMED payments)
        BigDecimal paidAmount = paymentHistoryRepository.sumConfirmedByInvoiceId(invoice.getId());
        response.setPaidAmount(paidAmount != null ? paidAmount : BigDecimal.ZERO);
        response.setBalance(invoiceService.calculateBalance(invoice.getId()));

        // Calculate days overdue
        if (invoice.getDueDate() != null && invoice.getPaymentStatus() != PaymentStatus.PAID) {
            LocalDate today = LocalDate.now();
            if (invoice.getDueDate().isBefore(today)) {
                response.setDaysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today));
            }
        }

        return response;
    }

    private InvoiceListResponse convertToInvoiceListResponse(
            org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse invoiceResponse) {
        InvoiceListResponse response = new InvoiceListResponse();
        response.setInvoiceId(invoiceResponse.getInvoiceId());
        response.setInvoiceNumber(invoiceResponse.getInvoiceNumber());
        response.setBranchId(invoiceResponse.getBranchId());
        response.setBranchName(invoiceResponse.getBranchName());
        response.setCustomerId(invoiceResponse.getCustomerId());
        response.setCustomerName(invoiceResponse.getCustomerName());
        response.setBookingId(invoiceResponse.getBookingId());
        response.setType(invoiceResponse.getType());
        response.setAmount(invoiceResponse.getAmount());
        response.setPaidAmount(invoiceResponse.getPaidAmount());
        response.setBalance(invoiceResponse.getBalance());
        response.setDueDate(invoiceResponse.getDueDate());
        response.setPaymentStatus(invoiceResponse.getPaymentStatus());
        response.setStatus(invoiceResponse.getStatus());
        response.setInvoiceDate(invoiceResponse.getInvoiceDate());
        response.setDaysOverdue(invoiceResponse.getDaysOverdue());
        return response;
    }
}

