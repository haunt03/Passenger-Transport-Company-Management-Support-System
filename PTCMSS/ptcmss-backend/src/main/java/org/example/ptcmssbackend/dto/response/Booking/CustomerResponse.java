package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomerResponse {
    private Integer id;
    private String fullName;
    private String phone;
    private String email;
    private String address;
    private String note;
    private String status;
}
