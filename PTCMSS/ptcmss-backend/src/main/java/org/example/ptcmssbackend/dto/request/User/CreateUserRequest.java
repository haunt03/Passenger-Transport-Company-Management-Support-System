package org.example.ptcmssbackend.dto.request.User;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.dto.validator.PhoneNumber;

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

    @PhoneNumber(message = "Phone is invalid")
    private String phone;


    @NotNull(message = "Address is required")
    private String address;

    @NotNull(message = "Role id is required")
    private Integer roleId;
}