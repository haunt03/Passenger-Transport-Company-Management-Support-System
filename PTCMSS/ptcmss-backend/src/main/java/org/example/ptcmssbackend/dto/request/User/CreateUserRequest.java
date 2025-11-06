package org.example.ptcmssbackend.dto.request.User;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUserRequest {

    @NotNull(message = "Yêu cầu nhâp đầy đủ họ và tên")
    private String fullName;

    @NotNull(message = "Yêu cầu nhâp đầy đủ tên đăng nhập")
    private String username;

    @Email(message = "Email không hợp lệ")
    private String email;


    @NotNull(message = "Yêu cầu nhâp số điện thoại")

    private String phone;
    @NotNull
    private String address;
    private Integer roleId;
}