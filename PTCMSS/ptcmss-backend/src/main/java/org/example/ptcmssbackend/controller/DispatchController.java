package org.example.ptcmssbackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Trip.TripSearchRequest;
import org.example.ptcmssbackend.dto.request.dispatch.AssignRequest;
import org.example.ptcmssbackend.dto.request.dispatch.UnassignRequest;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.dto.response.common.ResponseError;
import org.example.ptcmssbackend.dto.response.dispatch.AssignRespone;
import org.example.ptcmssbackend.dto.response.dispatch.AssignmentSuggestionResponse;
import org.example.ptcmssbackend.dto.response.dispatch.DispatchDashboardResponse;
import org.example.ptcmssbackend.dto.response.dispatch.PendingTripResponse;
import org.example.ptcmssbackend.service.DispatchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/dispatch")
@RequiredArgsConstructor
@Tag(name = "Dispatch Module", description = "API điều phối chuyến xe (Module 5): Pending, Assign, Driver Accept")
public class DispatchController {

    private final DispatchService dispatchService;

    // =====================================================================
    // 1) LẤY DANH SÁCH CHUYẾN PENDING
    // =====================================================================
    @Operation(
            summary = "Lấy danh sách chuyến *Pending* theo chi nhánh",
            description = "Trả về danh sách các chuyến đã xác nhận & đủ điều kiện điều phối. Chỉ ADMIN hoặc MANAGER có quyền xem. Nếu branchId = 0 hoặc null và user là ADMIN, trả về tất cả chi nhánh."
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR')")
    @GetMapping("/pending/{branchId}")
    public ResponseData<List<PendingTripResponse>> getPendingTrips(@PathVariable Integer branchId) {
        try {
            log.info("[Dispatch] Get pending trips for branch {}", branchId);
            List<PendingTripResponse> data = dispatchService.getPendingTrips(branchId);
            return new ResponseData<>(HttpStatus.OK.value(), "Success", data);
        } catch (Exception e) {
            log.error("[Dispatch] Failed to load pending trips", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Lấy danh sách chuyến *Pending* của tất cả chi nhánh",
            description = "Chỉ ADMIN có quyền xem tất cả chi nhánh"
    )
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/pending")
    public ResponseData<List<PendingTripResponse>> getAllPendingTrips() {
        try {
            log.info("[Dispatch] Get all pending trips (all branches)");
            List<PendingTripResponse> data = dispatchService.getAllPendingTrips();
            return new ResponseData<>(HttpStatus.OK.value(), "Success", data);
        } catch (Exception e) {
            log.error("[Dispatch] Failed to load all pending trips", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Lấy gợi ý tài xế + xe cho chuyến",
            description = "Trả về tóm tắt chuyến cùng danh sách ứng viên hợp lệ để gán"
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR')")
    @GetMapping("/trips/{tripId}/suggestions")
    public ResponseData<AssignmentSuggestionResponse> suggestions(@PathVariable Integer tripId) {
        try {
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Loaded suggestions",
                    dispatchService.getAssignmentSuggestions(tripId));
        } catch (Exception e) {
            log.error("[Dispatch] Failed to load suggestions for trip {}", tripId, e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Tổng quan điều phối trong ngày",
            description = "Trả về Queue pending + timeline tài xế / phương tiện trong ngày theo chi nhánh. Nếu không truyền date, lấy tất cả chuyến từ hiện tại đến tương lai. Admin/Manager/Coordinator được phép truy cập."
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR')")
    @GetMapping("/dashboard")
    public ResponseData<DispatchDashboardResponse> getDashboard(
            @RequestParam Integer branchId,
            @RequestParam(required = false) String date
    ) {
        try {
            LocalDate targetDate = (date != null && !date.isBlank())
                    ? LocalDate.parse(date)
                    : null; // null = load all future trips
            log.info("[Dispatch] Load dashboard for branch {} on {}", branchId, targetDate != null ? targetDate : "all future");
            DispatchDashboardResponse data = dispatchService.getDashboard(branchId, targetDate);
            return new ResponseData<>(HttpStatus.OK.value(), "Success", data);
        } catch (Exception e) {
            log.error("[Dispatch] Failed to load dashboard", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Gán lại tài xế/xe cho chuyến", description = "Unassign trước rồi gán lại theo yêu cầu")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR')")
    @PostMapping("/reassign")
    public ResponseData<AssignRespone> reassign(@RequestBody AssignRequest request) {
        try {
            log.info("[Dispatch] Reassign trip: {}", request);
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Reassign successfully",
                    dispatchService.reassign(request));
        } catch (Exception e) {
            log.error("[Dispatch] Reassign failed", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Bỏ gán tài xế/xe khỏi chuyến", description = "Chỉ được phép khi chuyến chưa chạy")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR')")
    @PostMapping("/trips/{tripId}/unassign")
    public ResponseData<?> unassign(@PathVariable Integer tripId, @RequestBody UnassignRequest request) {
        try {
            String note = request != null ? request.getNote() : null;
            if (note == null || note.isBlank()) {
                throw new IllegalArgumentException("Ghi chú là bắt buộc cho hành động hủy phân công");
            }
            dispatchService.unassign(tripId, note);
            return new ResponseData<>(HttpStatus.OK.value(), "Unassigned successfully", null);
        } catch (Exception e) {
            log.error("[Dispatch] Unassign failed for trip {}", tripId, e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    // =====================================================================
    // 2) GÁN XE + TÀI XẾ
    // =====================================================================
    @Operation(
            summary = "Gán tài xế + xe cho chuyến",
            description = "ADMIN, MANAGER hoặc COORDINATOR có quyền điều phối. Gán 1 hoặc nhiều trip, idempotent (gán lại không lỗi)."
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR')")
    @PostMapping("/assign")
    public ResponseData<AssignRespone> assignTrip(@RequestBody AssignRequest request) {
        try {
            log.info("[Dispatch] Assign trip: {}", request);
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Assign successfully",
                    dispatchService.assign(request));
        } catch (Exception e) {
            log.error("[Dispatch] Assign failed", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Chi tiết chuyến")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR','DRIVER')")
    @GetMapping("/detail/{tripId}")
    public ResponseData<?> detail(@PathVariable Integer tripId) {
        try {
            log.info("[Dispatch] Get trip detail for trip {}", tripId);
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Get trip detail successfully",
                    dispatchService.getTripDetail(tripId));
        } catch (Exception e) {
            log.error("[Dispatch] Failed to get trip detail for trip {}", tripId, e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(summary = "Tìm kiếm chuyến", description = "ADMIN, MANAGER hoặc COORDINATOR có quyền tìm kiếm chuyến")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CONSULTANT','COORDINATOR')")
    @PostMapping("/search")
    public ResponseData<?> search(@RequestBody TripSearchRequest req) {
        try {
            log.info("[Dispatch] Search trips: {}", req);
            return new ResponseData<>(HttpStatus.OK.value(),
                    "Search successfully",
                    dispatchService.searchTrips(req));
        } catch (Exception e) {
            log.error("[Dispatch] Search failed", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }


}
