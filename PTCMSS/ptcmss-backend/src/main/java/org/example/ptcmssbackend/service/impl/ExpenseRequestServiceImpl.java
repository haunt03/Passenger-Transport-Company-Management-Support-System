package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.expense.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.response.expense.ExpenseRequestResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.ExpenseRequests;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.entity.Vehicles;
import org.example.ptcmssbackend.entity.ApprovalHistory;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Notifications;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.ExpenseRequestRepository;
import org.example.ptcmssbackend.repository.NotificationRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.repository.VehicleRepository;
import org.example.ptcmssbackend.repository.ApprovalHistoryRepository;
import org.example.ptcmssbackend.service.ExpenseRequestService;
import org.example.ptcmssbackend.service.LocalImageService;
import org.example.ptcmssbackend.service.WebSocketNotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseRequestServiceImpl implements ExpenseRequestService {

    private final ExpenseRequestRepository expenseRequestRepository;
    private final BranchesRepository branchesRepository;
    private final VehicleRepository vehicleRepository;
    private final UsersRepository usersRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationService webSocketNotificationService;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final LocalImageService localImageService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    @Override
    @Transactional
    public ExpenseRequestResponse createExpenseRequest(CreateExpenseRequest request) {
        return createExpenseRequest(request, null);
    }

    @Override
    @Transactional
    public ExpenseRequestResponse createExpenseRequest(CreateExpenseRequest request, List<MultipartFile> files) {
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

        // Upload và lưu receipt images
        if (files != null && !files.isEmpty()) {
            List<String> imageUrls = new ArrayList<>();
            for (MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    try {
                        String imageUrl = localImageService.saveImage(file);
                        imageUrls.add(imageUrl);
                    } catch (Exception e) {
                        log.error("[ExpenseRequest] Error uploading file: {}", e.getMessage(), e);
                        // Continue with other files even if one fails
                    }
                }
            }

            // Lưu danh sách URL dưới dạng JSON array
            if (!imageUrls.isEmpty()) {
                try {
                    entity.setReceiptImages(objectMapper.writeValueAsString(imageUrls));
                } catch (JsonProcessingException e) {
                    log.error("[ExpenseRequest] Error serializing receipt images: {}", e.getMessage(), e);
                }
            }
        }

        ExpenseRequests saved = expenseRequestRepository.save(entity);

        // Gửi notification cho Accountants trong branch
        sendNotificationToAccountants(saved);

        return mapToResponse(saved);
    }

    private ExpenseRequestResponse mapToResponse(ExpenseRequests entity) {
        // Parse receipt images from JSON string
        List<String> receiptImages = new ArrayList<>();
        if (entity.getReceiptImages() != null && !entity.getReceiptImages().isEmpty()) {
            try {
                receiptImages = objectMapper.readValue(entity.getReceiptImages(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            } catch (Exception e) {
                log.warn("[ExpenseRequest] Error parsing receipt images for expense request {}: {}",
                        entity.getId(), e.getMessage());
                // Continue with empty list instead of failing
            }
        }

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
                .receiptImages(receiptImages)
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
    public List<ExpenseRequestResponse> getPendingRequests(Integer branchId) {
        log.info("[ExpenseRequest] getPendingRequests - branchId: {}", branchId);
        try {
            List<ExpenseRequests> list;
            if (branchId != null) {
                list = expenseRequestRepository.findByStatusAndBranch_Id(ExpenseRequestStatus.PENDING, branchId);
            } else {
                list = expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING);
            }
            log.info("[ExpenseRequest] Found {} pending requests", list.size());
            List<ExpenseRequestResponse> responses = list.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
            log.info("[ExpenseRequest] getPendingRequests completed successfully");
            return responses;
        } catch (Exception e) {
            log.error("[ExpenseRequest] Error in getPendingRequests for branchId: {}", branchId, e);
            throw new RuntimeException("Lỗi khi lấy danh sách yêu cầu chi phí chờ duyệt: " + e.getMessage(), e);
        }
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

        // Đồng bộ ApprovalHistory (nếu có) để dashboard phê duyệt không còn hiển thị "chờ duyệt"
        try {
            approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                            ApprovalType.EXPENSE_REQUEST,
                            saved.getId(),
                            ApprovalStatus.PENDING
                    )
                    .ifPresent(history -> {
                        history.setStatus(ApprovalStatus.APPROVED);
                        history.setApprovalNote(note);
                        history.setProcessedAt(Instant.now());
                        approvalHistoryRepository.save(history);
                    });
        } catch (Exception syncErr) {
            log.error("[ExpenseRequest] Failed to sync ApprovalHistory when approving expense request {}: {}",
                    saved.getId(), syncErr.getMessage(), syncErr);
        }

        // Cập nhật notification ban đầu gửi cho accountants
        updateAccountantNotifications(saved, "APPROVED", note);

        // Gửi notification cho requester (Driver/Coordinator) khi được duyệt
        sendNotificationToRequester(saved, "APPROVED", "Yêu cầu chi phí của bạn đã được duyệt");

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

        // Đồng bộ ApprovalHistory khi từ chối
        try {
            approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                            ApprovalType.EXPENSE_REQUEST,
                            saved.getId(),
                            ApprovalStatus.PENDING
                    )
                    .ifPresent(history -> {
                        history.setStatus(ApprovalStatus.REJECTED);
                        history.setApprovalNote(note);
                        history.setProcessedAt(Instant.now());
                        approvalHistoryRepository.save(history);
                    });
        } catch (Exception syncErr) {
            log.error("[ExpenseRequest] Failed to sync ApprovalHistory when rejecting expense request {}: {}",
                    saved.getId(), syncErr.getMessage(), syncErr);
        }

        // Cập nhật notification ban đầu gửi cho accountants
        updateAccountantNotifications(saved, "REJECTED", note);

        // Gửi notification cho requester (Driver/Coordinator) khi bị từ chối
        sendNotificationToRequester(saved, "REJECTED", "Yêu cầu chi phí của bạn đã bị từ chối");

        return mapToResponse(saved);
    }

    /**
     * Gửi notification cho Accountants trong branch khi có expense request mới
     */
    private void sendNotificationToAccountants(ExpenseRequests expenseRequest) {
        try {
            Integer branchId = expenseRequest.getBranch() != null ? expenseRequest.getBranch().getId() : null;
            if (branchId == null) {
                log.warn("[ExpenseRequest] Cannot send notification: branchId is null");
                return;
            }

            // Tìm tất cả Accountants trong chi nhánh
            List<Employees> accountants = employeeRepository.findByRoleNameAndBranchId("Accountant", branchId);

            String requesterName = expenseRequest.getRequester() != null
                    ? expenseRequest.getRequester().getFullName()
                    : "Người dùng";
            String expenseType = getExpenseTypeLabel(expenseRequest.getType());
            String amountStr = formatVND(expenseRequest.getAmount());

            for (Employees accountant : accountants) {
                if (accountant.getUser() != null) {
                    Integer accountantUserId = accountant.getUser().getId();

                    // Lưu notification vào DB
                    Notifications notification = new Notifications();
                    notification.setUser(accountant.getUser());
                    notification.setTitle("Yêu cầu thanh toán chi phí mới");
                    // Thêm expense request ID vào message để dễ dàng tìm và cập nhật sau này
                    notification.setMessage(String.format(
                            "[ID:%d] Có yêu cầu thanh toán %s - %s từ %s cần duyệt.",
                            expenseRequest.getId(),
                            expenseType,
                            amountStr,
                            requesterName
                    ));
                    notification.setIsRead(false);
                    notificationRepository.save(notification);

                    // Gửi WebSocket notification
                    webSocketNotificationService.sendUserNotification(
                            accountantUserId,
                            "Yêu cầu thanh toán chi phí mới",
                            String.format("Có yêu cầu thanh toán %s - %s từ %s cần duyệt.", expenseType, amountStr, requesterName),
                            "EXPENSE_REQUEST"
                    );

                    log.debug("[ExpenseRequest] Sent notification to accountant: {}", accountant.getUser().getUsername());
                }
            }

            if (!accountants.isEmpty()) {
                log.info("[ExpenseRequest] Notified {} accountants about new expense request #{}",
                        accountants.size(), expenseRequest.getId());
            }
        } catch (Exception e) {
            // Không throw exception để không ảnh hưởng đến flow chính
            log.error("[ExpenseRequest] Error sending notifications to accountants: {}", e.getMessage(), e);
        }
    }

    /**
     * Cập nhật notification ban đầu gửi cho accountants khi yêu cầu được duyệt/từ chối
     */
    private void updateAccountantNotifications(ExpenseRequests expenseRequest, String status, String note) {
        try {
            Integer branchId = expenseRequest.getBranch() != null ? expenseRequest.getBranch().getId() : null;
            if (branchId == null) {
                log.warn("[ExpenseRequest] Cannot update notifications: branchId is null");
                return;
            }

            // Tìm tất cả Accountants trong chi nhánh
            List<Employees> accountants = employeeRepository.findByRoleNameAndBranchId("Accountant", branchId);

            String requesterName = expenseRequest.getRequester() != null
                    ? expenseRequest.getRequester().getFullName()
                    : "Người dùng";
            String expenseType = getExpenseTypeLabel(expenseRequest.getType());
            String amountStr = formatVND(expenseRequest.getAmount());

            // Tìm và cập nhật notification ban đầu
            for (Employees accountant : accountants) {
                if (accountant.getUser() != null && accountant.getUser().getId() != null) {
                    Integer accountantUserId = accountant.getUser().getId();

                    // Tìm notification có title "Yêu cầu thanh toán chi phí mới" và message chứa expense request ID
                    List<Notifications> notifications = notificationRepository.findByUser_IdOrderByCreatedAtDesc(accountantUserId);
                    String expenseRequestIdMarker = "[ID:" + expenseRequest.getId() + "]";
                    for (Notifications notification : notifications) {
                        // Kiểm tra xem notification có liên quan đến expense request này không (dựa trên ID trong message)
                        if ("Yêu cầu thanh toán chi phí mới".equals(notification.getTitle()) &&
                                notification.getMessage() != null &&
                                notification.getMessage().contains(expenseRequestIdMarker) &&
                                !notification.getIsRead()) { // Chỉ cập nhật notification chưa đọc

                            // Cập nhật title và message
                            if ("APPROVED".equals(status)) {
                                notification.setTitle("Yêu cầu thanh toán đã được duyệt");
                                String newMessage = String.format(
                                        "[ID:%d] Yêu cầu thanh toán %s - %s từ %s đã được duyệt.",
                                        expenseRequest.getId(), expenseType, amountStr, requesterName
                                );
                                if (note != null && !note.isEmpty()) {
                                    newMessage += " Ghi chú: " + note;
                                }
                                notification.setMessage(newMessage);
                            } else if ("REJECTED".equals(status)) {
                                notification.setTitle("Yêu cầu thanh toán đã bị từ chối");
                                String newMessage = String.format(
                                        "[ID:%d] Yêu cầu thanh toán %s - %s từ %s đã bị từ chối.",
                                        expenseRequest.getId(), expenseType, amountStr, requesterName
                                );
                                if (note != null && !note.isEmpty()) {
                                    newMessage += " Lý do: " + note;
                                }
                                notification.setMessage(newMessage);
                            }

                            notificationRepository.save(notification);

                            // Gửi WebSocket notification để cập nhật real-time
                            webSocketNotificationService.sendUserNotification(
                                    accountantUserId,
                                    notification.getTitle(),
                                    notification.getMessage(),
                                    "EXPENSE_REQUEST_" + status
                            );

                            log.debug("[ExpenseRequest] Updated notification for accountant: {}", accountant.getUser().getUsername());
                            break; // Chỉ cập nhật notification đầu tiên tìm thấy
                        }
                    }
                }
            }

            if (!accountants.isEmpty()) {
                log.info("[ExpenseRequest] Updated notifications for {} accountants about expense request #{} - status: {}",
                        accountants.size(), expenseRequest.getId(), status);
            }
        } catch (Exception e) {
            // Không throw exception để không ảnh hưởng đến flow chính
            log.error("[ExpenseRequest] Error updating accountant notifications: {}", e.getMessage(), e);
        }
    }

    /**
     * Gửi notification cho requester (Driver/Coordinator) khi expense request được duyệt/từ chối
     */
    private void sendNotificationToRequester(ExpenseRequests expenseRequest, String status, String defaultMessage) {
        try {
            if (expenseRequest.getRequester() == null) {
                log.warn("[ExpenseRequest] Cannot send notification: requester is null");
                return;
            }

            Integer requesterUserId = expenseRequest.getRequester().getId();
            String expenseType = getExpenseTypeLabel(expenseRequest.getType());
            String amountStr = formatVND(expenseRequest.getAmount());
            String statusText = status.equals("APPROVED") ? "đã được duyệt" : "đã bị từ chối";

            String message = String.format(
                    "Yêu cầu thanh toán %s - %s của bạn %s.",
                    expenseType,
                    amountStr,
                    statusText
            );

            // Lưu notification vào DB
            Notifications notification = new Notifications();
            notification.setUser(expenseRequest.getRequester());
            notification.setTitle(status.equals("APPROVED") ? "Yêu cầu chi phí đã được duyệt" : "Yêu cầu chi phí đã bị từ chối");
            notification.setMessage(message);
            notification.setIsRead(false);
            notificationRepository.save(notification);

            // Gửi WebSocket notification
            webSocketNotificationService.sendUserNotification(
                    requesterUserId,
                    status.equals("APPROVED") ? "Yêu cầu chi phí đã được duyệt" : "Yêu cầu chi phí đã bị từ chối",
                    message,
                    "EXPENSE_REQUEST_" + status
            );

            log.info("[ExpenseRequest] Sent {} notification to requester userId: {}", status, requesterUserId);
        } catch (Exception e) {
            // Không throw exception để không ảnh hưởng đến flow chính
            log.error("[ExpenseRequest] Error sending notification to requester: {}", e.getMessage(), e);
        }
    }

    /**
     * Format số tiền theo định dạng VNĐ
     */
    private String formatVND(BigDecimal amount) {
        if (amount == null) return "0 đ";
        NumberFormat formatter = NumberFormat.getNumberInstance(Locale.of("vi", "VN"));
        return formatter.format(amount) + " đ";
    }

    /**
     * Lấy label cho loại chi phí
     */
    private String getExpenseTypeLabel(String type) {
        switch (type) {
            case "FUEL": return "Nhiên liệu";
            case "TOLL": return "Phí cầu đường";
            case "PARKING": return "Gửi xe / Bến bãi";
            case "MAINTENANCE": return "Bảo dưỡng";
            case "INSURANCE": return "Bảo hiểm";
            case "INSPECTION": return "Đăng kiểm";
            case "REPAIR": return "Sửa chữa nhỏ";
            case "OTHER": return "Khác";
            default: return type;
        }
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
