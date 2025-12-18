package org.example.ptcmssbackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.ResolveIncidentRequest;
import org.example.ptcmssbackend.dto.response.Driver.TripIncidentResponse;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.entity.TripIncidents;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.repository.TripIncidentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
@Slf4j
public class IncidentController {

    private final TripIncidentRepository tripIncidentRepository;

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','COORDINATOR')")
    public ResponseData<List<TripIncidentResponse>> listByBranch(
            @PathVariable Integer branchId,
            @RequestParam(value = "resolved", required = false) Boolean resolved
    ) {
        log.info("[Incident] list by branch {}", branchId);
        List<TripIncidents> list = tripIncidentRepository.findAllByBranchId(branchId);
        if (resolved != null) {
            list = list.stream()
                    .filter(i -> resolved.equals(i.getResolved()))
                    .collect(Collectors.toList());
        }
        return new ResponseData<>(HttpStatus.OK.value(), "OK",
                list.stream().map(TripIncidentResponse::new).collect(Collectors.toList()));
    }

    @GetMapping("/driver/{driverId}")
    @PreAuthorize("hasAnyRole('DRIVER','ADMIN','MANAGER','COORDINATOR')")
    public ResponseData<List<TripIncidentResponse>> listByDriver(
            @PathVariable Integer driverId,
            @RequestParam(value = "resolved", required = false) Boolean resolved
    ) {
        log.info("[Incident] list by driver {}", driverId);
        List<TripIncidents> list = tripIncidentRepository.findAllByDriver_Id(driverId);
        if (resolved != null) {
            list = list.stream()
                    .filter(i -> resolved.equals(i.getResolved()))
                    .collect(Collectors.toList());
        }
        // Sort by createdAt descending (newest first)
        list.sort((a, b) -> {
            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });
        return new ResponseData<>(HttpStatus.OK.value(), "OK",
                list.stream().map(TripIncidentResponse::new).collect(Collectors.toList()));
    }

    @PostMapping("/{incidentId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','COORDINATOR')")
    public ResponseData<TripIncidentResponse> resolve(
            @PathVariable Integer incidentId,
            @Valid @RequestBody ResolveIncidentRequest request) {
        log.info("[Incident] resolve {} with action: {}", incidentId, request.getResolutionAction());
        
        TripIncidents incident = tripIncidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự cố"));
        
        // Get current user
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Không xác định được người dùng hiện tại");
        }
        
        // Update incident with resolution details
        incident.setResolved(true);
        incident.setResolutionAction(request.getResolutionAction());
        incident.setResolutionNote(request.getResolutionNote());
        incident.setResolvedBy(currentUser);
        incident.setResolvedAt(Instant.now());
        
        TripIncidents saved = tripIncidentRepository.save(incident);
        log.info("[Incident] resolved by user {} at {}", currentUser.getId(), saved.getResolvedAt());
        
        return new ResponseData<>(HttpStatus.OK.value(), "Đã xử lý sự cố thành công", new TripIncidentResponse(saved));
    }

    private Users getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Users user) {
            return user;
        }
        return null;
    }
}

