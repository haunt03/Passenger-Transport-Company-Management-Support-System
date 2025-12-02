package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.expense.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.response.expense.ExpenseRequestResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.ExpenseRequests;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.ExpenseRequestRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.repository.VehicleRepository;
import org.example.ptcmssbackend.service.ExpenseRequestService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseRequestServiceImpl implements ExpenseRequestService {

    private final ExpenseRequestRepository expenseRequestRepository;
    private final BranchesRepository branchesRepository;
    private final VehicleRepository vehicleRepository;
    private final UsersRepository usersRepository;
    @Override
    @Transactional
    public ExpenseRequestResponse createExpenseRequest(CreateExpenseRequest request) {
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi nhánh: " + request.getBranchId()));

        Vehicles vehicle = null;
        if (request.getVehicleId() != null) {
            vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy xe: " + request.getVehicleId()));
        }

        Users requester = null;
        if (request.getRequesterUserId() != null) {
            requester = usersRepository.findById(request.getRequesterUserId())
                    .orElse(null);
        }

        ExpenseRequests entity = new ExpenseRequests();
        entity.setBranch(branch);
        entity.setVehicle(vehicle);
        entity.setRequester(requester);
        entity.setType(request.getType());
        entity.setAmount(request.getAmount());
        entity.setNote(request.getNote());
        entity.setStatus(ExpenseRequestStatus.PENDING);

        ExpenseRequests saved = expenseRequestRepository.save(entity);
        return mapToResponse(saved);
    }

    private ExpenseRequestResponse mapToResponse(ExpenseRequests entity) {
        return ExpenseRequestResponse.builder()
                .id(entity.getId())
                .type(entity.getType())
                .amount(entity.getAmount())
                .note(entity.getNote())
                .status(entity.getStatus().name())
                .branchId(entity.getBranch() != null ? entity.getBranch().getId() : null)
                .branchName(entity.getBranch() != null ? entity.getBranch().getBranchName() : null)
                .vehicleId(entity.getVehicle() != null ? entity.getVehicle().getId() : null)
                .vehiclePlate(entity.getVehicle() != null ? entity.getVehicle().getLicensePlate() : null)
                .requesterUserId(
                        Optional.ofNullable(entity.getRequester())
                                .map(Users::getId)
                                .orElse(null)
                )
                .requesterName(
                        Optional.ofNullable(entity.getRequester())
                                .map(Users::getFullName)
                                .orElse(null)
                )
                .createdAt(entity.getCreatedAt())
                .build();
    }

    @Override
    public List<ExpenseRequestResponse> getByDriverId(Integer driverId) {
        log.info("[ExpenseRequest] getByDriverId: {}", driverId);
        // Get expense requests where requester is the driver's user
        // Note: This requires the driver's userId, not driverId
        // For now, return all requests by the requester
        List<ExpenseRequests> list = expenseRequestRepository.findByRequester_Id(driverId);
        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<ExpenseRequestResponse> getPendingRequests() {
        log.info("[ExpenseRequest] getPendingRequests");
        List<ExpenseRequests> list = expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING);
        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ExpenseRequestResponse approveRequest(Integer id, String note) {
        log.info("[ExpenseRequest] approveRequest: {} with note: {}", id, note);
        ExpenseRequests entity = expenseRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu chi phí: " + id));

        entity.setStatus(ExpenseRequestStatus.APPROVED);
        if (note != null && !note.isEmpty()) {
            entity.setNote((entity.getNote() != null ? entity.getNote() + " | " : "") + "Duyệt: " + note);
        }

        ExpenseRequests saved = expenseRequestRepository.save(entity);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ExpenseRequestResponse rejectRequest(Integer id, String note) {
        log.info("[ExpenseRequest] rejectRequest: {} with note: {}", id, note);
        ExpenseRequests entity = expenseRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu chi phí: " + id));

        entity.setStatus(ExpenseRequestStatus.REJECTED);
        if (note != null && !note.isEmpty()) {
            entity.setNote((entity.getNote() != null ? entity.getNote() + " | " : "") + "Từ chối: " + note);
        }

        ExpenseRequests saved = expenseRequestRepository.save(entity);
        return mapToResponse(saved);
    }

    @Override
    public List<ExpenseRequestResponse> getAllRequests(String status, Integer branchId) {
        log.info("[ExpenseRequest] getAllRequests - status: {}, branchId: {}", status, branchId);

        List<ExpenseRequests> list;

        if (status != null && branchId != null) {
            ExpenseRequestStatus statusEnum = ExpenseRequestStatus.valueOf(status.toUpperCase());
            list = expenseRequestRepository.findByStatusAndBranch_Id(statusEnum, branchId);
        } else if (status != null) {
            ExpenseRequestStatus statusEnum = ExpenseRequestStatus.valueOf(status.toUpperCase());
            list = expenseRequestRepository.findByStatus(statusEnum);
        } else if (branchId != null) {
            list = expenseRequestRepository.findByBranch_Id(branchId);
        } else {
            list = expenseRequestRepository.findAll();
        }

        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }
}
