package org.example.ptcmssbackend.dto.request.User;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.dto.validator.PhoneNumber;
import org.example.ptcmssbackend.enums.UserStatus;

@Getter
@Setter
public class UpdateUserRequest {

    @NotNull(message = "Full name is required")
    private String fullName;

    @Email(message = "Email is invalid")
    private String email;

    @PhoneNumber(message = "Phone is invalid")
    private String phone;

    @NotNull(message = "Address is required")
    private String address;

    @NotNull(message = "Role id is required")
    private Integer roleId;

    @NotNull(message = "Status is required")
    private UserStatus status;

    private Integer branchId; // Chi nhánh (optional - chỉ cập nhật nếu có)
}
