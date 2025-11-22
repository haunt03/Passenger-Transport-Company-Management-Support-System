package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CustomerRequest {
    @NotBlank(message = "Tên khách hàng không được để trống")
    @Size(max = 100, message = "Tên khách hàng không được quá 100 ký tự")
    private String fullName;

    @Size(max = 20, message = "Số điện thoại không được quá 20 ký tự")
    private String phone;

    @Size(max = 100, message = "Email không được quá 100 ký tự")
    private String email;

    @Size(max = 255, message = "Địa chỉ không được quá 255 ký tự")
    private String address;

    @Size(max = 255, message = "Ghi chú không được quá 255 ký tự")
    private String note;
}
