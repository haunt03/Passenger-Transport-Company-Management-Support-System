package org.example.ptcmssbackend.dto.request.User;


import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.UserStatus;

@Getter
@Setter
public class UpdateUserRequest {
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private Integer roleId;
    private UserStatus status;
}
