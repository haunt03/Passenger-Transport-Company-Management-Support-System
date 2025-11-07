package org.example.ptcmssbackend.dto.request.User;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUserRequest {

    @NotNull(message = "Full name is required")
    private String fullName;
    @NotNull(message = "Username is required")
    private String username;
    @Email(message = "Email is invalid")
    private String email;
    @NotNull(message = "Phone is required")
    private String phone;
    @NotNull
    private String address;
    private Integer roleId;
}
