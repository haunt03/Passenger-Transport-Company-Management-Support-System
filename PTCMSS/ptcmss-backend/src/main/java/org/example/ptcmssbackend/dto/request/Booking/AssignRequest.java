package org.example.ptcmssbackend.dto.request.Booking;

import lombok.Data;

import java.util.List;

@Data
public class AssignRequest {
    private Integer driverId; // optional
    private Integer vehicleId; // optional
    private List<Integer> tripIds; // optional, if empty -> apply to all trips of booking
    private String note; // optional
}
