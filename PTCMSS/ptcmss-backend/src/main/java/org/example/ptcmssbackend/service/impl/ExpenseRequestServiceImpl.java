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
import org.example.ptcmssbackend.service.LocalImageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseRequestServiceImpl implements ExpenseRequestService {

    private final ExpenseRequestRepository expenseRequestRepository;
    private final BranchesRepository branchesRepository;
    private final VehicleRepository vehicleRepository;
    private final UsersRepository usersRepository;
    private final LocalImageService localImageService;

    @Override
    @Transactional
    public ExpenseRequestResponse createExpenseRequest(CreateExpenseRequest request, List<MultipartFile> attachments) {
        Branches branch = branchesRepository.findById(request.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found: " + request.getBranchId()));

        Vehicles vehicle = null;
        if (request.getVehicleId() != null) {
            vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Vehicle not found: " + request.getVehicleId()));
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

        List<String> attachmentUrls = new ArrayList<>();
        if (attachments != null) {
            for (MultipartFile file : attachments) {
                if (file != null && !file.isEmpty()) {
                    attachmentUrls.add(localImageService.saveImage(file));
                }
            }
        }
        entity.setAttachments(attachmentUrls);

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
                .attachments(entity.getAttachments())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
