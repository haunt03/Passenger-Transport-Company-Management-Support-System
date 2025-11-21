package org.example.ptcmssbackend.dto.request.dispatch;

import lombok.Data;

import java.util.List;

@Data
public class AssignRequest {

    // Booking chứa các trip cần gán
    private Integer bookingId;

    // Nếu rỗng/null -> hiểu là gán cho TẤT CẢ trips thuộc booking
    private List<Integer> tripIds;

    // Manual mode: client truyền driverId, vehicleId
    private Integer driverId;
    private Integer vehicleId;

    // Auto mode: nếu true -> hệ thống tự tìm driver/vehicle phù hợp
    private Boolean autoAssign;

    private String note;
}