package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.Vehicle.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.request.Vehicle.CreateMaintenanceRequest;
import org.example.ptcmssbackend.dto.request.Vehicle.VehicleRequest;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleExpenseResponse;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleMaintenanceResponse;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleResponse;
import org.example.ptcmssbackend.dto.response.Vehicle.VehicleTripResponse;
import org.example.ptcmssbackend.entity.Bookings;
import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.enums.VehicleStatus;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.TripVehicleRepository;
import org.example.ptcmssbackend.repository.VehicleCategoryPricingRepository;
import org.example.ptcmssbackend.repository.VehicleRepository;
import org.example.ptcmssbackend.service.VehicleService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;
    private final BranchesRepository branchRepository;
    private final VehicleCategoryPricingRepository categoryRepository;
    private final TripVehicleRepository tripVehicleRepository;
    private final InvoiceRepository invoiceRepository;

    @Override
    public VehicleResponse create(VehicleRequest request) {

        // 1. Validate trùng biển số theo chi nhánh
        boolean exists = vehicleRepository.existsByBranch_IdAndLicensePlateIgnoreCase(
                request.getBranchId(),
                request.getLicensePlate()
        );

        if (exists) {
            throw new RuntimeException("Biển số xe đã tồn tại trong chi nhánh này");
        }

        // 2. Map + save
        Vehicles vehicle = mapToEntity(request);
        vehicleRepository.save(vehicle);
        return mapToResponse(vehicle);
    }


    @Override
    public VehicleResponse update(Integer id, VehicleRequest request) {
        Vehicles vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + id));
        Vehicles updated = updateEntity(vehicle, request);
        vehicleRepository.save(updated);
        return mapToResponse(updated);
    }

    @Override
    public VehicleResponse getById(Integer id) {
        Vehicles vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + id));
        return mapToResponse(vehicle);
    }

    @Override
    public List<VehicleResponse> getAll() {
        return vehicleRepository.findAll()
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<VehicleResponse> search(String licensePlate) {
        return vehicleRepository.findByLicensePlateContainingIgnoreCase(licensePlate)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<VehicleResponse> filter(Integer categoryId, Integer branchId, String status) {
        VehicleStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = parseVehicleStatus(status);
        }
        return vehicleRepository.filterVehicles(categoryId, branchId, statusEnum)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public PageResponse<?> getAllWithPagination(String licensePlate, Integer categoryId, Integer branchId, String status, int page, int size, String sortBy) {
        int pageNo = page > 0 ? page - 1 : 0;
        List<Sort.Order> sorts = new ArrayList<>();

        // Parse sortBy (format: "field:asc" or "field:desc")
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
        } else {
            // Default sort by id DESC
            sorts.add(new Sort.Order(Sort.Direction.DESC, "id"));
        }

        Pageable pageable = PageRequest.of(pageNo, size, Sort.by(sorts));
        VehicleStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = parseVehicleStatus(status);
        }

        Page<Vehicles> vehiclePage;
        if (licensePlate != null && !licensePlate.isBlank()) {
            vehiclePage = vehicleRepository.findByLicensePlateContainingIgnoreCase(licensePlate, pageable);
        } else {
            vehiclePage = vehicleRepository.filterVehiclesWithPagination(categoryId, branchId, statusEnum, licensePlate, pageable);
        }

        List<VehicleResponse> items = vehiclePage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return PageResponse.builder()
                .pageNo(pageNo + 1) // Convert to 1-based
                .pageSize(size)
                .totalElements(vehiclePage.getTotalElements())
                .totalPages(vehiclePage.getTotalPages())
                .items(items)
                .build();
    }

    @Override
    public void delete(Integer id) {
        vehicleRepository.deleteById(id);
    }

    @Override
    public List<VehicleTripResponse> getVehicleTrips(Integer vehicleId) {
        // Verify vehicle exists
        vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + vehicleId));

        return tripVehicleRepository.findAllByVehicleId(vehicleId).stream()
                .map(tv -> VehicleTripResponse.builder()
                        .tripId(tv.getTrip().getId())
                        .bookingId(tv.getTrip().getBooking().getId())
                        .startLocation(tv.getTrip().getStartLocation())
                        .endLocation(tv.getTrip().getEndLocation())
                        .startTime(tv.getTrip().getStartTime())
                        .endTime(tv.getTrip().getEndTime())
                        .status(tv.getTrip().getStatus() != null ? tv.getTrip().getStatus().name() : null)
                        .note(tv.getNote())
                        .assignedAt(tv.getAssignedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<VehicleExpenseResponse> getVehicleExpenses(Integer vehicleId) {
        // Verify vehicle exists
        vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + vehicleId));

        List<Invoices> expenses = invoiceRepository.findExpensesByVehicleId(vehicleId, InvoiceType.EXPENSE);

        return expenses.stream()
                .filter(inv -> inv.getCostType() == null || !inv.getCostType().equals("maintenance"))
                .map(inv -> VehicleExpenseResponse.builder()
                        .invoiceId(inv.getId())
                        .costType(inv.getCostType())
                        .amount(inv.getAmount())
                        .paymentMethod(inv.getPaymentMethod())
                        .paymentStatus(inv.getPaymentStatus() != null ? inv.getPaymentStatus().name() : null)
                        .note(inv.getNote())
                        .invoiceDate(inv.getInvoiceDate())
                        .createdByName(inv.getCreatedBy() != null && inv.getCreatedBy().getUser() != null
                                ? inv.getCreatedBy().getUser().getFullName() : null)
                        .approvedByName(inv.getApprovedBy() != null && inv.getApprovedBy().getUser() != null
                                ? inv.getApprovedBy().getUser().getFullName() : null)
                        .approvedAt(inv.getApprovedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<VehicleMaintenanceResponse> getVehicleMaintenance(Integer vehicleId) {
        // Verify vehicle exists
        vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + vehicleId));

        List<Invoices> maintenance = invoiceRepository.findExpensesByVehicleIdAndCostType(
                vehicleId, InvoiceType.EXPENSE, "maintenance");

        return maintenance.stream()
                .map(inv -> VehicleMaintenanceResponse.builder()
                        .invoiceId(inv.getId())
                        .amount(inv.getAmount())
                        .paymentMethod(inv.getPaymentMethod())
                        .paymentStatus(inv.getPaymentStatus() != null ? inv.getPaymentStatus().name() : null)
                        .note(inv.getNote())
                        .invoiceDate(inv.getInvoiceDate())
                        .createdByName(inv.getCreatedBy() != null && inv.getCreatedBy().getUser() != null
                                ? inv.getCreatedBy().getUser().getFullName() : null)
                        .approvedByName(inv.getApprovedBy() != null && inv.getApprovedBy().getUser() != null
                                ? inv.getApprovedBy().getUser().getFullName() : null)
                        .approvedAt(inv.getApprovedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public VehicleMaintenanceResponse createMaintenance(Integer vehicleId, CreateMaintenanceRequest request) {
        Vehicles vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + vehicleId));

        // Tìm booking gần nhất của vehicle (nếu có)
        Bookings latestBooking = tripVehicleRepository.findAllByVehicleId(vehicleId).stream()
                .findFirst()
                .map(tv -> tv.getTrip().getBooking())
                .orElse(null);

        // Tạo invoice cho maintenance
        Invoices invoice = new Invoices();
        invoice.setBranch(vehicle.getBranch());
        invoice.setBooking(latestBooking);
        invoice.setType(InvoiceType.EXPENSE);
        invoice.setCostType("maintenance");
        invoice.setAmount(request.getAmount());
        invoice.setPaymentMethod(request.getPaymentMethod());
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setNote(request.getNote() != null ? request.getNote() :
                "Bảo trì xe " + vehicle.getLicensePlate());

        Invoices saved = invoiceRepository.save(invoice);

        return VehicleMaintenanceResponse.builder()
                .invoiceId(saved.getId())
                .amount(saved.getAmount())
                .paymentMethod(saved.getPaymentMethod())
                .paymentStatus(saved.getPaymentStatus() != null ? saved.getPaymentStatus().name() : null)
                .note(saved.getNote())
                .invoiceDate(saved.getInvoiceDate())
                .createdByName(null) // TODO: Lấy từ authentication context
                .approvedByName(null)
                .approvedAt(null)
                .build();
    }

    @Override
    public VehicleExpenseResponse createExpense(Integer vehicleId, CreateExpenseRequest request) {
        Vehicles vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xe ID=" + vehicleId));

        // Tìm booking (từ request hoặc booking gần nhất)
        Bookings booking = null;
        if (request.getBookingId() != null) {
            // TODO: Cần BookingRepository để tìm booking
            // booking = bookingRepository.findById(request.getBookingId()).orElse(null);
        } else {
            // Tìm booking gần nhất của vehicle
            booking = tripVehicleRepository.findAllByVehicleId(vehicleId).stream()
                    .findFirst()
                    .map(tv -> tv.getTrip().getBooking())
                    .orElse(null);
        }

        // Tạo invoice cho expense
        Invoices invoice = new Invoices();
        invoice.setBranch(vehicle.getBranch());
        invoice.setBooking(booking);
        invoice.setType(InvoiceType.EXPENSE);
        invoice.setCostType(request.getCostType());
        invoice.setAmount(request.getAmount());
        invoice.setPaymentMethod(request.getPaymentMethod());
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setNote(request.getNote() != null ? request.getNote() :
                "Chi phí " + request.getCostType() + " cho xe " + vehicle.getLicensePlate());

        Invoices saved = invoiceRepository.save(invoice);

        return VehicleExpenseResponse.builder()
                .invoiceId(saved.getId())
                .costType(saved.getCostType())
                .amount(saved.getAmount())
                .paymentMethod(saved.getPaymentMethod())
                .paymentStatus(saved.getPaymentStatus() != null ? saved.getPaymentStatus().name() : null)
                .note(saved.getNote())
                .invoiceDate(saved.getInvoiceDate())
                .createdByName(null) // TODO: Lấy từ authentication context
                .approvedByName(null)
                .approvedAt(null)
                .build();
    }

    @Override
    public List<VehicleResponse> getVehiclesByBranch(Integer branchId) {
        var branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh ID = " + branchId));

        return vehicleRepository.findAllByBranchId(branchId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // -------------------- Private helpers --------------------
    private Vehicles mapToEntity(VehicleRequest req) {
        Vehicles v = new Vehicles();
        v.setLicensePlate(req.getLicensePlate());
        v.setModel(req.getModel());
        v.setBrand(req.getBrand());
        v.setCapacity(req.getCapacity());
        v.setProductionYear(req.getProductionYear());
        v.setRegistrationDate(req.getRegistrationDate());
        v.setInspectionExpiry(req.getInspectionExpiry());
        v.setInsuranceExpiry(req.getInsuranceExpiry());
        v.setOdometer(req.getOdometer());
        v.setStatus(req.getStatus() != null ?
                parseVehicleStatus(req.getStatus()) :
                VehicleStatus.AVAILABLE);
        v.setBranch(branchRepository.findById(req.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found")));
        v.setCategory(categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found")));
        return v;
    }

    private Vehicles updateEntity(Vehicles existing, VehicleRequest req) {
        existing.setLicensePlate(req.getLicensePlate());
        existing.setModel(req.getModel());
        existing.setBrand(req.getBrand());
        existing.setCapacity(req.getCapacity());
        existing.setProductionYear(req.getProductionYear());
        existing.setRegistrationDate(req.getRegistrationDate());
        existing.setInspectionExpiry(req.getInspectionExpiry());
        existing.setInsuranceExpiry(req.getInsuranceExpiry());
        existing.setOdometer(req.getOdometer());
        existing.setStatus(req.getStatus() != null ?
                parseVehicleStatus(req.getStatus()) :
                existing.getStatus());
        existing.setBranch(branchRepository.findById(req.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found")));
        existing.setCategory(categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found")));
        return existing;
    }

    private VehicleResponse mapToResponse(Vehicles v) {
        return VehicleResponse.builder()
                .id(v.getId())
                .licensePlate(v.getLicensePlate())
                .model(v.getModel())
                .brand(v.getBrand())
                .capacity(v.getCapacity())
                .productionYear(v.getProductionYear())
                .registrationDate(v.getRegistrationDate())
                .inspectionExpiry(v.getInspectionExpiry())
                .insuranceExpiry(v.getInsuranceExpiry())
                .odometer(v.getOdometer())
                .status(v.getStatus().name())
                .branchName(v.getBranch().getBranchName())
                .branchId(v.getBranch().getId())
                .categoryName(v.getCategory().getCategoryName())
                .categoryId(v.getCategory().getId())
                .build();
    }

    /**
     * Parse string status to VehicleStatus enum
     * Supports: "Available", "InUse", "Maintenance", "Inactive"
     * Also supports: "AVAILABLE", "IN_USE", etc. (converts to proper format)
     */
    private VehicleStatus parseVehicleStatus(String status) {
        if (status == null || status.isBlank()) {
            return VehicleStatus.AVAILABLE;
        }
        // Normalize: remove underscores, capitalize first letter of each word
        String normalized = status.trim();
        // Handle common formats
        if (normalized.equalsIgnoreCase("AVAILABLE") || normalized.equalsIgnoreCase("available")) {
            return VehicleStatus.AVAILABLE;
        } else if (normalized.equalsIgnoreCase("IN_USE") || normalized.equalsIgnoreCase("INUSE") || normalized.equalsIgnoreCase("inuse") || normalized.equalsIgnoreCase("InUse")) {
            return VehicleStatus.INUSE;
        } else if (normalized.equalsIgnoreCase("MAINTENANCE") || normalized.equalsIgnoreCase("maintenance")) {
            return VehicleStatus.MAINTENANCE;
        } else if (normalized.equalsIgnoreCase("INACTIVE") || normalized.equalsIgnoreCase("inactive")) {
            return VehicleStatus.INACTIVE;
        }
        // Try direct match (case-sensitive)
        try {
            return VehicleStatus.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            // Default to Available if unknown
            return VehicleStatus.AVAILABLE;
        }
    }
}
